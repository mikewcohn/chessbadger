CREATE TABLE players (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  normalized_handle TEXT NOT NULL UNIQUE,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE player_sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX player_sessions_expires_at ON player_sessions(expires_at);

ALTER TABLE practice_attempts ADD COLUMN player_id TEXT REFERENCES players(id);
CREATE INDEX practice_attempts_player_id_checked_at
  ON practice_attempts(player_id, checked_at, id);
