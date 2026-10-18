UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.givenLine', '1.Ne5' || char(10) || '1..._____'
)
WHERE id = 'chess-steps-2-mix-page-6-puzzle-07';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.givenLine', '1...g6+' || char(10) || '2.fxg6+ _____'
)
WHERE id = 'chess-steps-2-mix-page-7-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.givenLine', '1.Bxc6+' || char(10) || '1...bxc6' || char(10) || '2._____'
)
WHERE id = 'chess-steps-2-mix-page-8-puzzle-08';
