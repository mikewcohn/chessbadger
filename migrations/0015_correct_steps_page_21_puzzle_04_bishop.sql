-- Correct Page 21 Puzzle 4: the bishop on g7 is White.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/1p4Bk/2p4p/2Pn4/8/1P6/r5RP/7K b - - 0 1'
)
WHERE id = 'page-21-puzzle-04';
