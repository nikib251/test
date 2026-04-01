import { Card, BotDifficulty, RuleVariants, GameState } from '../types/game';
export declare class HeartsBot {
    readonly nickname: string;
    readonly difficulty: BotDifficulty;
    private counter;
    private lastTrickCount;
    private opponentVoids;
    private roundPlays;
    constructor(nickname: string, difficulty: BotDifficulty);
    choosePass(hand: Card[], rules: RuleVariants): Promise<Card[]>;
    chooseCard(gameState: GameState, playerId: string): Promise<Card>;
    onRoundComplete(roundScores: Record<string, number>, playerId: string): Promise<void>;
    private syncCardCounter;
    private updateOpponentVoids;
}
//# sourceMappingURL=HeartsBot.d.ts.map