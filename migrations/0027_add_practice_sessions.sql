ALTER TABLE practice_attempts ADD COLUMN session_id TEXT;

CREATE INDEX practice_attempts_player_puzzle_session
  ON practice_attempts(player_id, puzzle_id, session_id, checked_at, id);
