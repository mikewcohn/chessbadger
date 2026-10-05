-- The corrected position does not give check after 1...d4, so its SAN has no check suffix.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers',
  json('["d4"]')
)
WHERE id = 'page-24-puzzle-06';
