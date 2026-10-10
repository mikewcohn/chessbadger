-- The Steps 2 workbook shows White's queen on a2 in puzzle 38.3.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/8/8/8/8/2k5/Q7/2r5 b - - 0 1'
)
WHERE id = 'page-38-puzzle-03';
