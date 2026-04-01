"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postgres_1 = require("../db/postgres");
const router = (0, express_1.Router)();
router.get('/daily-bonus/status', async (req, res) => {
    try {
        const playerId = req.query.playerId;
        if (!playerId || !playerId.trim()) {
            return res.status(400).json({ error: 'playerId query parameter is required' });
        }
        const status = await (0, postgres_1.getDailyBonusStatus)(playerId.trim());
        res.json(status);
    }
    catch (err) {
        console.error('Error fetching daily bonus status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/daily-bonus/claim', async (req, res) => {
    try {
        const { playerId } = req.body;
        if (!playerId || !playerId.trim()) {
            return res.status(400).json({ error: 'playerId is required' });
        }
        const result = await (0, postgres_1.claimDailyBonus)(playerId.trim());
        res.json(result);
    }
    catch (err) {
        console.error('Error claiming daily bonus:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dailyBonus.js.map