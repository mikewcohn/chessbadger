-- Correct Page 16 Puzzle 11: the queen on g3 is White.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/6b1/2n5/8/8/6Q1/7K/8 b - - 0 1'
)
WHERE id = 'page-16-puzzle-11';
