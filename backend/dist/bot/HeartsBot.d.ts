import { Card, BotDifficulty, RuleVariants, GameState } from './types';
export declare class HeartsBot {
    readonly nickname: string;
    readonly difficulty: BotDifficulty;
    private counter;
    private lastTrickCount;
    private roundPlays;
    constructor(nickname: string, difficulty: BotDifficulty);
    choosePass(hand: Card[], rules: RuleVariants): Promise<Card[]>;
    chooseCard(gameState: GameState, playerId: string): Promise<Card>;
    onRoundComplete(roundScores: Record<string, number>, playerId: string): Promise<void>;
    private syncCardCounter;
}
//# sourceMappingURL=HeartsBot.d.ts.map