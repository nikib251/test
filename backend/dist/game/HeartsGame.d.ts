import { Card, GameState, GamePhase, PlayerState, TrickCard, RuleVariants, LobbyInfo, BotDifficulty, PassDirection } from '../types/game';
import { HeartsBot } from '../bot/HeartsBot';
export declare class HeartsGame {
    gameId: string;
    hostId: string;
    phase: GamePhase;
    players: PlayerState[];
    bots: Map<string, HeartsBot>;
    currentTrick: TrickCard[];
    trickLeader: string;
    currentPlayerId: string;
    round: number;
    trickNumber: number;
    heartsBroken: boolean;
    rules: RuleVariants;
    scores: Record<string, number>;
    roundScoresHistory: Record<string, number>[];
    passDirection: PassDirection;
    passedCards: Record<string, Card[]>;
    pendingPasses: Map<string, Card[]>;
    onGameStateUpdate?: (state: GameState) => void;
    onTrickComplete?: (winnerId: string, cards: TrickCard[]) => void;
    onRoundComplete?: (roundScores: Record<string, number>, totalScores: Record<string, number>) => void;
    onGameComplete?: (finalScores: Record<string, number>, winnerId: string) => void;
    onError?: (playerId: string, code: string, message: string) => void;
    constructor(gameId: string, hostId: string);
    addPlayer(id: string, nickname: string, role?: 'human' | 'bot', difficulty?: BotDifficulty | null): boolean;
    removePlayer(playerId: string): boolean;
    addBot(difficulty: BotDifficulty): PlayerState | null;
    removeBot(playerId: string): boolean;
    updateRules(rules: Partial<RuleVariants>): void;
    getLobbyInfo(): LobbyInfo;
    startGame(): boolean;
    private startNewRound;
    private processBotPasses;
    submitPass(playerId: string, cardIds: string[]): boolean;
    private executePasses;
    private startFirstTrick;
    playCard(playerId: string, cardId: string): boolean;
    private advanceToNextPlayer;
    private completeTrick;
    private completeRound;
    private completeGame;
    private checkBotTurn;
    getGameState(): GameState;
    /**
     * Get filtered game state for a specific player (hides other players' hands)
     */
    getFilteredStateForPlayer(playerId: string): GameState;
    private emitState;
    reconnectPlayer(playerId: string): boolean;
    disconnectPlayer(playerId: string): void;
    toJSON(): GameState;
    static fromState(state: GameState, bots: Map<string, HeartsBot>): HeartsGame;
    private delay;
}
//# sourceMappingURL=HeartsGame.d.ts.map