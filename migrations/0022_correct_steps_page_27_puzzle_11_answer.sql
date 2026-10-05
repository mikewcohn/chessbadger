-- With the Black queen on d7, Bb5 pins the queen but does not give check.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers',
  json('["Bb5"]')
)
WHERE id = 'page-27-puzzle-11';
