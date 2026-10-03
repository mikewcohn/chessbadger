-- Add the missing White queen on c1.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '6b1/8/8/8/7r/8/2K5/2Q5 b - - 0 1'
)
WHERE id = 'page-16-puzzle-08';
