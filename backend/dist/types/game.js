"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANK_ORDER = exports.DEFAULT_RULES = exports.BOT_DIFFICULTY_NAMES = void 0;
exports.parseBotDifficulty = parseBotDifficulty;
/** Backward-compatible mapping from legacy string values */
function parseBotDifficulty(value) {
    if (typeof value === 'number' && value >= 1 && value <= 10)
        return value;
    switch (value) {
        case 'easy': return 2;
        case 'medium': return 5;
        case 'hard': return 8;
        default: return 5;
    }
}
exports.BOT_DIFFICULTY_NAMES = {
    1: 'Случайный',
    2: 'Новичок',
    3: 'Любитель',
    4: 'Казуал',
    5: 'Средний',
    6: 'Опытный',
    7: 'Продвинутый',
    8: 'Эксперт',
    9: 'Мастер',
    10: 'Гроссмейстер',
};
exports.DEFAULT_RULES = {
    jackOfDiamonds: false,
    tenOfClubsDoubles: false,
    noHeartBreak: false,
    queenBreaksHearts: false,
    moonGivesNegative: false,
    shootTheSun: false,
    bloodOnTheMoon: false,
    blackMaria: false,
    omnibusHearts: false,
    passDirection: 'left',
    endScore: 100,
};
exports.RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
//# sourceMappingURL=game.js.map