"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartsBot = void 0;
const CardCounter_1 = require("./CardCounter");
const BotWeights = __importStar(require("./BotWeights"));
// ── Helpers ────────────────────────────────────────────────────────
const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUE = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i]));
const ALL_SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
function rankVal(card) { return RANK_VALUE[card.rank]; }
function cardCode(card) {
    return card.rank + card.suit[0].toUpperCase();
}
function isQoS(card) {
    return card.rank === 'Q' && card.suit === 'spades';
}
function isHeart(card) {
    return card.suit === 'hearts';
}
function penaltyPoints(card, rules) {
    if (isHeart(card))
        return 1;
    if (isQoS(card))
        return 13;
    if (rules.blackMaria) {
        if (card.suit === 'spades' && card.rank === 'K')
            return 10;
        if (card.suit === 'spades' && card.rank === 'A')
            return 7;
    }
    return 0;
}
function hasSuit(hand, suit) {
    return hand.some(c => c.suit === suit);
}
function cardsOfSuit(hand, suit) {
    return hand.filter(c => c.suit === suit);
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function randomDelay() {
    return delay(500 + Math.random() * 1000);
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
// ── Situation Hash ─────────────────────────────────────────────────
// Format: 'v1_' + hex encoding of:
//   round_phase(2bit) + position_in_trick(2bit) + hand_size_bucket(3bit)
//   + void_suits(4bit) + hearts_broken(1bit) + lead_suit(3bit)
// Total: 15 bits -> 4 hex chars
const SUIT_BITS = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
const LEAD_SUIT_MAP = { clubs: 1, diamonds: 2, hearts: 3, spades: 4, none: 0 };
function handSizeBucket(size) {
    // 0-2: 0, 3-5: 1, 6-8: 2, 9-10: 3, 11-13: 4 (fits in 3 bits)
    if (size <= 2)
        return 0;
    if (size <= 5)
        return 1;
    if (size <= 8)
        return 2;
    if (size <= 10)
        return 3;
    return 4;
}
function computeSituationHash(gameState, hand) {
    const phase = gameState.phase === 'passing' ? 0 : gameState.phase === 'playing' ? 1 : 2;
    const posInTrick = Math.min(gameState.currentTrick.length, 3); // 0-3
    const hsBucket = handSizeBucket(hand.length);
    let voidBits = 0;
    for (const suit of ALL_SUITS) {
        if (!hasSuit(hand, suit)) {
            voidBits |= (1 << SUIT_BITS[suit]);
        }
    }
    const hbBit = gameState.heartsBroken ? 1 : 0;
    const leadSuit = gameState.currentTrick.length > 0
        ? LEAD_SUIT_MAP[gameState.currentTrick[0].card.suit] ?? 0
        : 0;
    // Pack into 15 bits:
    // [14:13] phase, [12:11] position, [10:8] handBucket, [7:4] voidSuits, [3] heartsBroken, [2:0] leadSuit
    const bits = (phase << 13) | (posInTrick << 11) | (hsBucket << 8) | (voidBits << 4) | (hbBit << 3) | leadSuit;
    const hex = bits.toString(16).padStart(4, '0');
    return `v1_${hex}`;
}
// ── Legal Move Filter ──────────────────────────────────────────────
function getLegalMoves(hand, gameState) {
    const trick = gameState.currentTrick;
    const trickNum = gameState.trickNumber;
    const rules = gameState.rules;
    // First trick of the round: must lead 2 of clubs
    if (trickNum === 1 && trick.length === 0) {
        const twoClubs = hand.find(c => c.id === '2_clubs');
        return twoClubs ? [twoClubs] : hand; // fallback if somehow missing
    }
    if (trick.length === 0) {
        // Leading a trick
        if (rules.noHeartBreak && !gameState.heartsBroken) {
            const nonHearts = hand.filter(c => !isHeart(c));
            if (nonHearts.length > 0)
                return nonHearts;
            // If only hearts remain, can lead them
            if (rules.queenBreaksHearts) {
                // QoS can also break hearts in this variant
                return hand;
            }
        }
        return hand;
    }
    // Following: must follow lead suit
    const leadSuit = trick[0].card.suit;
    const suitCards = cardsOfSuit(hand, leadSuit);
    if (suitCards.length > 0)
        return suitCards;
    // Void in lead suit: can play anything except...
    if (trickNum === 1) {
        // First trick: no hearts or QoS (standard rule)
        const safe = hand.filter(c => !isHeart(c) && !isQoS(c));
        if (safe.length > 0)
            return safe;
    }
    return hand;
}
// ── Moon Shot Detection ────────────────────────────────────────────
function detectMoonShooter(gameState, myId) {
    // Someone is shooting if they've taken almost all penalty cards
    const totalPenaltyCards = 14; // 13 hearts + QoS
    for (const player of gameState.players) {
        if (player.id === myId)
            continue;
        let penaltyCount = 0;
        for (const trick of player.tricksTaken) {
            for (const card of trick) {
                if (isHeart(card) || isQoS(card))
                    penaltyCount++;
            }
        }
        // If they have 8+ penalty cards by trick 10, they might be shooting
        if (penaltyCount >= 8 && gameState.trickNumber >= 8) {
            return player.id;
        }
    }
    return null;
}
function amIShootingTheMoon(gameState, myId) {
    const me = gameState.players.find(p => p.id === myId);
    if (!me)
        return false;
    let myPenalty = 0;
    for (const trick of me.tricksTaken) {
        for (const card of trick) {
            if (isHeart(card) || isQoS(card))
                myPenalty++;
        }
    }
    // Commit to shooting if we have 10+ penalty cards
    return myPenalty >= 10;
}
// ── Heuristic Scoring ──────────────────────────────────────────────
function scoreCardHeuristic(card, legalMoves, hand, gameState, playerId, counter) {
    const trick = gameState.currentTrick;
    const rules = gameState.rules;
    let score = 0;
    const iAmShooting = amIShootingTheMoon(gameState, playerId);
    const moonShooter = detectMoonShooter(gameState, playerId);
    // ── Moon shooting mode ──
    if (iAmShooting) {
        // Want to WIN tricks and collect all penalty cards
        score += rankVal(card) * 3; // prefer high cards
        if (isHeart(card) || isQoS(card))
            score += 10;
        // If leading, lead high
        if (trick.length === 0)
            score += rankVal(card) * 2;
        return score;
    }
    // ── Blocking a moon shooter ──
    if (moonShooter && trick.length > 0) {
        // Try to win a trick with a penalty card to break the shoot
        const leadSuit = trick[0].card.suit;
        if (card.suit === leadSuit) {
            // If the moon shooter led, try to take the trick with a non-penalty card
            const highestInTrick = Math.max(...trick.map(tc => rankVal(tc.card)));
            if (rankVal(card) > highestInTrick && !isHeart(card) && !isQoS(card)) {
                score += 15; // win the trick to grab a heart away from shooter
            }
        }
        if (isHeart(card) && card.suit !== (trick[0]?.card.suit)) {
            // Dump a heart on the trick the shooter might not win
            score += 5;
        }
    }
    // ── Leading ──
    if (trick.length === 0) {
        // Lead low in safe suits
        if (!isHeart(card) && !isQoS(card)) {
            score += 8 - rankVal(card); // lower = higher score
        }
        // Avoid leading spades if we don't have QoS protection
        if (card.suit === 'spades') {
            const hasQueen = hand.some(c => isQoS(c));
            if (hasQueen && rankVal(card) < RANK_VALUE['Q']) {
                score += 5; // lead low spade to flush out higher spades
            }
            else {
                score -= 3;
            }
        }
        // Lead a suit where we have few cards (can void later)
        const suitCount = cardsOfSuit(hand, card.suit).length;
        if (suitCount <= 2)
            score += 3;
        return score;
    }
    // ── Following ──
    const leadSuit = trick[0].card.suit;
    const highestInTrick = Math.max(...trick.map(tc => tc.card.suit === leadSuit ? rankVal(tc.card) : -1));
    const trickHasPenalty = trick.some(tc => penaltyPoints(tc.card, rules) > 0);
    if (card.suit === leadSuit) {
        // Following suit
        if (rankVal(card) < highestInTrick) {
            // Play under: safe, we won't win
            score += 10 + rankVal(card); // play highest card that's still safe
        }
        else {
            // We'd win the trick
            if (trickHasPenalty) {
                score -= 15; // avoid winning penalty cards
            }
            else if (trick.length === 3) {
                // Last to play, no penalty in trick: safe to win
                score += 5;
            }
            else {
                score -= 3; // early position, risky
            }
        }
    }
    else {
        // Void in lead suit: dump dangerous cards
        if (isQoS(card)) {
            score += 25; // dump QoS immediately
        }
        if (isHeart(card)) {
            score += 10 + rankVal(card); // dump high hearts first
        }
        if (rules.blackMaria && card.suit === 'spades' && (card.rank === 'K' || card.rank === 'A')) {
            score += 20; // dump black maria cards
        }
        // JoD bonus: try to keep it if rules enable it
        if (rules.jackOfDiamonds && card.suit === 'diamonds' && card.rank === 'J') {
            score -= 15; // keep JoD, it's worth -10 points
        }
        // Otherwise dump high cards to reduce future danger
        if (!isHeart(card) && !isQoS(card)) {
            score += rankVal(card) * 0.5;
        }
    }
    // ── Card counting adjustments ──
    const remainingInSuit = counter.getRemainingCards(card.suit);
    if (card.suit === 'spades' && !counter.hasBeenPlayed('Q_spades')) {
        // QoS is still out there
        if (card.suit === 'spades' && rankVal(card) > RANK_VALUE['Q']) {
            score -= 5; // danger of eating QoS
        }
    }
    // If very few cards remain in a suit, high cards are safer
    if (remainingInSuit <= 3 && card.suit !== 'hearts') {
        score += 2;
    }
    return score;
}
// ── Pass Heuristics ────────────────────────────────────────────────
function scorePassCard(card, hand, rules) {
    let score = 0;
    // Always pass QoS
    if (isQoS(card))
        return 100;
    // Pass high spades (danger of catching QoS)
    if (card.suit === 'spades') {
        if (card.rank === 'A')
            score += 90;
        if (card.rank === 'K')
            score += 85;
        if (rules.blackMaria) {
            // Even more dangerous in blackMaria
            if (card.rank === 'A')
                score += 10;
            if (card.rank === 'K')
                score += 10;
        }
    }
    // Pass high hearts
    if (isHeart(card)) {
        score += 30 + rankVal(card) * 3;
    }
    // Pass high cards in general
    score += rankVal(card) * 2;
    // Keep JoD if enabled
    if (rules.jackOfDiamonds && card.suit === 'diamonds' && card.rank === 'J') {
        score -= 50;
    }
    // Prefer to void a suit: pass all cards of a short suit
    const suitCount = cardsOfSuit(hand, card.suit).length;
    if (suitCount <= 3 && card.suit !== 'hearts') {
        score += 15;
    }
    return score;
}
// ── Softmax Selection ──────────────────────────────────────────────
function softmaxSelect(scores, temperature = 1.0) {
    const entries = Array.from(scores.entries());
    if (entries.length === 1)
        return entries[0][0];
    const maxScore = Math.max(...entries.map(([, s]) => s));
    const exps = entries.map(([card, s]) => {
        const exp = Math.exp((s - maxScore) / temperature);
        return { card, exp };
    });
    const sumExp = exps.reduce((sum, e) => sum + e.exp, 0);
    let r = Math.random() * sumExp;
    for (const { card, exp } of exps) {
        r -= exp;
        if (r <= 0)
            return card;
    }
    return entries[entries.length - 1][0];
}
// ── Main Bot Class ─────────────────────────────────────────────────
class HeartsBot {
    constructor(nickname, difficulty) {
        this.lastTrickCount = 0;
        // Track which cards we played in which situations (for weight updates)
        this.roundPlays = [];
        this.nickname = nickname;
        this.difficulty = difficulty;
        this.counter = new CardCounter_1.CardCounter();
    }
    async choosePass(hand, rules) {
        await randomDelay();
        if (this.difficulty === 'easy') {
            // Random 3 cards
            const shuffled = [...hand].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, 3);
        }
        // Medium + Hard: heuristic pass
        const scored = hand.map(card => ({
            card,
            score: scorePassCard(card, hand, rules),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3).map(s => s.card);
    }
    async chooseCard(gameState, playerId) {
        await randomDelay();
        // Update card counter from any new trick cards we haven't tracked
        this.syncCardCounter(gameState);
        const me = gameState.players.find(p => p.id === playerId);
        if (!me || me.hand.length === 0) {
            throw new Error('Bot has no cards to play');
        }
        const hand = me.hand;
        const legalMoves = getLegalMoves(hand, gameState);
        if (legalMoves.length === 1)
            return legalMoves[0];
        // Easy: random
        if (this.difficulty === 'easy') {
            return pickRandom(legalMoves);
        }
        // Compute heuristic scores
        const hScores = new Map();
        for (const card of legalMoves) {
            hScores.set(card, scoreCardHeuristic(card, legalMoves, hand, gameState, playerId, this.counter));
        }
        // Medium: pure heuristics with softmax
        if (this.difficulty === 'medium') {
            return softmaxSelect(hScores, 1.5);
        }
        // Hard: heuristics * adaptive weights
        const situationHash = computeSituationHash(gameState, hand);
        const codes = legalMoves.map(c => cardCode(c));
        const weights = await BotWeights.getWeights(situationHash, codes, this.difficulty);
        const combinedScores = new Map();
        for (const card of legalMoves) {
            const h = hScores.get(card) ?? 0;
            const w = weights.get(cardCode(card)) ?? 0.5;
            combinedScores.set(card, h * w);
        }
        const chosen = softmaxSelect(combinedScores, 1.0);
        // Record for later weight update
        this.roundPlays.push({
            situationHash,
            cardCode: cardCode(chosen),
        });
        return chosen;
    }
    async onRoundComplete(roundScores, playerId) {
        // Reset card counter for next round
        this.counter.reset();
        this.lastTrickCount = 0;
        // Only hard bots update weights
        if (this.difficulty !== 'hard' || this.roundPlays.length === 0) {
            this.roundPlays = [];
            return;
        }
        const myScore = roundScores[playerId] ?? 0;
        // Update weights for all plays this round
        const updates = this.roundPlays.map(play => BotWeights.updateWeight(play.situationHash, play.cardCode, this.difficulty, myScore));
        await Promise.all(updates);
        this.roundPlays = [];
    }
    syncCardCounter(gameState) {
        // Count total tricks played across all players
        let totalTricks = 0;
        for (const player of gameState.players) {
            totalTricks += player.tricksTaken.length;
        }
        // If new tricks since last sync, record all cards from new tricks
        if (totalTricks > this.lastTrickCount) {
            // Reset and rebuild from all tricks (simpler and correct)
            this.counter.reset();
            for (const player of gameState.players) {
                for (const trick of player.tricksTaken) {
                    for (const card of trick) {
                        this.counter.recordPlay(card);
                    }
                }
            }
            // Also record cards in the current trick
            for (const tc of gameState.currentTrick) {
                this.counter.recordPlay(tc.card);
            }
            this.lastTrickCount = totalTricks;
        }
        else {
            // Just add current trick cards
            for (const tc of gameState.currentTrick) {
                if (!this.counter.hasBeenPlayed(tc.card.id)) {
                    this.counter.recordPlay(tc.card);
                }
            }
        }
    }
}
exports.HeartsBot = HeartsBot;
//# sourceMappingURL=HeartsBot.js.map