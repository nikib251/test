-- Daily Bonus System Migration
-- Adds coins, streak tracking, and bonus claim history to players table

BEGIN;

ALTER TABLE players ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_bonus_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_bonus_claimed INTEGER NOT NULL DEFAULT 0;

COMMIT;
