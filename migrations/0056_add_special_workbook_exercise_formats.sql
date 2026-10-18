-- Preserve the exercise formats printed in Chess Steps 2 Mix.
-- Circle exercises expose their printed move choices; line exercises begin
-- after the supplied moves so the learner plays only the blank move.

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.choices', json('["Nxd5","Rxd5","Rxa8"]'),
  '$.instruction', 'Select the correct move.'
)
WHERE id = 'chess-steps-2-mix-page-5-puzzle-09';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.choices', json('["gxh4","Rxf2","Re1+"]'),
  '$.instruction', 'Select the correct move.'
)
WHERE id = 'chess-steps-2-mix-page-6-puzzle-03';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(
    definition_json,
    '$.fen', 'r2qkb1r/1pp1ppp1/p1n2n1p/8/2BP2b1/2N2N2/PPP2PPP/R1BQR1K1 w - - 0 1',
    '$.givenMoves', json('["Ne5"]'),
    '$.instruction', 'Complete the line.'
  ),
  '$.lastMove'
)
WHERE id = 'chess-steps-2-mix-page-6-puzzle-07';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(
    definition_json,
    '$.answers', json('["Qxg6#"]'),
    '$.givenMoves', json('["g6+","fxg6+"]'),
    '$.instruction', 'Complete the line.'
  ),
  '$.playThrough',
  '$.solutionLines'
)
WHERE id = 'chess-steps-2-mix-page-7-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.choices', json('["Qc8+","Nxd5","Qxf6"]'),
  '$.instruction', 'Select the correct move.'
)
WHERE id = 'chess-steps-2-mix-page-8-puzzle-04';

UPDATE puzzles
SET definition_json = json_remove(
  json_set(
    definition_json,
    '$.answers', json('["dxe5"]'),
    '$.givenMoves', json('["Bxc6+","bxc6"]'),
    '$.instruction', 'Complete the line.'
  ),
  '$.playThrough',
  '$.solutionLines'
)
WHERE id = 'chess-steps-2-mix-page-8-puzzle-08';
