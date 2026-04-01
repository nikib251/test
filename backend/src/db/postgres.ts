import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hearts_user:hearts_pass@postgres:5432/hearts_db',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function saveGameResult(
  gameId: string,
  ruleVariants: object,
  winnerNickname: string,
  roundScores: Record<string, number>[],
  playerResults: {
    nickname: string;
    score: number;
    placement: number;
    heartsTaken: number;
    queenTaken: boolean;
  }[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Save game session
    await client.query(
      `INSERT INTO game_sessions (id, status, finished_at, rule_variants, winning_nickname, round_scores)
       VALUES ($1, 'finished', NOW(), $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         status = 'finished',
         finished_at = NOW(),
         rule_variants = $2,
         winning_nickname = $3,
         round_scores = $4`,
      [gameId, JSON.stringify(ruleVariants), winnerNickname, JSON.stringify(roundScores)]
    );

    // Save each player result
    for (const result of playerResults) {
      // Upsert player record
      await client.query(
        `INSERT INTO players (id, nickname, total_games, wins, losses, total_score)
         VALUES (gen_random_uuid(), $1, 1, $2, $3, $4)
         ON CONFLICT (nickname) DO UPDATE SET
           total_games = players.total_games + 1,
           wins = players.wins + $2,
           losses = players.losses + $3,
           total_score = players.total_score + $4`,
        [result.nickname, result.placement === 1 ? 1 : 0, result.placement === 1 ? 0 : 1, result.score]
      );

      // Save game result
      await client.query(
        `INSERT INTO game_results (id, game_id, nickname, score, placement, hearts_taken, queen_taken)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [gameId, result.nickname, result.score, result.placement, result.heartsTaken, result.queenTaken]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving game result:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getPlayerStats(nickname: string) {
  const result = await query(
    `SELECT nickname, total_games, wins, losses, total_score,
            CASE WHEN total_games > 0 THEN total_score::float / total_games ELSE 0 END as avg_score
     FROM players WHERE nickname = $1`,
    [nickname]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    nickname: row.nickname,
    totalGames: row.total_games,
    wins: row.wins,
    losses: row.losses,
    avgScore: parseFloat(row.avg_score),
  };
}

export async function getLeaderboard() {
  const result = await query(
    `SELECT nickname, wins, total_games,
            CASE WHEN total_games > 0 THEN wins::float / total_games ELSE 0 END as win_rate
     FROM players
     ORDER BY wins DESC, win_rate DESC
     LIMIT 50`
  );
  return result.rows.map((row: any) => ({
    nickname: row.nickname,
    wins: row.wins,
    totalGames: row.total_games,
    winRate: parseFloat(row.win_rate),
  }));
}

export async function getGameHistory(gameId: string) {
  const result = await query(
    `SELECT round_scores, winning_nickname FROM game_sessions WHERE id = $1`,
    [gameId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const roundScores = row.round_scores || [];
  return {
    rounds: roundScores.map((scores: Record<string, number>) => ({
      scores,
      winner: row.winning_nickname,
    })),
  };
}

export { pool };
