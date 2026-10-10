-- The Steps 2 workbook shows Black's queen on e6 in puzzle 47.4.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'r4rk1/1p3pbp/pn1pq3/6P1/3P4/1PN1BQ1R/1P5P/R6K w - - 0 1'
)
WHERE id = 'page-47-puzzle-04';
