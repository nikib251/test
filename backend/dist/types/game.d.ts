export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card {
    id: string;
    suit: Suit;
    rank: Rank;
}
export type PlayerRole = 'human' | 'bot';
export type BotDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** Backward-compatible mapping from legacy string values */
export declare function parseBotDifficulty(value: string | number): BotDifficulty;
export declare const BOT_DIFFICULTY_NAMES: Record<BotDifficulty, string>;
export type PassDirection = 'left' | 'right' | 'across' | 'none' | 'random';
export type GamePhase = 'waiting' | 'passing' | 'playing' | 'round_end' | 'game_end';
export interface RuleVariants {
    jackOfDiamonds: boolean;
    tenOfClubsDoubles: boolean;
    noHeartBreak: boolean;
    queenBreaksHearts: boolean;
    moonGivesNegative: boolean;
    shootTheSun: boolean;
    bloodOnTheMoon: boolean;
    blackMaria: boolean;
    omnibusHearts: boolean;
    passDirection: PassDirection;
    endScore: number;
}
export interface PlayerState {
    id: string;
    nickname: string;
    role: PlayerRole;
    difficulty: BotDifficulty | null;
    hand: Card[];
    handCount: number;
    score: number;
    roundScore: number;
    tricksTaken: Card[][];
    isConnected: boolean;
}
export interface TrickCard {
    playerId: string;
    card: Card;
}
export interface GameState {
    gameId: string;
    phase: GamePhase;
    players: PlayerState[];
    currentTrick: TrickCard[];
    trickLeader: string;
    currentPlayerId: string;
    round: number;
    trickNumber: number;
    heartsBroken: boolean;
    rules: RuleVariants;
    scores: Record<string, number>;
    roundScores: Record<string, number>[];
    passDirection: PassDirection;
    passedCards: Record<string, Card[]>;
}
export interface LobbyInfo {
    gameId: string;
    hostId: string;
    players: {
        id: string;
        nickname: string;
        role: PlayerRole;
        difficulty: BotDifficulty | null;
    }[];
    rules: RuleVariants;
}
export declare const DEFAULT_RULES: RuleVariants;
export declare const RANK_ORDER: Rank[];
//# sourceMappingURL=game.d.ts.map