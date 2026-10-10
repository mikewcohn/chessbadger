-- Any rook move from f7 to f1 through f5 begins the keyed mate in puzzle 38.1.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers', json('["Rf1","Rf2","Rf3","Rf4","Rf5"]')
)
WHERE id = 'page-38-puzzle-01';
