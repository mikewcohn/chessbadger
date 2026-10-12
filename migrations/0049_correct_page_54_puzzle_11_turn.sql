-- The Steps 2 workbook marks Black to move in puzzle 54.11.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5r1k/2b3pp/1p6/2p2n2/8/1Q1P4/1PP3NP/7K b - - 0 1',
  '$.answers', json_array('Nd4'),
  '$.answerMoves', json_array('f5d4'),
  '$.sideToMove', 'black'
)
WHERE id = 'page-54-puzzle-11';
