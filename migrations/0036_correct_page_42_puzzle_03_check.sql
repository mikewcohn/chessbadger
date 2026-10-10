-- Moving the rook to d7 checks the Black king in Steps 2 puzzle 42.3.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers', json('["Rd7+"]')
)
WHERE id = 'page-42-puzzle-03';
