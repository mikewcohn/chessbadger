-- The Steps 2 workbook shows Black's queen on g8 in puzzle 45.6.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'k5q1/p4R2/1p1r4/8/8/1Q3P2/8/5K2 w - - 0 1'
)
WHERE id = 'page-45-puzzle-06';
