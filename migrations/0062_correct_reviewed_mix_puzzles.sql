UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.givenLine', '1.Qa8+',
  '$.answers', json('["c8=Q# c8=N#"]'),
  '$.notationFields', json('[{"prefix":"1...Kxa8 2.","answers":["c8=Q#"]},{"prefix":"1...Kb6 2.","answers":["c8=N#"]}]')
)
WHERE id = 'chess-steps-2-mix-page-31-puzzle-02';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.givenLine', '',
  '$.answers', json('["Qa3 Nf6"]'),
  '$.notationFields', json('[{"prefix":"1...Nc5? 2.","answers":["Qa3"]},{"prefix":"1...","answers":["Nf6","Nf6!"]}]')
)
WHERE id = 'chess-steps-2-mix-page-34-puzzle-05';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', '5rk1/3RQppp/2p5/1p6/p7/1P2P1PP/q4PK1/8 w - - 0 1',
  '$.answers', json('["Rd8"]')
)
WHERE id = 'chess-steps-2-mix-page-35-puzzle-12';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers', json('["Bxa2"]')
)
WHERE id = 'chess-steps-2-mix-page-43-puzzle-01';
