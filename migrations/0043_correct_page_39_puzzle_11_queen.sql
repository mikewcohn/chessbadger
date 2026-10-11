-- The Steps 2 workbook shows Black's queen on f3 in puzzle 39.11.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '1k6/p4p2/Bp5p/2p5/8/P1Q2q1P/1PP2rr1/1KR5 w - - 0 1'
)
WHERE id = 'page-39-puzzle-11';
