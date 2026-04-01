import { Router, Request, Response } from 'express';
import { getPlayerStats, getLeaderboard, getGameHistory } from '../db/postgres';
import { getAllLobbyIds, getLobby } from '../db/redis';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/stats/:nickname', async (req: Request, res: Response) => {
  try {
    const stats = await getPlayerStats(req.params.nickname);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const players = await getLeaderboard();
    res.json({ players });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/lobbies', async (_req: Request, res: Response) => {
  try {
    const lobbyIds = await getAllLobbyIds();
    const lobbies = [];
    for (const id of lobbyIds) {
      const lobby = await getLobby(id);
      if (lobby) {
        lobbies.push(lobby);
      }
    }
    res.json({ lobbies });
  } catch (err) {
    console.error('Error fetching lobbies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/game/:gameId/history', async (req: Request, res: Response) => {
  try {
    const history = await getGameHistory(req.params.gameId);
    if (!history) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(history);
  } catch (err) {
    console.error('Error fetching game history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
