-- Page 27 Puzzle 2 asks the student to set up a pin, not a double attack.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.instruction', 'Set up a pin.'
)
WHERE id = 'page-27-puzzle-02';

-- Page 27 Puzzle 6 uses a White queen, not a Black queen.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.piece', 'wQ'
)
WHERE id = 'page-27-puzzle-06';
