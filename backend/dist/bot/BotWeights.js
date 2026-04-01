"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeights = getWeights;
exports.updateWeight = updateWeight;
exports.shutdown = shutdown;
const pg_1 = require("pg");
// Simple LRU cache
class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.map = new Map();
    }
    get(key) {
        const val = this.map.get(key);
        if (val !== undefined) {
            // Move to end (most recently used)
            this.map.delete(key);
            this.map.set(key, val);
        }
        return val;
    }
    set(key, val) {
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        else if (this.map.size >= this.maxSize) {
            // Delete oldest (first entry)
            const firstKey = this.map.keys().next().value;
            this.map.delete(firstKey);
        }
        this.map.set(key, val);
    }
    clear() {
        this.map.clear();
    }
}
const DEFAULT_WEIGHT = 0.5;
const LEARNING_RATE = 0.05;
const DECAY = 1 - LEARNING_RATE; // 0.95
const CACHE_SIZE = 10000;
// Cache key: "situationHash:cardCode:difficulty"
function cacheKey(situationHash, cardCode, difficulty) {
    return `${situationHash}:${cardCode}:${difficulty}`;
}
let pool = null;
function getPool() {
    if (!pool) {
        pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://hearts_user:hearts_pass@postgres:5432/hearts_db',
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return pool;
}
const cache = new LRUCache(CACHE_SIZE);
// Batch of pending weight updates, flushed periodically
const pendingUpdates = new Map();
let flushTimer = null;
function scheduleFlush() {
    if (flushTimer)
        return;
    flushTimer = setTimeout(async () => {
        flushTimer = null;
        await flushPendingUpdates();
    }, 2000);
}
async function flushPendingUpdates() {
    if (pendingUpdates.size === 0)
        return;
    const batch = Array.from(pendingUpdates.values());
    pendingUpdates.clear();
    const db = getPool();
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        for (const { situationHash, cardCode, difficulty, weight, playCount } of batch) {
            await client.query(`INSERT INTO bot_card_weights (situation_hash, card_code, difficulty, weight, play_count, version, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, NOW())
         ON CONFLICT (situation_hash, card_code, difficulty)
         DO UPDATE SET weight = $4, play_count = $5, updated_at = NOW()`, [situationHash, cardCode, difficulty, weight, playCount]);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('[BotWeights] flush error:', err);
    }
    finally {
        client.release();
    }
}
async function getWeights(situationHash, cardCodes, difficulty) {
    const result = new Map();
    const uncached = [];
    // Check cache first
    for (const code of cardCodes) {
        const cached = cache.get(cacheKey(situationHash, code, difficulty));
        if (cached !== undefined) {
            result.set(code, cached);
        }
        else {
            uncached.push(code);
        }
    }
    // Fetch uncached from DB
    if (uncached.length > 0) {
        try {
            const db = getPool();
            const { rows } = await db.query(`SELECT card_code, weight FROM bot_card_weights
         WHERE situation_hash = $1 AND difficulty = $2 AND card_code = ANY($3)`, [situationHash, difficulty, uncached]);
            const fetched = new Set();
            for (const row of rows) {
                result.set(row.card_code, row.weight);
                cache.set(cacheKey(situationHash, row.card_code, difficulty), row.weight);
                fetched.add(row.card_code);
            }
            // Default weight for cards not in DB
            for (const code of uncached) {
                if (!fetched.has(code)) {
                    result.set(code, DEFAULT_WEIGHT);
                    cache.set(cacheKey(situationHash, code, difficulty), DEFAULT_WEIGHT);
                }
            }
        }
        catch (err) {
            console.error('[BotWeights] getWeights DB error:', err);
            // Fallback to defaults
            for (const code of uncached) {
                result.set(code, DEFAULT_WEIGHT);
            }
        }
    }
    return result;
}
async function updateWeight(situationHash, cardCode, difficulty, outcomeDelta) {
    // Normalize outcome to [-1, 1] signal. Negative delta = good (low score = good in Hearts).
    // Clamp raw delta to reasonable range, then map: -26..+26 -> +1..-1
    const clamped = Math.max(-26, Math.min(26, outcomeDelta));
    const outcomeSignal = -clamped / 26; // good outcome (negative delta) -> positive signal
    const key = cacheKey(situationHash, cardCode, difficulty);
    const oldWeight = cache.get(key) ?? DEFAULT_WEIGHT;
    const newWeight = oldWeight * DECAY + outcomeSignal * LEARNING_RATE;
    cache.set(key, newWeight);
    // Queue for batch DB write
    const pending = pendingUpdates.get(key);
    const playCount = pending ? pending.playCount + 1 : 1;
    pendingUpdates.set(key, { situationHash, cardCode, difficulty, weight: newWeight, playCount });
    scheduleFlush();
}
async function shutdown() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    await flushPendingUpdates();
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=BotWeights.js.map