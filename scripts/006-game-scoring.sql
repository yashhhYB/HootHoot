-- Game scoring and leaderboard tables for Hoot-Hoot

-- Game scores table for tracking user performance
CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard view for easier querying
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT gs.game_id) as games_played,
  SUM(gs.score) as total_score,
  AVG(gs.score) as avg_score,
  MAX(gs.created_at) as last_played
FROM app_users u
LEFT JOIN game_scores gs ON u.id = gs.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_score DESC NULLS LAST;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at);
