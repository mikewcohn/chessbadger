UPDATE puzzles
SET definition_json = json_remove(definition_json, '$.instruction')
WHERE id = 'chess-steps-2-mix-page-7-puzzle-08';
