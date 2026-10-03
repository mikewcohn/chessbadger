-- Correct the Page 17 "Setting up a pin: A" positions against the workbook.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '1n2k1nr/5ppp/4p3/3p4/3P4/2PB1N2/5PPP/6K1 w - - 0 1'
)
WHERE id = 'page-17-puzzle-01';

UPDATE puzzles
SET definition_json = json_set(definition_json, '$.piece', 'bQ')
WHERE id = 'page-17-puzzle-03';

UPDATE puzzles
SET definition_json = json_set(definition_json, '$.piece', 'bR')
WHERE id = 'page-17-puzzle-04';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '6k1/1R3p2/p5p1/7p/8/6P1/1P3PKP/R7 b - - 0 1'
)
WHERE id = 'page-17-puzzle-06';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'k7/p7/1pr1p3/5p1b/8/6Pp/PP3P1P/5RK1 w - - 0 1'
)
WHERE id = 'page-17-puzzle-07';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '2R5/1p2kppp/4b3/3p4/1n1P3P/1P3BP1/5PK1/8 w - - 0 1'
)
WHERE id = 'page-17-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5r2/5pk1/1p4pp/pP3n2/P1B2N2/5P2/5P1P/2R3K1 b - - 0 1'
)
WHERE id = 'page-17-puzzle-11';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'k2r4/qp3pp1/2p1bn2/7r/8/P1B2N2/1PQ2PPP/5RK1 w - - 0 1'
)
WHERE id = 'page-17-puzzle-12';
