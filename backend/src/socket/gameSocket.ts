import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { HeartsGame } from '../game/HeartsGame';
import { BotDifficulty, GameState, TrickCard } from '../types/game';
import {
  saveGameState,
  getGameState as getRedisGameState,
  saveLobby,
  getLobby,
  deleteLobby,
  getAllLobbyIds,
  saveDisconnectedPlayer,
  refreshGameTTL,
} from '../db/redis';
import { saveGameResult } from '../db/postgres';

// In-memory game instances (source of truth during active games)
const games = new Map<string, HeartsGame>();

// Map socketId -> { gameId, playerId, nickname }
const playerSessions = new Map<string, { gameId: string; playerId: string; nickname: string }>();

export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // --- Lobby events ---

    socket.on('create_lobby', async (data: { nickname: string }, ack?: (res: any) => void) => {
      const gameId = uuidv4();
      const game = new HeartsGame(gameId, socket.id);

      game.addPlayer(socket.id, data.nickname, 'human');
      games.set(gameId, game);

      setupGameCallbacks(game, io);

      socket.join(gameId);
      playerSessions.set(socket.id, { gameId, playerId: socket.id, nickname: data.nickname });

      await saveLobby(gameId, game.getLobbyInfo());

      if (ack) ack({ playerId: socket.id, gameId });
      io.to(gameId).emit('lobby_updated', game.getLobbyInfo());
    });

    socket.on('join_lobby', async (data: { gameId: string; nickname: string }, ack?: (res: any) => void) => {
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

      await saveLobby(data.gameId, game.getLobbyInfo());

      if (ack) ack({ playerId: socket.id });
      io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
    });

    socket.on('rejoin_game', async (data: { gameId: string; nickname: string }, ack?: (res: any) => void) => {
      const game = games.get(data.gameId);
      if (!game) {
        if (ack) ack({ success: false });
        return;
      }

      // Find the player by nickname
      const player = game.players.find(p => p.nickname === data.nickname && p.role === 'human');
      if (!player) {
        if (ack) ack({ success: false });
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
      if (game.currentPlayerId === oldId) game.currentPlayerId = socket.id;
      if (game.trickLeader === oldId) game.trickLeader = socket.id;
      if (game.hostId === oldId) game.hostId = socket.id;

      // Update trick cards
      for (const tc of game.currentTrick) {
        if (tc.playerId === oldId) tc.playerId = socket.id;
      }

      socket.join(data.gameId);
      playerSessions.set(socket.id, { gameId: data.gameId, playerId: socket.id, nickname: data.nickname });

      if (ack) ack({ success: true });
      io.to(data.gameId).emit('player_reconnected', { playerId: socket.id, nickname: data.nickname });
      socket.emit('game_state', game.getFilteredStateForPlayer(socket.id));
    });

    socket.on('leave_lobby', async (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game) return;

      game.removePlayer(socket.id);
      socket.leave(data.gameId);
      playerSessions.delete(socket.id);

      if (game.players.length === 0) {
        games.delete(data.gameId);
        await deleteLobby(data.gameId);
      } else {
        // Transfer host if needed
        if (game.hostId === socket.id) {
          const humanPlayer = game.players.find(p => p.role === 'human');
          if (humanPlayer) game.hostId = humanPlayer.id;
        }
        await saveLobby(data.gameId, game.getLobbyInfo());
        io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
      }
    });

    socket.on('add_bot', async (data: { gameId: string; difficulty: BotDifficulty }) => {
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

      await saveLobby(data.gameId, game.getLobbyInfo());
      io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
    });

    socket.on('remove_bot', async (data: { gameId: string; playerId: string }) => {
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
      await saveLobby(data.gameId, game.getLobbyInfo());
      io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
    });

    socket.on('update_rules', async (data: { gameId: string; rules: any }) => {
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
      await saveLobby(data.gameId, game.getLobbyInfo());
      io.to(data.gameId).emit('lobby_updated', game.getLobbyInfo());
    });

    // --- Game events ---

    socket.on('start_game', async (data: { gameId: string }) => {
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
      await saveLobby(data.gameId, game.getLobbyInfo(), true);

      // Send filtered state to each player
      emitFilteredStates(game, io);
    });

    socket.on('pass_cards', (data: { gameId: string; cardIds: string[] }) => {
      const game = games.get(data.gameId);
      if (!game) {
        socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
        return;
      }

      game.submitPass(socket.id, data.cardIds);
    });

    socket.on('play_card', (data: { gameId: string; cardId: string }) => {
      const game = games.get(data.gameId);
      if (!game) {
        socket.emit('error', { code: 'game_not_found', message: 'Game not found' });
        return;
      }

      game.playCard(socket.id, data.cardId);
    });

    socket.on('chat_message', (data: { gameId: string; message: string }) => {
      const session = playerSessions.get(socket.id);
      if (!session || session.gameId !== data.gameId) return;

      io.to(data.gameId).emit('chat_message', {
        playerId: socket.id,
        nickname: session.nickname,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on('list_lobbies', async (_data: any, ack?: (res: any) => void) => {
      const lobbyIds = await getAllLobbyIds();
      const lobbies = [];
      for (const id of lobbyIds) {
        const lobby = await getLobby(id);
        if (lobby) lobbies.push(lobby);
      }
      if (ack) {
        ack({ lobbies });
      } else {
        socket.emit('lobbies_list', { lobbies });
      }
    });

    // --- Disconnect ---

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      const session = playerSessions.get(socket.id);
      if (!session) return;

      const game = games.get(session.gameId);
      if (!game) return;

      if (game.phase === 'waiting') {
        // In lobby, just remove
        game.removePlayer(socket.id);
        playerSessions.delete(socket.id);

        if (game.players.filter(p => p.role === 'human').length === 0) {
          games.delete(session.gameId);
          await deleteLobby(session.gameId);
        } else {
          if (game.hostId === socket.id) {
            const humanPlayer = game.players.find(p => p.role === 'human');
            if (humanPlayer) game.hostId = humanPlayer.id;
          }
          await saveLobby(session.gameId, game.getLobbyInfo());
          io.to(session.gameId).emit('lobby_updated', game.getLobbyInfo());
        }
      } else {
        // In-game disconnect: mark disconnected, save for reconnection
        game.disconnectPlayer(socket.id);
        await saveDisconnectedPlayer(socket.id, session);
        io.to(session.gameId).emit('player_disconnected', {
          playerId: socket.id,
          nickname: session.nickname,
        });
      }
    });
  });
}

