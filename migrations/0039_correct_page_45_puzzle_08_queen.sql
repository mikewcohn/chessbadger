-- The Steps 2 workbook shows White's queen on a1 in puzzle 45.8.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/8/2qkp3/4b3/3p4/4P3/4K3/Q5R1 b - - 0 1'
)
WHERE id = 'page-45-puzzle-08';
