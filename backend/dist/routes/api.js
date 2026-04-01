"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postgres_1 = require("../db/postgres");
const redis_1 = require("../db/redis");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
router.get('/stats/:nickname', async (req, res) => {
    try {
        const stats = await (0, postgres_1.getPlayerStats)(req.params.nickname);
        if (!stats) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(stats);
    }
    catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/leaderboard', async (_req, res) => {
    try {
        const players = await (0, postgres_1.getLeaderboard)();
        res.json({ players });
    }
    catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/lobbies', async (_req, res) => {
    try {
        const lobbyIds = await (0, redis_1.getAllLobbyIds)();
        const lobbies = [];
        for (const id of lobbyIds) {
            const lobby = await (0, redis_1.getLobby)(id);
            if (lobby) {
                lobbies.push(lobby);
            }
        }
        res.json({ lobbies });
    }
    catch (err) {
        console.error('Error fetching lobbies:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/game/:gameId/history', async (req, res) => {
    try {
        const history = await (0, postgres_1.getGameHistory)(req.params.gameId);
        if (!history) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json(history);
    }
    catch (err) {
        console.error('Error fetching game history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=api.js.map