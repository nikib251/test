export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // format: '{rank}_{suit}' e.g. 'Q_spades', '10_hearts'
  suit: Suit;
  rank: Rank;
}

export type PlayerRole = 'human' | 'bot';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
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

export interface ChatMessage {
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

export interface RoundCompleteData {
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
}

export interface GameCompleteData {
  finalScores: Record<string, number>;
  winnerId: string;
}

export interface TrickCompleteData {
  winnerId: string;
  cards: TrickCard[];
}

export interface LeaderboardEntry {
  nickname: string;
  wins: number;
  totalGames: number;
  winRate: number;
}

export const DEFAULT_RULES: RuleVariants = {
  jackOfDiamonds: false,
  tenOfClubsDoubles: false,
  noHeartBreak: false,
  queenBreaksHearts: false,
  moonGivesNegative: false,
  shootTheSun: false,
  bloodOnTheMoon: false,
  blackMaria: false,
  omnibusHearts: false,
  passDirection: 'left',
  endScore: 100,
};
