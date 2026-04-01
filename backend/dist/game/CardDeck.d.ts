import { Card, Suit, Rank } from '../types/game';
export declare function createDeck(): Card[];
export declare function shuffleDeck(deck: Card[]): Card[];
export declare function dealCards(deck: Card[], numPlayers: number): Card[][];
export declare function parseCardId(cardId: string): {
    rank: Rank;
    suit: Suit;
} | null;
//# sourceMappingURL=CardDeck.d.ts.map