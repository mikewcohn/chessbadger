-- The Steps 2 workbook shows a Black queen on h4 in puzzle 53.4.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen',
  '8/6k1/1B4p1/P1ppb3/6Pq/1P1P3P/2PK4/5Q2 b - - 0 1'
)
WHERE id = 'page-53-puzzle-04';
