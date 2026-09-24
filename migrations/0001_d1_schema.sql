CREATE TABLE puzzle_collections (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE puzzle_sections (
  collection_slug TEXT NOT NULL REFERENCES puzzle_collections(slug),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  workbook_pages TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (collection_slug, slug),
  UNIQUE (collection_slug, sort_order)
);

CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,
  collection_slug TEXT NOT NULL REFERENCES puzzle_collections(slug),
  section_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  section_sort_order INTEGER NOT NULL,
  definition_json TEXT NOT NULL CHECK (json_valid(definition_json)),
  FOREIGN KEY (collection_slug, section_slug) REFERENCES puzzle_sections(collection_slug, slug),
  CHECK (json_extract(definition_json, '$.id') = id),
  UNIQUE (collection_slug, sort_order),
  UNIQUE (collection_slug, section_slug, section_sort_order)
);

CREATE TABLE practice_attempts (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id),
  puzzle_title TEXT NOT NULL,
  move TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('correct', 'incorrect', 'answer-viewed')),
  checked_at TEXT NOT NULL,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  pause_count INTEGER CHECK (pause_count >= 0),
  restart_count INTEGER CHECK (restart_count >= 0)
);
CREATE INDEX practice_attempts_checked_at ON practice_attempts(checked_at, id);
CREATE INDEX practice_attempts_puzzle_id ON practice_attempts(puzzle_id);
