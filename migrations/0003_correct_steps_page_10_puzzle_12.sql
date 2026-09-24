-- Preserve the puzzle correction from main after the original catalog import.
-- The queen is White, White moves first, and the accepted answer is Qe3+.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'r1bqkb1r/pppp1pp1/8/5P1p/3Q4/1B4n1/PPP3PP/RNB1K2R w - - 0 1',
  '$.answers', json('["Qe3+"]')
)
WHERE id = 'page-10-puzzle-12';
