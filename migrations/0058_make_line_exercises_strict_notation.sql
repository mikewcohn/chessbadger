UPDATE puzzles
SET definition_json = json_remove(
  json_set(
    definition_json,
    '$.answerMode', 'notation',
    '$.givenLine', '1. Ne5 1... _____'
  ),
  '$.sideToMove'
)
WHERE id = 'chess-steps-2-mix-page-6-puzzle-07';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answerMode', 'notation',
  '$.givenLine', '1... g6+ 2. fxg6+ 2... _____'
)
WHERE id = 'chess-steps-2-mix-page-7-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answerMode', 'notation',
  '$.givenLine', '1. Bxc6+ bxc6 2. _____'
)
WHERE id = 'chess-steps-2-mix-page-8-puzzle-08';
