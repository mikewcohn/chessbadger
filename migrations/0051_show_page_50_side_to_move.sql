-- Page 50 has a custom instruction, so include the side to move in that displayed copy.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.instruction', CASE json_extract(definition_json, '$.sideToMove')
    WHEN 'white' THEN 'White to move. Find a move that prevents mate.'
    ELSE 'Black to move. Find a move that prevents mate.'
  END
)
WHERE id BETWEEN 'page-50-puzzle-01' AND 'page-50-puzzle-11';
