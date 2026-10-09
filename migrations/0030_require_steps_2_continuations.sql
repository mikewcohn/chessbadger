-- Require the student's second move when the Steps 2 answer key gives a
-- concrete opponent reply and continuation. One-move alternatives remain valid.
-- Puzzle 43.8's keyed reply is castling, so preserve Black's kingside right.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.fen', 'rnb1k2r/pp3pbp/4p1pn/3q4/3P4/4BN2/PP2BPPP/RN1QK2R w k - 0 1'
)
WHERE id = 'page-43-puzzle-08';

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.playThrough', json('true'),
  '$.solutionLines', json(CASE id
    WHEN 'page-21-puzzle-01' THEN '[["Bxf6+","Kxf6","Rxd5"]]'
    WHEN 'page-21-puzzle-02' THEN '[["Nxc4+","bxc4","Rxe2+"]]'
    WHEN 'page-21-puzzle-03' THEN '[["Bxg6+","Kxg6","Nxe5+"]]'
    WHEN 'page-21-puzzle-04' THEN '[["Rxg2","Kxg2","Kxg7"]]'
    WHEN 'page-21-puzzle-05' THEN '[["Rxh7","Kxh7","Kxe4"]]'
    WHEN 'page-21-puzzle-06' THEN '[["Bxb6","axb6","Rxd7"]]'
    WHEN 'page-21-puzzle-07' THEN '[["Rxd8","Bxd8","Bxd5"]]'
    WHEN 'page-21-puzzle-08' THEN '[["Nxc5","bxc5","Bxd7"],["Nxc5","Bxa4","Nxa4"]]'
    WHEN 'page-21-puzzle-09' THEN '[["Qxc2","Rxc2","Bxa4"]]'
    WHEN 'page-21-puzzle-10' THEN '[["Nxf6","Rxf6","Rxc3"]]'
    WHEN 'page-21-puzzle-11' THEN '[["Rxe2","Rxe2","Bxc4"]]'
    WHEN 'page-21-puzzle-12' THEN '[["Rxc7","Nxc7","Rxe7"]]'
    WHEN 'page-39-puzzle-01' THEN '[["Bxd7","Rxd7","Nxe5"]]'
    WHEN 'page-39-puzzle-02' THEN '[["Qa2+","Kc1","Qxc2#"]]'
    WHEN 'page-39-puzzle-04' THEN '[["Qc6+","Kf8","Qxa8#"]]'
    WHEN 'page-39-puzzle-07' THEN '[["Rxh6+","Bxh6","Qxe5+"],["Qxe5+"]]'
    WHEN 'page-39-puzzle-09' THEN '[["exd4+","Nxd4","Rxc5"]]'
    WHEN 'page-40-puzzle-04' THEN '[["Qxc4","Nxc4","Rxd5"]]'
    WHEN 'page-40-puzzle-06' THEN '[["Ra6+","Kb8","Nd7#"]]'
    WHEN 'page-40-puzzle-10' THEN '[["Raa7","Nd5","Rxc6"]]'
    WHEN 'page-43-puzzle-01' THEN '[["Qd4","f6","Nxe4"]]'
    WHEN 'page-43-puzzle-02' THEN '[["Qe3+","Qe6","Bxh6"]]'
    WHEN 'page-43-puzzle-04' THEN '[["Qc5","Rb7","Nxc7"]]'
    WHEN 'page-43-puzzle-06' THEN '[["Qc2","g6","Rxc8"]]'
    WHEN 'page-43-puzzle-07' THEN '[["Qa5","Be3","Bxg5"]]'
    WHEN 'page-43-puzzle-08' THEN '[["Qc1","O-O","Bxh6"]]'
  END)
)
WHERE id IN (
  'page-21-puzzle-01', 'page-21-puzzle-02', 'page-21-puzzle-03',
  'page-21-puzzle-04', 'page-21-puzzle-05', 'page-21-puzzle-06',
  'page-21-puzzle-07', 'page-21-puzzle-08', 'page-21-puzzle-09',
  'page-21-puzzle-10', 'page-21-puzzle-11', 'page-21-puzzle-12',
  'page-39-puzzle-01', 'page-39-puzzle-02', 'page-39-puzzle-04',
  'page-39-puzzle-07', 'page-39-puzzle-09',
  'page-40-puzzle-04', 'page-40-puzzle-06', 'page-40-puzzle-10',
  'page-43-puzzle-01', 'page-43-puzzle-02', 'page-43-puzzle-04',
  'page-43-puzzle-06', 'page-43-puzzle-07', 'page-43-puzzle-08'
);
