import { Pool } from 'pg';
declare const pool: Pool;
export declare function query(text: string, params?: any[]): Promise<any>;
export declare function saveGameResult(gameId: string, ruleVariants: object, winnerNickname: string, roundScores: Record<string, number>[], playerResults: {
    nickname: string;
    score: number;
    placement: number;
    heartsTaken: number;
    queenTaken: boolean;
}[]): Promise<void>;
export declare function getPlayerStats(nickname: string): Promise<{
    nickname: any;
    totalGames: any;
    wins: any;
    losses: any;
    avgScore: number;
} | null>;
export declare function getLeaderboard(): Promise<any>;
export declare function getGameHistory(gameId: string): Promise<{
    rounds: any;
} | null>;
export interface DailyBonusStatus {
    canClaim: boolean;
    streak: number;
    coins: number;
    nextReward: number;
    hoursUntilNext: number;
}
export interface DailyBonusClaimResult {
    success: boolean;
    coins: number;
    streak: number;
    nextBonus: string;
    alreadyClaimed: boolean;
}
export declare function getDailyBonusStatus(nickname: string): Promise<DailyBonusStatus>;
export declare function claimDailyBonus(nickname: string): Promise<DailyBonusClaimResult>;
export { pool };
//# sourceMappingURL=postgres.d.ts.map