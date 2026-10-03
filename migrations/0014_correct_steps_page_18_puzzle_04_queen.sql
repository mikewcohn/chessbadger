-- Correct Page 18 Puzzle 4: the queen on g3 is White.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '4r3/3q1kpp/p3rp2/2R5/3pP3/1RbP2QP/P4BP1/7K w - - 0 1'
)
WHERE id = 'page-18-puzzle-04';
