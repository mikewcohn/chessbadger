CREATE TABLE player_insights (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  note TEXT NOT NULL CHECK (length(note) <= 12000),
  pgn TEXT NOT NULL CHECK (length(pgn) BETWEEN 1 AND 100000),
  focus_ply INTEGER NOT NULL DEFAULT 0 CHECK (focus_ply >= 0),
  board_orientation TEXT NOT NULL DEFAULT 'white'
    CHECK (board_orientation IN ('white', 'black')),
  side TEXT NOT NULL DEFAULT 'both'
    CHECK (side IN ('white', 'black', 'both')),
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (length(tags_json) <= 2000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX player_insights_player_updated
  ON player_insights(player_id, updated_at DESC, id);
