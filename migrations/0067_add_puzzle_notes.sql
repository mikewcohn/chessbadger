CREATE TABLE puzzle_notes (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  note TEXT NOT NULL CHECK (length(note) <= 4096),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, puzzle_id)
);

CREATE INDEX puzzle_notes_puzzle_id ON puzzle_notes(puzzle_id);
