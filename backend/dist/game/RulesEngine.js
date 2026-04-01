"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesEngine = void 0;
const game_1 = require("../types/game");
class RulesEngine {
    /**
     * Get the rank value for comparison (higher = better)
     */
    static rankValue(rank) {
        return game_1.RANK_ORDER.indexOf(rank);
    }
    /**
     * Determine who has the 2 of clubs (leads first trick)
     */
    static findTwoOfClubsHolder(players) {
        for (const player of players) {
            if (player.hand.some(c => c.id === '2_clubs')) {
                return player.id;
            }
        }
        return null;
    }
    /**
     * Get valid cards a player can play
     */
    static getValidCards(hand, currentTrick, trickNumber, heartsBroken, rules, isFirstTrick) {
        // First card of first trick must be 2 of clubs
        if (isFirstTrick && currentTrick.length === 0) {
            const twoOfClubs = hand.find(c => c.id === '2_clubs');
            return twoOfClubs ? [twoOfClubs] : hand;
        }
        // Must follow suit if possible
        if (currentTrick.length > 0) {
            const leadSuit = currentTrick[0].card.suit;
            const suitCards = hand.filter(c => c.suit === leadSuit);
            if (suitCards.length > 0) {
                return suitCards;
            }
            // Can't follow suit - can play anything, but on first trick no points cards
            if (isFirstTrick) {
                const nonPointCards = hand.filter(c => !this.isPointCard(c, rules));
                return nonPointCards.length > 0 ? nonPointCards : hand;
            }
            return hand;
        }
        // Leading a trick
        if (rules.noHeartBreak) {
            // Can lead hearts anytime
            return hand;
        }
        if (!heartsBroken) {
            // Can't lead hearts unless hearts broken or only hearts in hand
            const nonHearts = hand.filter(c => c.suit !== 'hearts');
            return nonHearts.length > 0 ? nonHearts : hand;
        }
        return hand;
    }
    /**
     * Check if a card is a point card
     */
    static isPointCard(card, rules) {
        if (card.suit === 'hearts')
            return true;
        if (card.id === 'Q_spades')
            return true;
        if (rules.blackMaria) {
            if (card.id === 'K_spades' || card.id === 'A_spades')
                return true;
        }
        return false;
    }
    /**
     * Determine the winner of a trick
     */
    static determineTrickWinner(trick) {
        const leadSuit = trick[0].card.suit;
        let winner = trick[0];
        for (let i = 1; i < trick.length; i++) {
            const tc = trick[i];
            if (tc.card.suit === leadSuit && this.rankValue(tc.card.rank) > this.rankValue(winner.card.rank)) {
                winner = tc;
            }
        }
        return winner;
    }
    /**
     * Check if playing a card breaks hearts
     */
    static doesBreakHearts(card, rules) {
        if (card.suit === 'hearts')
            return true;
        if (rules.queenBreaksHearts && card.id === 'Q_spades')
            return true;
        return false;
    }
    /**
     * Calculate round scores for all players
     */
    static calculateRoundScores(players, rules) {
        const scores = {};
        // First compute raw point-card scores
        for (const player of players) {
            let score = 0;
            const allCards = player.tricksTaken.flat();
            for (const card of allCards) {
                if (card.suit === 'hearts') {
                    score += 1;
                }
                if (card.id === 'Q_spades') {
                    score += 13;
                }
                if (rules.blackMaria) {
                    if (card.id === 'K_spades')
                        score += 10;
                    if (card.id === 'A_spades')
                        score += 7;
                }
            }
            scores[player.id] = score;
        }
        // Check for Shoot the Moon
        const moonShooter = this.detectMoonShooter(players, rules);
        if (moonShooter) {
            // Check for Shoot the Sun (won all 13 tricks)
            const shooterPlayer = players.find(p => p.id === moonShooter);
            const isSunShot = rules.shootTheSun && shooterPlayer.tricksTaken.length === 13;
            if (rules.moonGivesNegative) {
                // Shooter gets -26 (or -52 for sun)
                const bonus = isSunShot ? -52 : -26;
                for (const player of players) {
                    scores[player.id] = player.id === moonShooter ? bonus : 0;
                }
            }
            else {
                // Others get +26 (or +52 for sun)
                const penalty = isSunShot ? 52 : 26;
                for (const player of players) {
                    scores[player.id] = player.id === moonShooter ? 0 : penalty;
                }
            }
        }
        // Jack of Diamonds bonus (or omnibus)
        if (rules.jackOfDiamonds || rules.omnibusHearts) {
            for (const player of players) {
                const allCards = player.tricksTaken.flat();
                if (allCards.some(c => c.id === 'J_diamonds')) {
                    scores[player.id] -= 10;
                }
            }
        }
        // Blood on the Moon penalty
        if (rules.bloodOnTheMoon) {
            for (const player of players) {
                const allCards = player.tricksTaken.flat();
                const hasHeart = allCards.some(c => c.suit === 'hearts');
                if (!hasHeart) {
                    scores[player.id] += 5;
                }
            }
        }
        // Ten of Clubs doubles final score
        if (rules.tenOfClubsDoubles) {
            for (const player of players) {
                const allCards = player.tricksTaken.flat();
                if (allCards.some(c => c.id === '10_clubs')) {
                    scores[player.id] *= 2;
                }
            }
        }
        return scores;
    }
    /**
     * Detect if a player shot the moon (took all hearts + Q of spades)
     */
    static detectMoonShooter(players, rules) {
        for (const player of players) {
            const allCards = player.tricksTaken.flat();
            const heartsCount = allCards.filter(c => c.suit === 'hearts').length;
            const hasQueen = allCards.some(c => c.id === 'Q_spades');
            if (heartsCount === 13 && hasQueen) {
                // For blackMaria, must also have K and A of spades
                if (rules.blackMaria) {
                    const hasKing = allCards.some(c => c.id === 'K_spades');
                    const hasAce = allCards.some(c => c.id === 'A_spades');
                    if (!hasKing || !hasAce)
                        continue;
                }
                return player.id;
            }
        }
        return null;
    }
    /**
     * Resolve pass direction for a given round
     */
    static resolvePassDirection(rules, round) {
        const dir = rules.passDirection;
        if (dir === 'random') {
            const options = ['left', 'right', 'across', 'none'];
            return options[Math.floor(Math.random() * options.length)];
        }
        if (dir === 'left' || dir === 'right' || dir === 'across' || dir === 'none') {
            // Standard rotation: left, right, across, none
            if (dir === 'left') {
                const cycle = ['left', 'right', 'across', 'none'];
                return cycle[(round - 1) % 4];
            }
            if (dir === 'right') {
                // Always right
                return 'right';
            }
            if (dir === 'across') {
                // Always across
                return 'across';
            }
            // 'none' = no passing ever
            return 'none';
        }
        // Default rotation
        const cycle = ['left', 'right', 'across', 'none'];
        return cycle[(round - 1) % 4];
    }
    /**
     * Get the pass target player index based on direction
     */
    static getPassTarget(playerIndex, direction, totalPlayers) {
        switch (direction) {
            case 'left':
                return (playerIndex + 1) % totalPlayers;
            case 'right':
                return (playerIndex - 1 + totalPlayers) % totalPlayers;
            case 'across':
                return (playerIndex + 2) % totalPlayers;
            case 'none':
                return playerIndex; // should not be called
        }
    }
    /**
     * Check if a specific card play is valid
     */
    static isValidPlay(card, hand, currentTrick, trickNumber, heartsBroken, rules, isFirstTrick) {
        const validCards = this.getValidCards(hand, currentTrick, trickNumber, heartsBroken, rules, isFirstTrick);
        return validCards.some(c => c.id === card.id);
    }
}
exports.RulesEngine = RulesEngine;
//# sourceMappingURL=RulesEngine.js.map