import Redis from 'ioredis';
import { GameState, LobbyInfo } from '../types/game';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times: number) => {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

const TTL = {
  GAME: 7200,       // 2 hours
  LOBBY: 1800,      // 30 minutes
  DISCONNECT: 60,   // 60 seconds grace
  LOBBY_AFTER_START: 300, // 5 min after game starts
};

// Game state operations
export async function saveGameState(gameId: string, state: GameState): Promise<void> {
  await redis.set(`game:${gameId}`, JSON.stringify(state), 'EX', TTL.GAME);
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  const data = await redis.get(`game:${gameId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteGameState(gameId: string): Promise<void> {
  await redis.del(`game:${gameId}`);
}

// Lobby operations
export async function saveLobby(gameId: string, lobby: LobbyInfo, started = false): Promise<void> {
  const ttl = started ? TTL.LOBBY_AFTER_START : TTL.LOBBY;
  await redis.set(`lobby:${gameId}`, JSON.stringify(lobby), 'EX', ttl);
  if (!started) {
    await redis.sadd('lobbies', gameId);
  }
}

export async function getLobby(gameId: string): Promise<LobbyInfo | null> {
  const data = await redis.get(`lobby:${gameId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteLobby(gameId: string): Promise<void> {
  await redis.del(`lobby:${gameId}`);
  await redis.srem('lobbies', gameId);
}

export async function getAllLobbyIds(): Promise<string[]> {
  return redis.smembers('lobbies');
}

// Player disconnect tracking
export async function saveDisconnectedPlayer(
  socketId: string,
  data: { nickname: string; gameId: string; playerId: string }
): Promise<void> {
  await redis.set(`player:${socketId}`, JSON.stringify(data), 'EX', TTL.DISCONNECT);
}

export async function getDisconnectedPlayer(
  socketId: string
): Promise<{ nickname: string; gameId: string; playerId: string } | null> {
  const data = await redis.get(`player:${socketId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteDisconnectedPlayer(socketId: string): Promise<void> {
  await redis.del(`player:${socketId}`);
}

// Refresh TTL on game activity
export async function refreshGameTTL(gameId: string): Promise<void> {
  await redis.expire(`game:${gameId}`, TTL.GAME);
}

export { redis };
