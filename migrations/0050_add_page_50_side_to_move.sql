-- Record the workbook's side to move for every puzzle on page 50.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.sideToMove', CASE
    WHEN id IN (
      'page-50-puzzle-01',
      'page-50-puzzle-02',
      'page-50-puzzle-07',
      'page-50-puzzle-10',
      'page-50-puzzle-11'
    ) THEN 'white'
    ELSE 'black'
  END
)
WHERE id BETWEEN 'page-50-puzzle-01' AND 'page-50-puzzle-11';
