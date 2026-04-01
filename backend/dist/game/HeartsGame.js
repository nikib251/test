"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartsGame = void 0;
const uuid_1 = require("uuid");
const game_1 = require("../types/game");
const CardDeck_1 = require("./CardDeck");
const RulesEngine_1 = require("./RulesEngine");
const HeartsBot_1 = require("../bot/HeartsBot");
const BOT_DELAY_MS = 800;
class HeartsGame {
    constructor(gameId, hostId) {
        this.gameId = gameId;
        this.hostId = hostId;
        this.phase = 'waiting';
        this.players = [];
        this.bots = new Map();
        this.currentTrick = [];
        this.trickLeader = '';
        this.currentPlayerId = '';
        this.round = 0;
        this.trickNumber = 0;
        this.heartsBroken = false;
        this.rules = { ...game_1.DEFAULT_RULES };
        this.scores = {};
        this.roundScoresHistory = [];
        this.passDirection = 'left';
        this.passedCards = {};
        this.pendingPasses = new Map();
    }
    // --- Lobby management ---
    addPlayer(id, nickname, role = 'human', difficulty = null) {
        if (this.players.length >= 4)
            return false;
        if (this.players.some(p => p.id === id))
            return false;
        this.players.push({
            id,
            nickname,
            role,
            difficulty,
            hand: [],
            handCount: 0,
            score: 0,
            roundScore: 0,
            tricksTaken: [],
            isConnected: true,
        });
        this.scores[id] = 0;
        return true;
    }
    removePlayer(playerId) {
        const idx = this.players.findIndex(p => p.id === playerId);
        if (idx === -1)
            return false;
        this.players.splice(idx, 1);
        delete this.scores[playerId];
        this.bots.delete(playerId);
        return true;
    }
    addBot(difficulty) {
        if (this.players.length >= 4)
            return null;
        const botId = (0, uuid_1.v4)();
        const botNum = this.players.filter(p => p.role === 'bot').length + 1;
        const nickname = `Bot ${botNum}`;
        const bot = new HeartsBot_1.HeartsBot(nickname, difficulty);
        this.bots.set(botId, bot);
        this.addPlayer(botId, nickname, 'bot', difficulty);
        return this.players.find(p => p.id === botId);
    }
    removeBot(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.role !== 'bot')
            return false;
        this.bots.delete(playerId);
        return this.removePlayer(playerId);
    }
    updateRules(rules) {
        Object.assign(this.rules, rules);
    }
    getLobbyInfo() {
        return {
            gameId: this.gameId,
            hostId: this.hostId,
            players: this.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                role: p.role,
                difficulty: p.difficulty,
            })),
            rules: this.rules,
        };
    }
    // --- Game flow ---
    startGame() {
        if (this.players.length !== 4)
            return false;
        if (this.phase !== 'waiting')
            return false;
        this.round = 0;
        this.startNewRound();
        return true;
    }
    startNewRound() {
        this.round++;
        this.trickNumber = 0;
        this.heartsBroken = false;
        this.currentTrick = [];
        this.passedCards = {};
        this.pendingPasses = new Map();
        // Deal cards
        const deck = (0, CardDeck_1.shuffleDeck)((0, CardDeck_1.createDeck)());
        const hands = (0, CardDeck_1.dealCards)(deck, 4);
        for (let i = 0; i < 4; i++) {
            this.players[i].hand = hands[i];
            this.players[i].handCount = hands[i].length;
            this.players[i].roundScore = 0;
            this.players[i].tricksTaken = [];
        }
        // Determine pass direction
        this.passDirection = RulesEngine_1.RulesEngine.resolvePassDirection(this.rules, this.round);
        if (this.passDirection === 'none') {
            this.phase = 'playing';
            this.startFirstTrick();
        }
        else {
            this.phase = 'passing';
            // Trigger bot passes
            this.processBotPasses();
        }
    }
    async processBotPasses() {
        for (const player of this.players) {
            if (player.role === 'bot') {
                const bot = this.bots.get(player.id);
                if (bot) {
                    try {
                        const cards = await bot.choosePass(player.hand, this.rules);
                        await this.delay(BOT_DELAY_MS);
                        this.submitPass(player.id, cards.map(c => c.id));
                    }
                    catch (err) {
                        console.error(`Bot ${player.nickname} pass error:`, err);
                    }
                }
            }
        }
    }
    submitPass(playerId, cardIds) {
        if (this.phase !== 'passing')
            return false;
        if (this.passDirection === 'none')
            return false;
        if (cardIds.length !== 3) {
            this.onError?.(playerId, 'invalid_pass', 'Must pass exactly 3 cards');
            return false;
        }
        const player = this.players.find(p => p.id === playerId);
        if (!player)
            return false;
        if (this.pendingPasses.has(playerId))
            return false;
        // Validate cards exist in hand
        const cards = [];
        for (const id of cardIds) {
            const card = player.hand.find(c => c.id === id);
            if (!card) {
                this.onError?.(playerId, 'invalid_pass', `Card ${id} not in hand`);
                return false;
            }
            cards.push(card);
        }
        this.pendingPasses.set(playerId, cards);
        // Check if all players have submitted passes
        if (this.pendingPasses.size === 4) {
            this.executePasses();
        }
        return true;
    }
    executePasses() {
        const dir = this.passDirection;
        for (let i = 0; i < 4; i++) {
            const fromPlayer = this.players[i];
            const targetIdx = RulesEngine_1.RulesEngine.getPassTarget(i, dir, 4);
            const toPlayer = this.players[targetIdx];
            const cards = this.pendingPasses.get(fromPlayer.id) || [];
            // Remove cards from sender
            fromPlayer.hand = fromPlayer.hand.filter(c => !cards.some(pc => pc.id === c.id));
            // Track passed cards
            this.passedCards[fromPlayer.id] = cards;
            // Add cards to receiver
            toPlayer.hand.push(...cards);
            toPlayer.handCount = toPlayer.hand.length;
        }
        // Update hand counts
        for (const player of this.players) {
            player.handCount = player.hand.length;
        }
        this.phase = 'playing';
        this.startFirstTrick();
    }
    startFirstTrick() {
        const holderId = RulesEngine_1.RulesEngine.findTwoOfClubsHolder(this.players);
        if (holderId) {
            this.trickLeader = holderId;
            this.currentPlayerId = holderId;
        }
        else {
            // Shouldn't happen with a full deck, but fallback
            this.trickLeader = this.players[0].id;
            this.currentPlayerId = this.players[0].id;
        }
        this.trickNumber = 1;
        this.currentTrick = [];
        this.emitState();
        // If current player is a bot, trigger bot play
        this.checkBotTurn();
    }
    playCard(playerId, cardId) {
        if (this.phase !== 'playing')
            return false;
        if (this.currentPlayerId !== playerId) {
            this.onError?.(playerId, 'not_your_turn', 'Not your turn');
            return false;
        }
        const player = this.players.find(p => p.id === playerId);
        if (!player)
            return false;
        const card = player.hand.find(c => c.id === cardId);
        if (!card) {
            this.onError?.(playerId, 'invalid_card', `Card ${cardId} not in hand`);
            return false;
        }
        const isFirstTrick = this.trickNumber === 1;
        if (!RulesEngine_1.RulesEngine.isValidPlay(card, player.hand, this.currentTrick, this.trickNumber, this.heartsBroken, this.rules, isFirstTrick)) {
            this.onError?.(playerId, 'invalid_card', 'Invalid card for current trick');
            return false;
        }
        // Play the card
        player.hand = player.hand.filter(c => c.id !== card.id);
        player.handCount = player.hand.length;
        this.currentTrick.push({ playerId, card });
        // Check if hearts broken
        if (!this.heartsBroken && RulesEngine_1.RulesEngine.doesBreakHearts(card, this.rules)) {
            this.heartsBroken = true;
        }
        // Check if trick is complete
        if (this.currentTrick.length === 4) {
            this.completeTrick();
        }
        else {
            this.advanceToNextPlayer();
            this.emitState();
            this.checkBotTurn();
        }
        return true;
    }
    advanceToNextPlayer() {
        const currentIdx = this.players.findIndex(p => p.id === this.currentPlayerId);
        const nextIdx = (currentIdx + 1) % 4;
        this.currentPlayerId = this.players[nextIdx].id;
    }
    async completeTrick() {
        const winner = RulesEngine_1.RulesEngine.determineTrickWinner(this.currentTrick);
        const winnerPlayer = this.players.find(p => p.id === winner.playerId);
        // Collect trick cards
        const trickCards = this.currentTrick.map(tc => tc.card);
        winnerPlayer.tricksTaken.push(trickCards);
        // Emit trick complete
        this.onTrickComplete?.(winner.playerId, [...this.currentTrick]);
        // Check if round is over (all 13 tricks played)
        if (this.trickNumber >= 13) {
            await this.delay(500);
            this.completeRound();
            return;
        }
        // Start next trick
        this.trickNumber++;
        this.currentTrick = [];
        this.trickLeader = winner.playerId;
        this.currentPlayerId = winner.playerId;
        this.emitState();
        await this.delay(300);
        this.checkBotTurn();
    }
    async completeRound() {
        this.phase = 'round_end';
        // Calculate scores
        const roundScores = RulesEngine_1.RulesEngine.calculateRoundScores(this.players, this.rules);
        // Update player scores
        for (const player of this.players) {
            player.roundScore = roundScores[player.id] || 0;
            this.scores[player.id] = (this.scores[player.id] || 0) + player.roundScore;
            player.score = this.scores[player.id];
        }
        this.roundScoresHistory.push(roundScores);
        // Notify bots about round completion
        for (const player of this.players) {
            if (player.role === 'bot') {
                const bot = this.bots.get(player.id);
                if (bot) {
                    try {
                        await bot.onRoundComplete(roundScores, player.id);
                    }
                    catch (err) {
                        console.error(`Bot ${player.nickname} onRoundComplete error:`, err);
                    }
                }
            }
        }
        this.onRoundComplete?.(roundScores, { ...this.scores });
        // Check if game is over
        const gameOver = Object.values(this.scores).some(s => s >= this.rules.endScore);
        if (gameOver) {
            this.completeGame();
        }
        else {
            // Start next round after a brief delay
            await this.delay(1000);
            this.startNewRound();
            this.emitState();
        }
    }
    completeGame() {
        this.phase = 'game_end';
        // Winner is the player with lowest score
        let winnerId = this.players[0].id;
        let lowestScore = this.scores[this.players[0].id];
        for (const player of this.players) {
            if (this.scores[player.id] < lowestScore) {
                lowestScore = this.scores[player.id];
                winnerId = player.id;
            }
        }
        this.onGameComplete?.({ ...this.scores }, winnerId);
        this.emitState();
    }
    async checkBotTurn() {
        const currentPlayer = this.players.find(p => p.id === this.currentPlayerId);
        if (!currentPlayer || currentPlayer.role !== 'bot')
            return;
        const bot = this.bots.get(currentPlayer.id);
        if (!bot)
            return;
        try {
            await this.delay(BOT_DELAY_MS);
            const gameState = this.getGameState();
            const card = await bot.chooseCard(gameState, currentPlayer.id);
            this.playCard(currentPlayer.id, card.id);
        }
        catch (err) {
            console.error(`Bot ${currentPlayer.nickname} play error:`, err);
            // Fallback: play first valid card
            const validCards = RulesEngine_1.RulesEngine.getValidCards(currentPlayer.hand, this.currentTrick, this.trickNumber, this.heartsBroken, this.rules, this.trickNumber === 1);
            if (validCards.length > 0) {
                this.playCard(currentPlayer.id, validCards[0].id);
            }
        }
    }
    // --- State management ---
    getGameState() {
        return {
            gameId: this.gameId,
            phase: this.phase,
            players: this.players.map(p => ({ ...p, hand: [...p.hand], tricksTaken: p.tricksTaken.map(t => [...t]) })),
            currentTrick: [...this.currentTrick],
            trickLeader: this.trickLeader,
            currentPlayerId: this.currentPlayerId,
            round: this.round,
            trickNumber: this.trickNumber,
            heartsBroken: this.heartsBroken,
            rules: { ...this.rules },
            scores: { ...this.scores },
            roundScores: [...this.roundScoresHistory],
            passDirection: this.passDirection,
            passedCards: { ...this.passedCards },
        };
    }
    /**
     * Get filtered game state for a specific player (hides other players' hands)
     */
    getFilteredStateForPlayer(playerId) {
        const state = this.getGameState();
        state.players = state.players.map(p => {
            if (p.id === playerId)
                return p;
            return { ...p, hand: [] };
        });
        return state;
    }
    emitState() {
        this.onGameStateUpdate?.(this.getGameState());
    }
    // --- Reconnection ---
    reconnectPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player)
            return false;
        player.isConnected = true;
        return true;
    }
    disconnectPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.isConnected = false;
        }
    }
    // --- Serialization ---
    toJSON() {
        return this.getGameState();
    }
    static fromState(state, bots) {
        const game = new HeartsGame(state.gameId, '');
        game.phase = state.phase;
        game.players = state.players;
        game.currentTrick = state.currentTrick;
        game.trickLeader = state.trickLeader;
        game.currentPlayerId = state.currentPlayerId;
        game.round = state.round;
        game.trickNumber = state.trickNumber;
        game.heartsBroken = state.heartsBroken;
        game.rules = state.rules;
        game.scores = state.scores;
        game.roundScoresHistory = state.roundScores;
        game.passDirection = state.passDirection;
        game.passedCards = state.passedCards;
        game.bots = bots;
        return game;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.HeartsGame = HeartsGame;
//# sourceMappingURL=HeartsGame.js.map