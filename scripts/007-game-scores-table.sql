-- Create game_scores table for storing user game results
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  game_id VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_game_scores_user_game ON game_scores(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_created ON game_scores(created_at);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);

-- Add constraint to ensure score is non-negative
ALTER TABLE game_scores ADD CONSTRAINT check_score_positive CHECK (score >= 0);
