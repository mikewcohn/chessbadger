CREATE INDEX practice_attempts_player_puzzle_checked_at
  ON practice_attempts(player_id, puzzle_id, checked_at, id);
