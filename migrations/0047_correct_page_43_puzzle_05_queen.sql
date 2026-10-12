-- The Steps 2 workbook shows a White queen on a8 in puzzle 43.5.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen',
  'Q7/5ppk/1p5p/b2N1q2/4p3/P3P2P/2r2PP1/5RK1 w - - 0 1'
)
WHERE id = 'page-43-puzzle-05';
