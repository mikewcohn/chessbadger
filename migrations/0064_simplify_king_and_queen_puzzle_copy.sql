UPDATE puzzles
SET definition_json = json_remove(
  json_set(definition_json, '$.title', 'Puzzle 1'),
  '$.instruction'
)
WHERE id = 'king-and-queen-01';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(definition_json, '$.title', 'Puzzle 2'),
  '$.instruction'
)
WHERE id = 'king-and-queen-02';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(definition_json, '$.title', 'Puzzle 3'),
  '$.instruction'
)
WHERE id = 'king-and-queen-03';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(definition_json, '$.title', 'Puzzle 4'),
  '$.instruction'
)
WHERE id = 'king-and-queen-04';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(definition_json, '$.title', 'Puzzle 5'),
  '$.instruction'
)
WHERE id = 'king-and-queen-05';
