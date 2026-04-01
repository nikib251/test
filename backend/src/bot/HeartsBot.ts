import {
  Card, Suit, Rank, BotDifficulty, RuleVariants, GameState, TrickCard,
} from '../types/game';
import { CardCounter } from './CardCounter';
import * as BotWeights from './BotWeights';

// ── Helpers ────────────────────────────────────────────────────────

const RANK_ORDER: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i])
) as Record<Rank, number>;

const ALL_SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

function rankVal(card: Card): number { return RANK_VALUE[card.rank]; }

function cardCode(card: Card): string {
  return card.rank + card.suit[0].toUpperCase();
}

function isQoS(card: Card): boolean {
  return card.rank === 'Q' && card.suit === 'spades';
}

function isHeart(card: Card): boolean {
  return card.suit === 'hearts';
}

function penaltyPoints(card: Card, rules: RuleVariants): number {
  if (isHeart(card)) return 1;
  if (isQoS(card)) return 13;
  if (rules.blackMaria) {
    if (card.suit === 'spades' && card.rank === 'K') return 10;
    if (card.suit === 'spades' && card.rank === 'A') return 7;
  }
  return 0;
}

function hasSuit(hand: Card[], suit: Suit): boolean {
  return hand.some(c => c.suit === suit);
}

function cardsOfSuit(hand: Card[], suit: Suit): Card[] {
  return hand.filter(c => c.suit === suit);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(): Promise<void> {
  return delay(500 + Math.random() * 1000);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Situation Hash ─────────────────────────────────────────────────

const SUIT_BITS: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
const LEAD_SUIT_MAP: Record<string, number> = { clubs: 1, diamonds: 2, hearts: 3, spades: 4, none: 0 };

function handSizeBucket(size: number): number {
  if (size <= 2) return 0;
  if (size <= 5) return 1;
  if (size <= 8) return 2;
  if (size <= 10) return 3;
  return 4;
}

function computeSituationHash(
  gameState: GameState,
  hand: Card[],
): string {
  const phase = gameState.phase === 'passing' ? 0 : gameState.phase === 'playing' ? 1 : 2;
  const posInTrick = Math.min(gameState.currentTrick.length, 3);
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

  const bits = (phase << 13) | (posInTrick << 11) | (hsBucket << 8) | (voidBits << 4) | (hbBit << 3) | leadSuit;
  const hex = bits.toString(16).padStart(4, '0');
  return `v1_${hex}`;
}

// ── Legal Move Filter ──────────────────────────────────────────────

function getLegalMoves(hand: Card[], gameState: GameState): Card[] {
  const trick = gameState.currentTrick;
  const trickNum = gameState.trickNumber;
  const rules = gameState.rules;

  // First trick of the round: must lead 2 of clubs
  if (trickNum === 1 && trick.length === 0) {
    const twoClubs = hand.find(c => c.id === '2_clubs');
    return twoClubs ? [twoClubs] : hand;
  }

  if (trick.length === 0) {
    if (rules.noHeartBreak) {
      return hand;
    }
    if (!gameState.heartsBroken) {
      const nonHearts = hand.filter(c => !isHeart(c));
      return nonHearts.length > 0 ? nonHearts : hand;
    }
    return hand;
  }

  // Following: must follow lead suit
  const leadSuit = trick[0].card.suit;
  const suitCards = cardsOfSuit(hand, leadSuit);
  if (suitCards.length > 0) return suitCards;

  // Void in lead suit: can play anything except on first trick...
  if (trickNum === 1) {
    const safe = hand.filter(c => !isHeart(c) && !isQoS(c) &&
      !(rules.blackMaria && c.suit === 'spades' && (c.rank === 'K' || c.rank === 'A')));
    if (safe.length > 0) return safe;
  }

  return hand;
}

// ── Moon Shot Detection ────────────────────────────────────────────

function countPenaltyCards(tricks: Card[][]): number {
  let count = 0;
  for (const trick of tricks) {
    for (const card of trick) {
      if (isHeart(card) || isQoS(card)) count++;
    }
  }
  return count;
}

function detectMoonShooter(gameState: GameState, myId: string): string | null {
  for (const player of gameState.players) {
    if (player.id === myId) continue;
    const penaltyCount = countPenaltyCards(player.tricksTaken);
    if (penaltyCount >= 8 && gameState.trickNumber >= 8) {
      return player.id;
    }
  }
  return null;
}

function amIShootingTheMoon(gameState: GameState, myId: string): boolean {
  const me = gameState.players.find(p => p.id === myId);
  if (!me) return false;
  return countPenaltyCards(me.tricksTaken) >= 10;
}

// ── Suit Void Tracking (Level 6+) ─────────────────────────────────

/** Track which suits each opponent is void in based on observed plays */
function inferVoidSuits(gameState: GameState, myId: string): Map<string, Set<Suit>> {
  const voids = new Map<string, Set<Suit>>();
  for (const p of gameState.players) {
    if (p.id !== myId) voids.set(p.id, new Set());
  }

  // Look at all completed tricks to find instances where a player didn't follow suit
  for (const player of gameState.players) {
    for (const trick of player.tricksTaken) {
      // We can't reconstruct who played what from tricksTaken alone,
      // so we rely on current trick observation below
    }
  }

  // Current trick: if someone played off-suit, they're void in the lead suit
  if (gameState.currentTrick.length >= 2) {
    const leadSuit = gameState.currentTrick[0].card.suit;
    for (let i = 1; i < gameState.currentTrick.length; i++) {
      const tc = gameState.currentTrick[i];
      if (tc.card.suit !== leadSuit && tc.playerId !== myId) {
        voids.get(tc.playerId)?.add(leadSuit);
      }
    }
  }

  return voids;
}

// ── Probability Estimation (Level 9+) ─────────────────────────────

/** Estimate the probability that a specific opponent holds a given card */
function estimateCardProbability(
  cardId: string,
  suit: Suit,
  counter: CardCounter,
  opponentVoids: Map<string, Set<Suit>>,
  gameState: GameState,
  myId: string,
): number {
  if (counter.hasBeenPlayed(cardId)) return 0;

  const remaining = counter.getRemainingCards(suit);
  const opponents = gameState.players.filter(p => p.id !== myId);
  const nonVoidOpponents = opponents.filter(p => !opponentVoids.get(p.id)?.has(suit));

  if (nonVoidOpponents.length === 0) return 0;
  // Simplified: probability any opponent has it
  return remaining > 0 ? Math.min(1, nonVoidOpponents.length / remaining) : 0;
}

// ── Pass Heuristics ────────────────────────────────────────────────

function scorePassCard(card: Card, hand: Card[], rules: RuleVariants, level: BotDifficulty): number {
  let score = 0;

  // Always pass QoS (level 3+)
  if (isQoS(card)) return 100;

  // Pass high spades (danger of catching QoS)
  if (card.suit === 'spades') {
    if (card.rank === 'A') score += 90;
    if (card.rank === 'K') score += 85;
    if (rules.blackMaria) {
      if (card.rank === 'A') score += 10;
      if (card.rank === 'K') score += 10;
    }
  }

  // Pass high hearts
  if (isHeart(card)) {
    score += 30 + rankVal(card) * 3;
  }

  // Pass high cards in general
  score += rankVal(card) * 2;

  // Keep JoD if enabled (level 4+)
  if (level >= 4 && rules.jackOfDiamonds && card.suit === 'diamonds' && card.rank === 'J') {
    score -= 50;
  }

  // Prefer to void a suit: pass all cards of a short suit (level 5+)
  if (level >= 5) {
    const suitCount = cardsOfSuit(hand, card.suit).length;
    if (suitCount <= 3 && card.suit !== 'hearts') {
      score += 15;
    }
  }

  // Level 7+: consider keeping low spades as QoS bait
  if (level >= 7 && card.suit === 'spades' && rankVal(card) < RANK_VALUE['J']) {
    score -= 10; // prefer keeping low spades to duck under QoS
  }

  return score;
}

// ── Heuristic Scoring by Level ─────────────────────────────────────

function scoreCardForLevel(
  card: Card,
  legalMoves: Card[],
  hand: Card[],
  gameState: GameState,
  playerId: string,
  counter: CardCounter,
  level: BotDifficulty,
): number {
  const trick = gameState.currentTrick;
  const rules = gameState.rules;
  let score = 0;

  // ── Moon shooting logic (level 8+) ──
  if (level >= 8) {
    const iAmShooting = amIShootingTheMoon(gameState, playerId);
    const moonShooter = detectMoonShooter(gameState, playerId);

    if (iAmShooting) {
      // Want to WIN tricks and collect all penalty cards
      score += rankVal(card) * 3;
      if (isHeart(card) || isQoS(card)) score += 10;
      if (trick.length === 0) score += rankVal(card) * 2;
      return score;
    }

    if (moonShooter && trick.length > 0) {
      const leadSuit = trick[0].card.suit;
      if (card.suit === leadSuit) {
        const highestInTrick = Math.max(...trick.map(tc => rankVal(tc.card)));
        if (rankVal(card) > highestInTrick && !isHeart(card) && !isQoS(card)) {
          score += 15; // win the trick to steal a heart from shooter
        }
      }
      if (isHeart(card) && card.suit !== trick[0]?.card.suit) {
        score += 5; // dump heart on trick shooter might not win
      }
    }
  }

  // ── Leading ──
  if (trick.length === 0) {
    if (!isHeart(card) && !isQoS(card)) {
      score += 8 - rankVal(card); // lower = safer lead
    }

    // Level 5+: avoid leading spades when QoS is lurking
    if (level >= 5 && card.suit === 'spades') {
      const hasQueen = hand.some(c => isQoS(c));
      if (hasQueen && rankVal(card) < RANK_VALUE['Q']) {
        score += 5; // flush out higher spades
      } else {
        score -= 3;
      }
    }

    // Level 6+: lead suits where we have few cards to void faster
    if (level >= 6) {
      const suitCount = cardsOfSuit(hand, card.suit).length;
      if (suitCount <= 2) score += 3;
    }

    // Level 9+: lead suits where opponents are strong (force them to take tricks)
    if (level >= 9) {
      const remaining = counter.getRemainingCards(card.suit);
      if (remaining >= 8 && rankVal(card) <= 3) {
        score += 4; // safe low lead in a heavy suit
      }
    }

    return score;
  }

  // ── Following ──
  const leadSuit = trick[0].card.suit;
  const highestInTrick = Math.max(...trick.map(tc =>
    tc.card.suit === leadSuit ? rankVal(tc.card) : -1
  ));
  const trickHasPenalty = trick.some(tc => penaltyPoints(tc.card, rules) > 0);

  if (card.suit === leadSuit) {
    // Following suit
    if (rankVal(card) < highestInTrick) {
      // Play under: safe, we won't win
      score += 10 + rankVal(card); // play highest card that's still safe
    } else {
      // We'd win the trick
      if (trickHasPenalty) {
        score -= 15; // avoid winning penalty cards
      } else if (trick.length === 3) {
        // Last to play, no penalty: safe to win
        score += 5;

        // Level 7+: extra bonus if trick is truly clean
        if (level >= 7) {
          const totalPenaltyInTrick = trick.reduce((s, tc) => s + penaltyPoints(tc.card, rules), 0);
          if (totalPenaltyInTrick === 0) score += 3;
        }
      } else {
        score -= 3; // early position, risky
      }
    }
  } else {
    // Void in lead suit: dump dangerous cards
    if (isQoS(card)) {
      score += 25;
    }
    if (isHeart(card)) {
      score += 10 + rankVal(card); // dump high hearts first
    }
    if (rules.blackMaria && card.suit === 'spades' && (card.rank === 'K' || card.rank === 'A')) {
      score += 20;
    }

    // JoD bonus: keep it if rules enable it (level 4+)
    if (level >= 4 && rules.jackOfDiamonds && card.suit === 'diamonds' && card.rank === 'J') {
      score -= 15;
    }

    // Dump high cards to reduce future danger
    if (!isHeart(card) && !isQoS(card)) {
      score += rankVal(card) * 0.5;
    }
  }

  // ── Card counting adjustments (level 4+) ──
  if (level >= 4) {
    if (card.suit === 'spades' && !counter.hasBeenPlayed('Q_spades')) {
      if (rankVal(card) > RANK_VALUE['Q']) {
        score -= 5; // danger of eating QoS
      }
    }
    const remainingInSuit = counter.getRemainingCards(card.suit);
    if (remainingInSuit <= 3 && card.suit !== 'hearts') {
      score += 2;
    }
  }

  // ── Void-tracking adjustments (level 6+) ──
  if (level >= 6 && trick.length === 0) {
    const voids = inferVoidSuits(gameState, playerId);
    // Avoid leading a suit where an opponent is void (they'll dump hearts/QoS on us)
    for (const [, voidSet] of voids) {
      if (voidSet.has(card.suit)) {
        score -= 6;
        break;
      }
    }
  }

  // ── Probability-based adjustments (level 9+) ──
  if (level >= 9 && card.suit === 'spades' && !counter.hasBeenPlayed('Q_spades')) {
    const voids = inferVoidSuits(gameState, playerId);
    const qProb = estimateCardProbability('Q_spades', 'spades', counter, voids, gameState, playerId);
    if (rankVal(card) > RANK_VALUE['Q']) {
      score -= Math.round(qProb * 10); // scale penalty by probability QoS is out there
    }
  }

  // ── Meta-strategy: shoot the moon consideration (level 10) ──
  if (level >= 10 && trick.length === 0) {
    const me = gameState.players.find(p => p.id === playerId);
    if (me) {
      const myPenalty = countPenaltyCards(me.tricksTaken);
      // If we have 6+ penalty cards early, consider committing to moon shot
      if (myPenalty >= 6 && gameState.trickNumber <= 9) {
        score += rankVal(card) * 2; // prefer high cards to keep winning
        if (isHeart(card)) score += 8;
      }
    }
  }

  return score;
}

// ── Softmax Selection ──────────────────────────────────────────────

function softmaxSelect(scores: Map<Card, number>, temperature: number = 1.0): Card {
  const entries = Array.from(scores.entries());
  if (entries.length === 1) return entries[0][0];

  const maxScore = Math.max(...entries.map(([, s]) => s));
  const exps = entries.map(([card, s]) => {
    const exp = Math.exp((s - maxScore) / temperature);
    return { card, exp };
  });
  const sumExp = exps.reduce((sum, e) => sum + e.exp, 0);

  let r = Math.random() * sumExp;
  for (const { card, exp } of exps) {
    r -= exp;
    if (r <= 0) return card;
  }
  return entries[entries.length - 1][0];
}

/** Pick the card with the highest score deterministically */
function pickBest(scores: Map<Card, number>): Card {
  let best: Card | null = null;
  let bestScore = -Infinity;
  for (const [card, s] of scores) {
    if (s > bestScore) {
      bestScore = s;
      best = card;
    }
  }
  return best!;
}

// ── Temperature per level (lower = more deterministic) ─────────────

function temperatureForLevel(level: BotDifficulty): number {
  // Level 1-2: high randomness, level 9-10: nearly deterministic
  const temps: Record<BotDifficulty, number> = {
    1: 100, 2: 8, 3: 5, 4: 3.5, 5: 2.5,
    6: 2.0, 7: 1.5, 8: 1.0, 9: 0.5, 10: 0.3,
  };
  return temps[level];
}

// ── Main Bot Class ─────────────────────────────────────────────────

export class HeartsBot {
  public readonly nickname: string;
  public readonly difficulty: BotDifficulty;
  private counter: CardCounter;
  private lastTrickCount: number = 0;

  // Track opponent void suits across tricks in a round (level 6+)
  private opponentVoids: Map<string, Set<Suit>> = new Map();

  // Track which cards we played in which situations (for weight updates)
  private roundPlays: { situationHash: string; cardCode: string }[] = [];

  constructor(nickname: string, difficulty: BotDifficulty) {
    this.nickname = nickname;
    this.difficulty = difficulty;
    this.counter = new CardCounter();
  }

  async choosePass(hand: Card[], rules: RuleVariants): Promise<Card[]> {
    await randomDelay();

    // Level 1: completely random pass
    if (this.difficulty === 1) {
      const shuffled = [...hand].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3);
    }

    // Level 2: random but never pass low cards (keeps low, passes high randomly)
    if (this.difficulty === 2) {
      const sorted = [...hand].sort((a, b) => rankVal(b) - rankVal(a));
      // Pass 3 highest cards (simple noob heuristic)
      return sorted.slice(0, 3);
    }

    // Level 3+: heuristic pass with increasing sophistication
    const scored = hand.map(card => ({
      card,
      score: scorePassCard(card, hand, rules, this.difficulty),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Level 10: consider whether hand is good enough to attempt moon shot
    if (this.difficulty >= 10) {
      const highCards = hand.filter(c => rankVal(c) >= RANK_VALUE['Q']);
      const hearts = hand.filter(c => isHeart(c));
      // If we have lots of high cards and hearts, consider keeping them for moon shot
      if (highCards.length >= 5 && hearts.length >= 4) {
        // Pass low cards instead to commit to moon shot
        const lowScored = hand.map(card => ({
          card,
          score: -rankVal(card) + (isHeart(card) ? -10 : 0) + (isQoS(card) ? -20 : 0),
        }));
        lowScored.sort((a, b) => b.score - a.score);
        return lowScored.slice(0, 3).map(s => s.card);
      }
    }

    return scored.slice(0, 3).map(s => s.card);
  }

  async chooseCard(gameState: GameState, playerId: string): Promise<Card> {
    await randomDelay();

    // Update card counter from any new trick cards we haven't tracked
    this.syncCardCounter(gameState);

    // Update opponent void tracking (level 6+)
    if (this.difficulty >= 6) {
      this.updateOpponentVoids(gameState, playerId);
    }

    const me = gameState.players.find(p => p.id === playerId);
    if (!me || me.hand.length === 0) {
      throw new Error('Bot has no cards to play');
    }

    const hand = me.hand;
    const legalMoves = getLegalMoves(hand, gameState);

    if (legalMoves.length === 1) return legalMoves[0];

    // Level 1 — Случайный: plays completely random valid card
    if (this.difficulty === 1) {
      return pickRandom(legalMoves);
    }

    // Level 2 — Новичок: avoids playing hearts if possible, otherwise random
    if (this.difficulty === 2) {
      const nonHearts = legalMoves.filter(c => !isHeart(c));
      if (nonHearts.length > 0) return pickRandom(nonHearts);
      return pickRandom(legalMoves);
    }

    // Level 3 — Любитель: avoids Q♠, prefers low cards, avoids hearts
    if (this.difficulty === 3) {
      // Sort by: avoid QoS first, then prefer low cards, avoid hearts
      const scored = new Map<Card, number>();
      for (const card of legalMoves) {
        let s = 0;
        if (isQoS(card)) s -= 20;
        if (isHeart(card)) s -= 5;
        s -= rankVal(card); // prefer low cards
        scored.set(card, s);
      }
      return softmaxSelect(scored, temperatureForLevel(3));
    }

    // Level 4-10: use heuristic scoring with increasing sophistication
    const hScores = new Map<Card, number>();
    for (const card of legalMoves) {
      hScores.set(card, scoreCardForLevel(card, legalMoves, hand, gameState, playerId, this.counter, this.difficulty));
    }

    // Level 4 — Казуал: basic card counting, moderate randomness
    // Level 5 — Средний: avoids giving points, tracks high cards
    // (Both use heuristic scores with softmax at their temperature)
    if (this.difficulty <= 6) {
      return softmaxSelect(hScores, temperatureForLevel(this.difficulty));
    }

    // Level 7+ — use adaptive weights from DB combined with heuristics
    const situationHash = computeSituationHash(gameState, hand);
    const codes = legalMoves.map(c => cardCode(c));
    const weights = await BotWeights.getWeights(situationHash, codes, String(this.difficulty));

    const combinedScores = new Map<Card, number>();
    for (const card of legalMoves) {
      const h = hScores.get(card) ?? 0;
      const w = weights.get(cardCode(card)) ?? 0.5;
      // Higher levels weight the learned data more heavily
      const weightInfluence = this.difficulty >= 9 ? 1.5 : 1.0;
      combinedScores.set(card, h * (w * weightInfluence));
    }

    // Record for later weight update
    const chosen = this.difficulty >= 10
      ? pickBest(combinedScores) // Level 10: deterministic best play
      : softmaxSelect(combinedScores, temperatureForLevel(this.difficulty));

    this.roundPlays.push({
      situationHash,
      cardCode: cardCode(chosen),
    });

    return chosen;
  }

  async onRoundComplete(roundScores: Record<string, number>, playerId: string): Promise<void> {
    // Reset card counter and void tracking for next round
    this.counter.reset();
    this.lastTrickCount = 0;
    this.opponentVoids.clear();

    // Only level 7+ bots update weights
    if (this.difficulty < 7 || this.roundPlays.length === 0) {
      this.roundPlays = [];
      return;
    }

    const myScore = roundScores[playerId] ?? 0;

    const updates = this.roundPlays.map(play =>
      BotWeights.updateWeight(play.situationHash, play.cardCode, String(this.difficulty), myScore)
    );
    await Promise.all(updates);

    this.roundPlays = [];
  }

  private syncCardCounter(gameState: GameState): void {
    // Only level 4+ bots use card counting
    if (this.difficulty < 4) return;

    let totalTricks = 0;
    for (const player of gameState.players) {
      totalTricks += player.tricksTaken.length;
    }

    if (totalTricks > this.lastTrickCount) {
      this.counter.reset();
      for (const player of gameState.players) {
        for (const trick of player.tricksTaken) {
          for (const card of trick) {
            this.counter.recordPlay(card);
          }
        }
      }
      for (const tc of gameState.currentTrick) {
        this.counter.recordPlay(tc.card);
      }
      this.lastTrickCount = totalTricks;
    } else {
      for (const tc of gameState.currentTrick) {
        if (!this.counter.hasBeenPlayed(tc.card.id)) {
          this.counter.recordPlay(tc.card);
        }
      }
    }
  }

  private updateOpponentVoids(gameState: GameState, myId: string): void {
    if (gameState.currentTrick.length < 2) return;
    const leadSuit = gameState.currentTrick[0].card.suit;
    for (let i = 1; i < gameState.currentTrick.length; i++) {
      const tc = gameState.currentTrick[i];
      if (tc.card.suit !== leadSuit && tc.playerId !== myId) {
        if (!this.opponentVoids.has(tc.playerId)) {
          this.opponentVoids.set(tc.playerId, new Set());
        }
        this.opponentVoids.get(tc.playerId)!.add(leadSuit);
      }
    }
  }
}
