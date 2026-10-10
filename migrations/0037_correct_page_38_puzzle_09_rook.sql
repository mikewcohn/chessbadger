-- The Steps 2 workbook shows White's rook on g5 in puzzle 38.9.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5k2/8/8/3K2R1/8/8/8/8 w - - 0 1'
)
WHERE id = 'page-38-puzzle-09';
