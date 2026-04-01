"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGameSocket = setupGameSocket;
const uuid_1 = require("uuid");
const HeartsGame_1 = require("../game/HeartsGame");
const redis_1 = require("../db/redis");
const postgres_1 = require("../db/postgres");
// In-memory game instances (source of truth during active games)
const games = new Map();
// Map socketId -> { gameId, playerId, nickname }
const playerSessions = new Map();
function setupGameSocket(io) {
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);
        // --- Lobby events ---
        socket.on('create_lobby', async (data, ack) => {
            const gameId = (0, uuid_1.v4)();
            const game = new HeartsGame_1.HeartsGame(gameId, socket.id);
            game.addPlayer(socket.id, data.nickname, 'human');
            games.set(gameId, game);
            setupGameCallbacks(game, io);
            socket.join(gameId);
            playerSessions.set(socket.id, { gameId, playerId: socket.id, nickname: data.nickname });
            await (0, redis_1.saveLobby)(gameId, game.getLobbyInfo());
            if (ack)
                ack({ playerId: socket.id, gameId });
            io.to(gameId).emit('lobby_updated', game.getLobbyInfo());
        });
        socket.on('join_lobby', async (data, ack) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Lobby not found' });
                return;
            }
            if (game.phase !== 'waiting') {
                socket.emit('error', { code: 'game_not_found', message: 'Game already started' });
                return;
            }
            if (game.players.length >= 4) {
                socket.emit('error', { code: 'lobby_full', message: 'Lobby is full' });
                return;
            }
            game.addPlayer(socket.id, data.nickname, 'human');
            socket.join(data.gameId);
            playerSessions.set(socket.id, { gameId: data.gameId, playerId: socket.id, nickname: data.nickname });
            await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo());
            if (ack)
                ack({ playerId: socket.id });
            io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
        });
        socket.on('rejoin_game', async (data, ack) => {
            const game = games.get(data.gameId);
            if (!game) {
                if (ack)
                    ack({ success: false });
                return;
            }
            // Find the player by nickname
            const player = game.players.find(p => p.nickname === data.nickname && p.role === 'human');
            if (!player) {
                if (ack)
                    ack({ success: false });
                return;
            }
            // Update socket mapping: old socket id -> new socket id
            const oldId = player.id;
            player.id = socket.id;
            player.isConnected = true;
            // Update scores map
            if (game.scores[oldId] !== undefined) {
                game.scores[socket.id] = game.scores[oldId];
                delete game.scores[oldId];
            }
            // Update current player reference if needed
            if (game.currentPlayerId === oldId)
                game.currentPlayerId = socket.id;
            if (game.trickLeader === oldId)
                game.trickLeader = socket.id;
            if (game.hostId === oldId)
                game.hostId = socket.id;
            // Update trick cards
            for (const tc of game.currentTrick) {
                if (tc.playerId === oldId)
                    tc.playerId = socket.id;
            }
            // Update round scores history
            for (const roundScore of game.roundScoresHistory) {
                if (roundScore[oldId] !== undefined) {
                    roundScore[socket.id] = roundScore[oldId];
                    delete roundScore[oldId];
                }
            }
            // Update passed cards
            if (game.passedCards[oldId] !== undefined) {
                game.passedCards[socket.id] = game.passedCards[oldId];
                delete game.passedCards[oldId];
            }
            // Update pending passes
            if (game.pendingPasses.has(oldId)) {
                game.pendingPasses.set(socket.id, game.pendingPasses.get(oldId));
                game.pendingPasses.delete(oldId);
            }
            socket.join(data.gameId);
            playerSessions.set(socket.id, { gameId: data.gameId, playerId: socket.id, nickname: data.nickname });
            if (ack)
                ack({ success: true });
            io.to(data.gameId).emit('player_reconnected', { playerId: socket.id, nickname: data.nickname });
            socket.emit('game_state', game.getFilteredStateForPlayer(socket.id));
        });
        socket.on('leave_lobby', async (data) => {
            const game = games.get(data.gameId);
            if (!game)
                return;
            game.removePlayer(socket.id);
            socket.leave(data.gameId);
            playerSessions.delete(socket.id);
            if (game.players.length === 0) {
                games.delete(data.gameId);
                await (0, redis_1.deleteLobby)(data.gameId);
            }
            else {
                // Transfer host if needed
                if (game.hostId === socket.id) {
                    const humanPlayer = game.players.find(p => p.role === 'human');
                    if (humanPlayer)
                        game.hostId = humanPlayer.id;
                }
                await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo());
                io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
            }
        });
        socket.on('add_bot', async (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            if (socket.id !== game.hostId) {
                socket.emit('error', { code: 'not_your_turn', message: 'Only host can add bots' });
                return;
            }
            const bot = game.addBot(data.difficulty);
            if (!bot) {
                socket.emit('error', { code: 'lobby_full', message: 'Lobby is full' });
                return;
            }
            await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo());
            io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
        });
        socket.on('remove_bot', async (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            if (socket.id !== game.hostId) {
                socket.emit('error', { code: 'not_your_turn', message: 'Only host can remove bots' });
                return;
            }
            game.removeBot(data.playerId);
            await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo());
            io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
        });
        socket.on('update_rules', async (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            if (socket.id !== game.hostId) {
                socket.emit('error', { code: 'not_your_turn', message: 'Only host can update rules' });
                return;
            }
            game.updateRules(data.rules);
            await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo());
            io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
        });
        // --- Game events ---
        socket.on('start_game', async (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            if (socket.id !== game.hostId) {
                socket.emit('error', { code: 'not_your_turn', message: 'Only host can start the game' });
                return;
            }
            if (!game.startGame()) {
                socket.emit('error', { code: 'invalid_card', message: 'Cannot start game (need 4 players)' });
                return;
            }
            // Mark lobby as started
            await (0, redis_1.saveLobby)(data.gameId, game.getLobbyInfo(), true);
            // Send filtered state to each player
            emitFilteredStates(game, io);
        });
        socket.on('pass_cards', (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            game.submitPass(socket.id, data.cardIds);
        });
        socket.on('play_card', (data) => {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
                return;
            }
            game.playCard(socket.id, data.cardId);
        });
        socket.on('chat_message', (data) => {
            const session = playerSessions.get(socket.id);
            if (!session || session.gameId !== data.gameId)
                return;
            io.to(data.gameId).emit('chat_message', {
                playerId: socket.id,
                nickname: session.nickname,
                message: data.message,
                timestamp: Date.now(),
            });
        });
        socket.on('list_lobbies', async (_data, ack) => {
            const lobbyIds = await (0, redis_1.getAllLobbyIds)();
            const lobbies = [];
            for (const id of lobbyIds) {
                const lobby = await (0, redis_1.getLobby)(id);
                if (lobby)
                    lobbies.push(lobby);
            }
            if (ack) {
                ack({ lobbies });
            }
            else {
                socket.emit('lobbies_list', { lobbies });
            }
        });
        // --- Disconnect ---
        socket.on('disconnect', async () => {
            console.log(`Client disconnected: ${socket.id}`);
            const session = playerSessions.get(socket.id);
            if (!session)
                return;
            const game = games.get(session.gameId);
            if (!game)
                return;
            if (game.phase === 'waiting') {
                // In lobby, just remove
                game.removePlayer(socket.id);
                playerSessions.delete(socket.id);
                if (game.players.filter(p => p.role === 'human').length === 0) {
                    games.delete(session.gameId);
                    await (0, redis_1.deleteLobby)(session.gameId);
                }
                else {
                    if (game.hostId === socket.id) {
                        const humanPlayer = game.players.find(p => p.role === 'human');
                        if (humanPlayer)
                            game.hostId = humanPlayer.id;
                    }
                    await (0, redis_1.saveLobby)(session.gameId, game.getLobbyInfo());
                    io.to(session.gameId).emit('lobby_updated', game.getLobbyInfo());
                }
            }
            else {
                // In-game disconnect: mark disconnected, save for reconnection
                game.disconnectPlayer(socket.id);
                await (0, redis_1.saveDisconnectedPlayer)(socket.id, session);
                io.to(session.gameId).emit('player_disconnected', {
                    playerId: socket.id,
                    nickname: session.nickname,
                });
            }
        });
    });
}
function setupGameCallbacks(game, io) {
    game.onGameStateUpdate = (state) => {
        emitFilteredStates(game, io);
        (0, redis_1.saveGameState)(game.gameId, state).catch(err => console.error('Error saving game state to Redis:', err));
    };
    game.onTrickComplete = (winnerId, cards) => {
        io.to(game.gameId).emit('trick_complete', { winnerId, cards });
        (0, redis_1.refreshGameTTL)(game.gameId).catch(() => { });
    };
    game.onRoundComplete = (roundScores, totalScores) => {
        io.to(game.gameId).emit('round_complete', { roundScores, totalScores });
    };
    game.onGameComplete = async (finalScores, winnerId) => {
        io.to(game.gameId).emit('game_complete', { finalScores, winnerId });
        // Save to Postgres
        try {
            const winner = game.players.find(p => p.id === winnerId);
            const sortedPlayers = [...game.players].sort((a, b) => (finalScores[a.id] || 0) - (finalScores[b.id] || 0));
            const playerResults = sortedPlayers.map((p, idx) => {
                const allCards = p.tricksTaken.flat();
                return {
                    nickname: p.nickname,
                    score: finalScores[p.id] || 0,
                    placement: idx + 1,
                    heartsTaken: allCards.filter(c => c.suit === 'hearts').length,
                    queenTaken: allCards.some(c => c.id === 'Q_spades'),
                };
            });
            await (0, postgres_1.saveGameResult)(game.gameId, game.rules, winner?.nickname || 'Unknown', game.roundScoresHistory, playerResults);
        }
        catch (err) {
            console.error('Error saving game result:', err);
        }
        // Cleanup
        games.delete(game.gameId);
        await (0, redis_1.deleteLobby)(game.gameId).catch(() => { });
    };
    game.onError = (playerId, code, message) => {
        // Find the socket for this player
        const sockets = io.sockets.sockets;
        const playerSocket = sockets.get(playerId);
        if (playerSocket) {
            playerSocket.emit('error', { code, message });
        }
    };
}
function emitFilteredStates(game, io) {
    for (const player of game.players) {
        if (player.role === 'human') {
            const playerSocket = io.sockets.sockets.get(player.id);
            if (playerSocket) {
                playerSocket.emit('game_state', game.getFilteredStateForPlayer(player.id));
            }
        }
    }
}
//# sourceMappingURL=gameSocket.js.map