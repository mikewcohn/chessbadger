-- Correct Page 21 Puzzle 5: the Black rook is on e4, not e5.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '6k1/6pb/1p3p2/8/4r3/2P2KB1/1P3P2/7R w - - 0 1'
)
WHERE id = 'page-21-puzzle-05';
