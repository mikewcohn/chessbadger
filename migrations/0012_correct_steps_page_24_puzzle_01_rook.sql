-- Correct the a1 rook in Page 24 Puzzle 1 to White, as shown in the workbook.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '1r3rk1/1pb2ppp/8/1P2n3/2p5/2B4P/5PP1/R2R1BK1 w - - 0 1'
)
WHERE id = 'page-24-puzzle-01';