function setupGameCallbacks(game: HeartsGame, io: Server): void {
  game.onGameStateUpdate = (state: GameState) => {
    emitFilteredStates(game, io);
    saveGameState(game.gameId, state).catch(err =>
      console.error('Error saving game state to Redis:', err)
    );
  };

  game.onTrickComplete = (winnerId: string, cards: TrickCard[]) => {
    io.to(game.gameId).emit('trick_complete', { winnerId, cards });
    refreshGameTTL(game.gameId).catch(() => {});
  };

  game.onRoundComplete = (roundScores: Record<string, number>, totalScores: Record<string, number>) => {
    io.to(game.gameId).emit('round_complete', { roundScores, totalScores });
  };

  game.onGameComplete = async (finalScores: Record<string, number>, winnerId: string) => {
    io.to(game.gameId).emit('game_complete', { finalScores, winnerId });

    // Save to Postgres
    try {
      const winner = game.players.find(p => p.id === winnerId);
      const sortedPlayers = [...game.players].sort(
        (a, b) => (finalScores[a.id] || 0) - (finalScores[b.id] || 0)
      );

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

      await saveGameResult(
        game.gameId,
        game.rules,
        winner?.nickname || 'Unknown',
        game.roundScoresHistory,
        playerResults
      );
    } catch (err) {
      console.error('Error saving game result:', err);
    }

    // Cleanup
    games.delete(game.gameId);
    await deleteLobby(game.gameId).catch(() => {});
  };

  game.onError = (playerId: string, code: string, message: string) => {
    // Find the socket for this player
    const sockets = io.sockets.sockets;
    const playerSocket = sockets.get(playerId);
    if (playerSocket) {
      playerSocket.emit('error', { code, message });
    }
  };
}

function emitFilteredStates(game: HeartsGame, io: Server): void {
  for (const player of game.players) {
    if (player.role === 'human') {
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) {
        playerSocket.emit('game_state', game.getFilteredStateForPlayer(player.id));
      }
    }
  }
}
