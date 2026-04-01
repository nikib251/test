import { Card, Suit } from '../types/game';

const TOTAL_PER_SUIT = 13;

export class CardCounter {
  private played: Map<string, Card> = new Map();

  recordPlay(card: Card): void {
    this.played.set(card.id, card);
  }

  getPlayedCards(): Card[] {
    return Array.from(this.played.values());
  }

  getRemainingCards(suit: Suit): number {
    let count = 0;
    for (const card of this.played.values()) {
      if (card.suit === suit) count++;
    }
    return TOTAL_PER_SUIT - count;
  }

  hasBeenPlayed(cardId: string): boolean {
    return this.played.has(cardId);
  }

  getPlayedInSuit(suit: Suit): Card[] {
    const result: Card[] = [];
    for (const card of this.played.values()) {
      if (card.suit === suit) result.push(card);
    }
    return result;
  }

  reset(): void {
    this.played.clear();
  }
}
