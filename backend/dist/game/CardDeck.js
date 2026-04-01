"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeck = createDeck;
exports.shuffleDeck = shuffleDeck;
exports.dealCards = dealCards;
exports.parseCardId = parseCardId;
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                id: `${rank}_${suit}`,
                suit,
                rank,
            });
        }
    }
    return deck;
}
function shuffleDeck(deck) {
    const shuffled = [...deck];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function dealCards(deck, numPlayers) {
    const hands = Array.from({ length: numPlayers }, () => []);
    for (let i = 0; i < deck.length; i++) {
        hands[i % numPlayers].push(deck[i]);
    }
    return hands;
}
function parseCardId(cardId) {
    const parts = cardId.split('_');
    if (parts.length !== 2)
        return null;
    const [rank, suit] = parts;
    if (!RANKS.includes(rank) || !SUITS.includes(suit))
        return null;
    return { rank: rank, suit: suit };
}
//# sourceMappingURL=CardDeck.js.map