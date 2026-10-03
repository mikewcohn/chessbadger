-- Correct Page 16 Puzzle 8: White queen on c2 and White king on c1.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '6b1/8/8/8/7r/8/2Q5/2K5 b - - 0 1'
)
WHERE id = 'page-16-puzzle-08';
