import { Router, Request, Response } from 'express';
import { getDailyBonusStatus, claimDailyBonus } from '../db/postgres';

const router = Router();

router.get('/daily-bonus/status', async (req: Request, res: Response) => {
  try {
    const playerId = req.query.playerId as string | undefined;
    if (!playerId || !playerId.trim()) {
      return res.status(400).json({ error: 'playerId query parameter is required' });
    }
    const status = await getDailyBonusStatus(playerId.trim());
    res.json(status);
  } catch (err) {
    console.error('Error fetching daily bonus status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/daily-bonus/claim', async (req: Request, res: Response) => {
  try {
    const { playerId } = req.body as { playerId?: string };
    if (!playerId || !playerId.trim()) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    const result = await claimDailyBonus(playerId.trim());
    res.json(result);
  } catch (err) {
    console.error('Error claiming daily bonus:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
