-- Require the complete tactical combinations shown in the workbook answer key.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.playThrough', json('true'),
  '$.solutionLines', json(CASE id
    WHEN 'page-24-puzzle-07' THEN '[["Bxc5","dxc5","Rxe5"]]'
    WHEN 'page-24-puzzle-08' THEN '[["Rxf2","Bxf2","Kxg5"]]'
    WHEN 'page-24-puzzle-09' THEN '[["Rxd1","Qxd1","Qxf2"]]'
    WHEN 'page-24-puzzle-10' THEN '[["b5","Qxb5","Rxe4"]]'
    WHEN 'page-24-puzzle-11' THEN '[["Ra1+","Bxa1","Qxc5"],["Ra1+","Bg1","Qxc5"]]'
    WHEN 'page-24-puzzle-12' THEN '[["Ng5+","Bxg5","Rxc7+"]]'
  END)
)
WHERE id IN (
  'page-24-puzzle-07',
  'page-24-puzzle-08',
  'page-24-puzzle-09',
  'page-24-puzzle-10',
  'page-24-puzzle-11',
  'page-24-puzzle-12'
);

UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.solutionNote',
  CASE id
    WHEN 'page-24-puzzle-11' THEN 'Also shown: 1...Qxc5? 2.Bxc5 Ra1+ 3.Bg1.'
    WHEN 'page-24-puzzle-12' THEN 'If Black does not play 1...Bxg5, White continues with 2.Nxe6.'
  END
)
WHERE id IN ('page-24-puzzle-11', 'page-24-puzzle-12');
