-- The workbook prints Qxe5+, but the bishop on g7 blocks the queen's line to
-- the king on h8. Accept chess.js's legal SAN for this one-move alternative.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.solutionLines', json('[["Rxh6+","Bxh6","Qxe5+"],["Qxe5"]]')
)
WHERE id = 'page-39-puzzle-07';
