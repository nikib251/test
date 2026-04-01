"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardCounter = void 0;
const TOTAL_PER_SUIT = 13;
class CardCounter {
    constructor() {
        this.played = new Map();
    }
    recordPlay(card) {
        this.played.set(card.id, card);
    }
    getPlayedCards() {
        return Array.from(this.played.values());
    }
    getRemainingCards(suit) {
        let count = 0;
        for (const card of this.played.values()) {
            if (card.suit === suit)
                count++;
        }
        return TOTAL_PER_SUIT - count;
    }
    hasBeenPlayed(cardId) {
        return this.played.has(cardId);
    }
    getPlayedInSuit(suit) {
        const result = [];
        for (const card of this.played.values()) {
            if (card.suit === suit)
                result.push(card);
        }
        return result;
    }
    reset() {
        this.played.clear();
    }
}
exports.CardCounter = CardCounter;
//# sourceMappingURL=CardCounter.js.map