"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.saveGameResult = saveGameResult;
exports.getPlayerStats = getPlayerStats;
exports.getLeaderboard = getLeaderboard;
exports.getGameHistory = getGameHistory;
exports.getDailyBonusStatus = getDailyBonusStatus;
exports.claimDailyBonus = claimDailyBonus;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://hearts_user:hearts_pass@postgres:5432/hearts_db',
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});
async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
}
async function saveGameResult(gameId, ruleVariants, winnerNickname, roundScores, playerResults) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Save game session
        await client.query(`INSERT INTO game_sessions (id, status, finished_at, rule_variants, winning_nickname, round_scores)
       VALUES ($1, 'finished', NOW(), $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         status = 'finished',
         finished_at = NOW(),
         rule_variants = $2,
         winning_nickname = $3,
         round_scores = $4`, [gameId, JSON.stringify(ruleVariants), winnerNickname, JSON.stringify(roundScores)]);
        // Save each player result
        for (const result of playerResults) {
            // Upsert player record
            await client.query(`INSERT INTO players (id, nickname, total_games, wins, losses, total_score)
         VALUES (gen_random_uuid(), $1, 1, $2, $3, $4)
         ON CONFLICT (nickname) DO UPDATE SET
           total_games = players.total_games + 1,
           wins = players.wins + $2,
           losses = players.losses + $3,
           total_score = players.total_score + $4`, [result.nickname, result.placement === 1 ? 1 : 0, result.placement === 1 ? 0 : 1, result.score]);
            // Save game result
            await client.query(`INSERT INTO game_results (id, game_id, nickname, score, placement, hearts_taken, queen_taken)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`, [gameId, result.nickname, result.score, result.placement, result.heartsTaken, result.queenTaken]);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving game result:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
async function getPlayerStats(nickname) {
    const result = await query(`SELECT nickname, total_games, wins, losses, total_score,
            CASE WHEN total_games > 0 THEN total_score::float / total_games ELSE 0 END as avg_score
     FROM players WHERE nickname = $1`, [nickname]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
        nickname: row.nickname,
        totalGames: row.total_games,
        wins: row.wins,
        losses: row.losses,
        avgScore: parseFloat(row.avg_score),
    };
}
async function getLeaderboard() {
    const result = await query(`SELECT nickname, wins, total_games,
            CASE WHEN total_games > 0 THEN wins::float / total_games ELSE 0 END as win_rate
     FROM players
     ORDER BY wins DESC, win_rate DESC
     LIMIT 50`);
    return result.rows.map((row) => ({
        nickname: row.nickname,
        wins: row.wins,
        totalGames: row.total_games,
        winRate: parseFloat(row.win_rate),
    }));
}
async function getGameHistory(gameId) {
    const result = await query(`SELECT round_scores, winning_nickname FROM game_sessions WHERE id = $1`, [gameId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    const roundScores = row.round_scores || [];
    return {
        rounds: roundScores.map((scores) => ({
            scores,
            winner: row.winning_nickname,
        })),
    };
}
// ── Daily Bonus ──────────────────────────────────────────────────────────────
const DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 50];
function getUTCDayStart(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
async function getDailyBonusStatus(nickname) {
    const result = await query(`SELECT coins, daily_streak, last_bonus_at, total_bonus_claimed
     FROM players WHERE nickname = $1`, [nickname]);
    if (result.rows.length === 0) {
        return { canClaim: true, streak: 0, coins: 0, nextReward: DAILY_REWARDS[0], hoursUntilNext: 0 };
    }
    const row = result.rows[0];
    const now = new Date();
    const todayStart = getUTCDayStart(now);
    if (!row.last_bonus_at) {
        return { canClaim: true, streak: 0, coins: row.coins, nextReward: DAILY_REWARDS[0], hoursUntilNext: 0 };
    }
    const lastClaimDay = getUTCDayStart(new Date(row.last_bonus_at));
    const daysDiff = Math.floor((todayStart - lastClaimDay) / (24 * 60 * 60 * 1000));
    if (daysDiff === 0) {
        // Already claimed today
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
        const hoursUntilNext = Math.max(0, (tomorrowStart - now.getTime()) / (1000 * 60 * 60));
        const nextStreak = row.daily_streak < 7 ? row.daily_streak : 0;
        return {
            canClaim: false,
            streak: row.daily_streak,
            coins: row.coins,
            nextReward: DAILY_REWARDS[nextStreak % 7],
            hoursUntilNext: Math.ceil(hoursUntilNext * 10) / 10,
        };
    }
    // Check if streak is broken (more than 48h / 2 days gap)
    const streak = daysDiff <= 2 ? row.daily_streak : 0;
    return {
        canClaim: true,
        streak,
        coins: row.coins,
        nextReward: DAILY_REWARDS[streak % 7],
        hoursUntilNext: 0,
    };
}
async function claimDailyBonus(nickname) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Ensure player exists
        await client.query(`INSERT INTO players (id, nickname)
       VALUES (gen_random_uuid(), $1)
       ON CONFLICT (nickname) DO NOTHING`, [nickname]);
        const result = await client.query(`SELECT coins, daily_streak, last_bonus_at, total_bonus_claimed
       FROM players WHERE nickname = $1 FOR UPDATE`, [nickname]);
        const row = result.rows[0];
        const now = new Date();
        const todayStart = getUTCDayStart(now);
        if (row.last_bonus_at) {
            const lastClaimDay = getUTCDayStart(new Date(row.last_bonus_at));
            const daysDiff = Math.floor((todayStart - lastClaimDay) / (24 * 60 * 60 * 1000));
            if (daysDiff === 0) {
                await client.query('ROLLBACK');
                const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
                return {
                    success: false,
                    coins: row.coins,
                    streak: row.daily_streak,
                    nextBonus: new Date(tomorrowStart).toISOString(),
                    alreadyClaimed: true,
                };
            }
            // Reset streak if gap > 2 days (48h grace)
            if (daysDiff > 2) {
                row.daily_streak = 0;
            }
        }
        else {
            row.daily_streak = 0;
        }
        const newStreak = row.daily_streak + 1;
        const rewardIndex = Math.min(newStreak - 1, 6);
        const reward = DAILY_REWARDS[rewardIndex];
        const newCoins = row.coins + reward;
        await client.query(`UPDATE players
       SET coins = $1, daily_streak = $2, last_bonus_at = $3, total_bonus_claimed = total_bonus_claimed + 1
       WHERE nickname = $4`, [newCoins, newStreak, now.toISOString(), nickname]);
        await client.query('COMMIT');
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
        return {
            success: true,
            coins: newCoins,
            streak: newStreak,
            nextBonus: new Date(tomorrowStart).toISOString(),
            alreadyClaimed: false,
        };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=postgres.js.map