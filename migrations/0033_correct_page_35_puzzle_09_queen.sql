-- The Steps 2 workbook shows Black's queen on f1 in puzzle 35.9.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/6k1/1B4p1/P1ppb3/6PQ/1P1P3P/2PK4/5q2 b - - 0 1'
)
WHERE id = 'page-35-puzzle-09';
