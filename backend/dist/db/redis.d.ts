import Redis from 'ioredis';
import { GameState, LobbyInfo } from '../types/game';
declare const redis: Redis;
export declare function saveGameState(gameId: string, state: GameState): Promise<void>;
export declare function getGameState(gameId: string): Promise<GameState | null>;
export declare function deleteGameState(gameId: string): Promise<void>;
export declare function saveLobby(gameId: string, lobby: LobbyInfo, started?: boolean): Promise<void>;
export declare function getLobby(gameId: string): Promise<LobbyInfo | null>;
export declare function deleteLobby(gameId: string): Promise<void>;
export declare function getAllLobbyIds(): Promise<string[]>;
export declare function saveDisconnectedPlayer(socketId: string, data: {
    nickname: string;
    gameId: string;
    playerId: string;
}): Promise<void>;
export declare function getDisconnectedPlayer(socketId: string): Promise<{
    nickname: string;
    gameId: string;
    playerId: string;
} | null>;
export declare function deleteDisconnectedPlayer(socketId: string): Promise<void>;
export declare function refreshGameTTL(gameId: string): Promise<void>;
export { redis };
//# sourceMappingURL=redis.d.ts.map