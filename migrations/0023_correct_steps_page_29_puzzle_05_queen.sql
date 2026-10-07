-- Page 29 Puzzle 5 has a Black queen on d5, not a White queen.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen',
  '5b2/p4p1p/1p2knp1/3q4/3QpP2/1P2P3/P5KP/3R4 w - - 0 1'
)
WHERE id = 'page-29-puzzle-05';
