INSERT INTO puzzle_collections VALUES (
  'checkmate-patterns',
  'Checkmate Patterns',
  'Learn essential mating techniques and practice them against a responding opponent.',
  3
);

INSERT INTO puzzle_sections VALUES (
  'checkmate-patterns',
  'king-and-queen',
  'Checkmate with King and Queen',
  'Drive the lone king to the edge, bring your king close, and deliver checkmate without stalemating.',
  'Essential technique',
  0
);

INSERT INTO puzzles VALUES (
  'king-and-queen-01',
  'checkmate-patterns',
  'king-and-queen',
  0,
  0,
  '{"id":"king-and-queen-01","title":"Mate in One","fen":"7k/8/5K2/6Q1/8/8/8/8 w - - 0 1","answers":["Qg7#"],"instruction":"Checkmate in one. Any mating move is accepted.","validation":"checkmate","opponentMode":"automatic-king","maxPlayerMoves":1}'
);

INSERT INTO puzzles VALUES (
  'king-and-queen-02',
  'checkmate-patterns',
  'king-and-queen',
  1,
  1,
  '{"id":"king-and-queen-02","title":"Finish at the Edge","fen":"8/8/7k/8/2Q2K2/8/8/8 w - - 0 1","answers":["Any legal checkmate"],"instruction":"Black is already near the edge. Coordinate your king and queen to checkmate.","validation":"checkmate","opponentMode":"automatic-king"}'
);

INSERT INTO puzzles VALUES (
  'king-and-queen-03',
  'checkmate-patterns',
  'king-and-queen',
  2,
  2,
  '{"id":"king-and-queen-03","title":"Keep the King Confined","fen":"8/8/8/k7/8/3K4/8/6Q1 w - - 0 1","answers":["Any legal checkmate"],"instruction":"Keep Black confined, bring your king closer, and finish the mate without stalemating.","validation":"checkmate","opponentMode":"automatic-king"}'
);

INSERT INTO puzzles VALUES (
  'king-and-queen-04',
  'checkmate-patterns',
  'king-and-queen',
  3,
  3,
  '{"id":"king-and-queen-04","title":"Shrink the Box","fen":"8/8/8/3k4/8/8/1K6/7Q w - - 0 1","answers":["Any legal checkmate"],"instruction":"Use the queen to reduce the king’s space, then bring your king up to help.","validation":"checkmate","opponentMode":"automatic-king"}'
);

INSERT INTO puzzles VALUES (
  'king-and-queen-05',
  'checkmate-patterns',
  'king-and-queen',
  4,
  4,
  '{"id":"king-and-queen-05","title":"Complete the Checkmate","fen":"8/8/8/4k3/8/8/8/K6Q w - - 0 1","answers":["Any legal checkmate"],"instruction":"Complete the full king-and-queen checkmate from this starting position.","validation":"checkmate","opponentMode":"automatic-king"}'
);
