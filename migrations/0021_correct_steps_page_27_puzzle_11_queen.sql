-- Page 27 Puzzle 11 has a Black queen on d7, not a White queen.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'r3k2r/pp1q1ppp/4bn2/2p1p3/4P3/2NB4/PPP2PPP/3QK2R w - - 0 1'
)
WHERE id = 'page-27-puzzle-11';
