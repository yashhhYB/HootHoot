-- Create game_scores table for tracking user game attempts
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  game_id VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_game ON game_scores(user_id, game_id);

-- Create composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard 
  ON game_scores(game_id, score DESC, created_at DESC);
