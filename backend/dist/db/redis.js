"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.saveGameState = saveGameState;
exports.getGameState = getGameState;
exports.deleteGameState = deleteGameState;
exports.saveLobby = saveLobby;
exports.getLobby = getLobby;
exports.deleteLobby = deleteLobby;
exports.getAllLobbyIds = getAllLobbyIds;
exports.saveDisconnectedPlayer = saveDisconnectedPlayer;
exports.getDisconnectedPlayer = getDisconnectedPlayer;
exports.deleteDisconnectedPlayer = deleteDisconnectedPlayer;
exports.refreshGameTTL = refreshGameTTL;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://redis:6379', {
    retryStrategy: (times) => {
        if (times > 10)
            return null;
        return Math.min(times * 100, 3000);
    },
    maxRetriesPerRequest: 3,
});
exports.redis = redis;
redis.on('error', (err) => {
    console.error('Redis error:', err.message);
});
redis.on('connect', () => {
    console.log('Connected to Redis');
});
const TTL = {
    GAME: 7200, // 2 hours
    LOBBY: 1800, // 30 minutes
    DISCONNECT: 60, // 60 seconds grace
    LOBBY_AFTER_START: 300, // 5 min after game starts
};
// Game state operations
async function saveGameState(gameId, state) {
    await redis.set(`game:${gameId}`, JSON.stringify(state), 'EX', TTL.GAME);
}
async function getGameState(gameId) {
    const data = await redis.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
}
async function deleteGameState(gameId) {
    await redis.del(`game:${gameId}`);
}
// Lobby operations
async function saveLobby(gameId, lobby, started = false) {
    const ttl = started ? TTL.LOBBY_AFTER_START : TTL.LOBBY;
    await redis.set(`lobby:${gameId}`, JSON.stringify(lobby), 'EX', ttl);
    if (!started) {
        await redis.sadd('lobbies', gameId);
    }
}
async function getLobby(gameId) {
    const data = await redis.get(`lobby:${gameId}`);
    return data ? JSON.parse(data) : null;
}
async function deleteLobby(gameId) {
    await redis.del(`lobby:${gameId}`);
    await redis.srem('lobbies', gameId);
}
async function getAllLobbyIds() {
    return redis.smembers('lobbies');
}
// Player disconnect tracking
async function saveDisconnectedPlayer(socketId, data) {
    await redis.set(`player:${socketId}`, JSON.stringify(data), 'EX', TTL.DISCONNECT);
}
async function getDisconnectedPlayer(socketId) {
    const data = await redis.get(`player:${socketId}`);
    return data ? JSON.parse(data) : null;
}
async function deleteDisconnectedPlayer(socketId) {
    await redis.del(`player:${socketId}`);
}
// Refresh TTL on game activity
async function refreshGameTTL(gameId) {
    await redis.expire(`game:${gameId}`, TTL.GAME);
}
//# sourceMappingURL=redis.js.map