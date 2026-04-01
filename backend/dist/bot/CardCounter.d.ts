import { Card, Suit } from '../types/game';
export declare class CardCounter {
    private played;
    recordPlay(card: Card): void;
    getPlayedCards(): Card[];
    getRemainingCards(suit: Suit): number;
    hasBeenPlayed(cardId: string): boolean;
    getPlayedInSuit(suit: Suit): Card[];
    reset(): void;
}
//# sourceMappingURL=CardCounter.d.ts.map