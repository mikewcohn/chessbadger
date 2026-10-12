-- Require the complete mate-in-two continuation shown in the workbook answer key.
-- The final move also confirms that the queen on f1 is Black.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '8/6k1/1B4p1/P1ppb3/6Pq/1P1P3P/2PK4/5q2 b - - 0 1',
  '$.answers', json_array('Bf4+'),
  '$.playThrough', json('true'),
  '$.solutionLines', json('[["Bf4+","Kc3","Qa1#"]]')
)
WHERE id = 'page-53-puzzle-04';
