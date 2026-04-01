import { Card, PlayerState, RuleVariants, TrickCard } from '../types/game';
export declare class RulesEngine {
    /**
     * Get the rank value for comparison (higher = better)
     */
    static rankValue(rank: string): number;
    /**
     * Determine who has the 2 of clubs (leads first trick)
     */
    static findTwoOfClubsHolder(players: PlayerState[]): string | null;
    /**
     * Get valid cards a player can play
     */
    static getValidCards(hand: Card[], currentTrick: TrickCard[], trickNumber: number, heartsBroken: boolean, rules: RuleVariants, isFirstTrick: boolean): Card[];
    /**
     * Check if a card is a point card
     */
    static isPointCard(card: Card, rules: RuleVariants): boolean;
    /**
     * Determine the winner of a trick
     */
    static determineTrickWinner(trick: TrickCard[]): TrickCard;
    /**
     * Check if playing a card breaks hearts
     */
    static doesBreakHearts(card: Card, rules: RuleVariants): boolean;
    /**
     * Calculate round scores for all players
     */
    static calculateRoundScores(players: PlayerState[], rules: RuleVariants): Record<string, number>;
    /**
     * Detect if a player shot the moon (took all hearts + Q of spades)
     */
    static detectMoonShooter(players: PlayerState[], rules: RuleVariants): string | null;
    /**
     * Resolve pass direction for a given round
     */
    static resolvePassDirection(rules: RuleVariants, round: number): 'left' | 'right' | 'across' | 'none';
    /**
     * Get the pass target player index based on direction
     */
    static getPassTarget(playerIndex: number, direction: 'left' | 'right' | 'across' | 'none', totalPlayers: number): number;
    /**
     * Check if a specific card play is valid
     */
    static isValidPlay(card: Card, hand: Card[], currentTrick: TrickCard[], trickNumber: number, heartsBroken: boolean, rules: RuleVariants, isFirstTrick: boolean): boolean;
}
//# sourceMappingURL=RulesEngine.d.ts.map