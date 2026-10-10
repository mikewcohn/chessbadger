-- The Steps 2 workbook shows White's queen on c3 in puzzle 34.12.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '6r1/1p1q1p1k/2p3p1/8/1P3PRp/P1Q1b2P/4N1KP/4R3 b - - 0 1'
)
WHERE id = 'page-34-puzzle-12';
