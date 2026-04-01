-- Hearts Card Game — Initial Schema Migration
-- Run against: hearts_db (PostgreSQL 15+)

BEGIN;

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. PLAYERS
-- =============================================================================

CREATE TABLE players (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname    TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_games INT         NOT NULL DEFAULT 0,
    wins        INT         NOT NULL DEFAULT 0,
    losses      INT         NOT NULL DEFAULT 0,
    total_score INT         NOT NULL DEFAULT 0,

    CONSTRAINT chk_total_games_non_negative CHECK (total_games >= 0),
    CONSTRAINT chk_wins_non_negative        CHECK (wins >= 0),
    CONSTRAINT chk_losses_non_negative      CHECK (losses >= 0),
    CONSTRAINT chk_wins_losses_le_total     CHECK (wins + losses <= total_games)
);

COMMENT ON TABLE  players              IS 'Persistent player profiles keyed by unique nickname.';
COMMENT ON COLUMN players.total_score  IS 'Cumulative score across all completed games (lower is better in Hearts).';

-- Leaderboard queries sort by wins / total_games
CREATE INDEX idx_players_wins        ON players (wins DESC);
CREATE INDEX idx_players_total_games ON players (total_games DESC);

-- =============================================================================
-- 3. GAME SESSIONS
-- =============================================================================

CREATE TABLE game_sessions (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    status           TEXT        NOT NULL DEFAULT 'waiting',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at      TIMESTAMPTZ,
    rule_variants    JSONB       NOT NULL DEFAULT '{}'::JSONB,
    winning_nickname TEXT,
    round_scores     JSONB       NOT NULL DEFAULT '[]'::JSONB,

    CONSTRAINT chk_status CHECK (status IN ('waiting', 'playing', 'finished', 'abandoned'))
);

COMMENT ON TABLE  game_sessions               IS 'One row per game. Lives in Redis while active; persisted here on completion.';
COMMENT ON COLUMN game_sessions.rule_variants  IS 'RuleVariants JSONB — jackOfDiamonds, bloodOnTheMoon, endScore, etc.';
COMMENT ON COLUMN game_sessions.round_scores   IS 'Array of per-round score objects: [{ "playerId": score, ... }, ...]';
COMMENT ON COLUMN game_sessions.winning_nickname IS 'Nickname of the winner (lowest score at game end).';

CREATE INDEX idx_game_sessions_status     ON game_sessions (status);
CREATE INDEX idx_game_sessions_created_at ON game_sessions (created_at DESC);

-- =============================================================================
-- 4. GAME RESULTS
-- =============================================================================

CREATE TABLE game_results (
    id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id       UUID    NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    nickname      TEXT    NOT NULL,
    score         INT     NOT NULL,
    placement     INT     NOT NULL,
    hearts_taken  INT     NOT NULL DEFAULT 0,
    queen_taken   BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_placement_range     CHECK (placement BETWEEN 1 AND 4),
    CONSTRAINT chk_hearts_taken_range  CHECK (hearts_taken BETWEEN 0 AND 13)
);

COMMENT ON TABLE  game_results             IS 'Per-player result row for each completed game.';
COMMENT ON COLUMN game_results.placement   IS '1 = winner (lowest score), 4 = last place.';
COMMENT ON COLUMN game_results.hearts_taken IS 'Total heart cards collected across all rounds.';
COMMENT ON COLUMN game_results.queen_taken  IS 'Whether the player took Queen of Spades in any round.';

-- Look up a player''s game history
CREATE INDEX idx_game_results_nickname ON game_results (nickname);
-- Look up all results for a given game
CREATE INDEX idx_game_results_game_id  ON game_results (game_id);

-- =============================================================================
-- 5. BOT CARD WEIGHTS (adaptive learning)
-- =============================================================================

CREATE TABLE bot_card_weights (
    situation_hash VARCHAR(20)  NOT NULL,
    card_code      VARCHAR(3)   NOT NULL,
    difficulty     TEXT         NOT NULL,
    weight         FLOAT        NOT NULL DEFAULT 0.5,
    play_count     INT          NOT NULL DEFAULT 0,
    version        SMALLINT     NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (situation_hash, card_code, difficulty),

    CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT chk_weight_range CHECK (weight >= 0.0 AND weight <= 1.0),
    CONSTRAINT chk_play_count_non_negative CHECK (play_count >= 0)
);

COMMENT ON TABLE  bot_card_weights                IS 'Adaptive bot learning table. Weights drive card selection probability.';
COMMENT ON COLUMN bot_card_weights.situation_hash  IS 'Hash encoding game situation (e.g. trick position, hearts broken, cards seen).';
COMMENT ON COLUMN bot_card_weights.card_code       IS 'Compact card code: rank + suit initial, e.g. QS, 10H, 2C.';
COMMENT ON COLUMN bot_card_weights.weight          IS 'Selection weight 0.0–1.0. Higher = more likely to play.';
COMMENT ON COLUMN bot_card_weights.version         IS 'Schema version for weight format — allows future migration of weight semantics.';

-- Query weights for a specific difficulty
CREATE INDEX idx_bot_weights_difficulty ON bot_card_weights (difficulty);
-- Prune or inspect stale weights
CREATE INDEX idx_bot_weights_updated   ON bot_card_weights (updated_at);

-- =============================================================================
-- 6. GAME RULES PRESETS
-- =============================================================================

CREATE TABLE game_rules_presets (
    id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name  TEXT NOT NULL UNIQUE,
    rules JSONB NOT NULL DEFAULT '{}'::JSONB
);

COMMENT ON TABLE game_rules_presets IS 'Named rule presets players can select when creating a lobby.';

-- Seed default presets
INSERT INTO game_rules_presets (name, rules) VALUES
(
    'Standard',
    '{
        "jackOfDiamonds": false,
        "tenOfClubsDoubles": false,
        "noHeartBreak": false,
        "queenBreaksHearts": false,
        "moonGivesNegative": false,
        "shootTheSun": false,
        "bloodOnTheMoon": false,
        "blackMaria": false,
        "omnibusHearts": false,
        "passDirection": "left",
        "endScore": 100
    }'::JSONB
),
(
    'Omnibus Hearts',
    '{
        "jackOfDiamonds": true,
        "tenOfClubsDoubles": true,
        "noHeartBreak": false,
        "queenBreaksHearts": true,
        "moonGivesNegative": true,
        "shootTheSun": true,
        "bloodOnTheMoon": false,
        "blackMaria": false,
        "omnibusHearts": true,
        "passDirection": "left",
        "endScore": 100
    }'::JSONB
),
(
    'Black Maria',
    '{
        "jackOfDiamonds": false,
        "tenOfClubsDoubles": false,
        "noHeartBreak": false,
        "queenBreaksHearts": true,
        "moonGivesNegative": false,
        "shootTheSun": false,
        "bloodOnTheMoon": false,
        "blackMaria": true,
        "omnibusHearts": false,
        "passDirection": "left",
        "endScore": 100
    }'::JSONB
);

COMMIT;
