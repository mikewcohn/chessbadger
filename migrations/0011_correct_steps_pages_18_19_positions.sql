-- Correct the Page 18 and Page 19 positions against the rendered workbook PNGs.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'k6r/p4p2/3p2p1/3r3p/8/2P2PP1/1P2Q2P/6K1 w - - 0 1'
)
WHERE id = 'page-18-puzzle-01';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'r4rk1/pp3ppp/8/2PR4/b4B2/6P1/1P3PKP/5R2 b - - 0 1'
)
WHERE id = 'page-19-puzzle-04';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '7k/1p4p1/p6p/2b1pP2/2Pq4/1B6/P4QPP/5RK1 b - - 0 1',
  '$.answers[0]', 'Qd6'
)
WHERE id = 'page-19-puzzle-05';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '4r1k1/2q1bppp/p7/1p3P2/2p5/P1P1QB1P/1P4P1/5RK1 b - - 0 1',
  '$.answers[0]', 'Bc5'
)
WHERE id = 'page-19-puzzle-06';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '7r/1r2npp1/k2p3p/pq1Pp3/1p2P3/7B/PP2QP1P/2R1R1K1 w - - 0 1'
)
WHERE id = 'page-19-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5rk1/ppq2ppp/2pn4/6N1/2P5/3r1P2/PP3RPP/R3Q1K1 w - - 0 1'
)
WHERE id = 'page-19-puzzle-10';
