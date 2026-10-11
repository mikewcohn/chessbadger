-- The Steps 2 workbook shows White's queen on e3 in puzzle 40.12.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '1r4k1/2q2p2/p5pp/nppr1b1N/5P1P/P3Q3/1PP5/2K1RBR1 w - - 0 1'
)
WHERE id = 'page-40-puzzle-12';
