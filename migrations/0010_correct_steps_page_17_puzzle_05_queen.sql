-- Correct Page 17 Puzzle 5: the queen on f2 is White.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '2q2r1k/p5p1/1p5p/4p3/7P/5N2/PP2RQP1/6K1 b - - 0 1'
)
WHERE id = 'page-17-puzzle-05';
