UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.instruction', 'Move the bishop, avoiding capture, until playing a check.'
)
WHERE id = 'chess-steps-2-mix-page-4-puzzle-07';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.validation', 'checkmate'
)
WHERE id = 'chess-steps-2-mix-page-5-puzzle-03';
