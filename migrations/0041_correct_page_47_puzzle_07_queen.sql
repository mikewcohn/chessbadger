-- The Steps 2 workbook shows Black's queen on g6 in puzzle 47.7.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5rk1/p1p2ppp/1p4q1/3P2n1/2N5/2Q2P2/PP2r1PP/R4R1K b - - 0 1'
)
WHERE id = 'page-47-puzzle-07';
