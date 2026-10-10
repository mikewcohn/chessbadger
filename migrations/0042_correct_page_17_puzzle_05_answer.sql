-- Page 17 Puzzle 5 sets up a pin only when the bishop is placed on c5.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers', json('["c5"]')
)
WHERE id = 'page-17-puzzle-05';
