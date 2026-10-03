-- White is in check from the queen on e3; capturing it is the tactical reply.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers[0]', 'Rxe3',
  '$.answerMoves[0]', 'e1e3'
)
WHERE id = 'page-40-puzzle-12';
