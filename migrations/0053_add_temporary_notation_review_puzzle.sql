-- Temporary production test puzzle. Keep its stable ID until the test is removed.
INSERT INTO puzzles (
  id,
  collection_slug,
  section_slug,
  sort_order,
  section_sort_order,
  definition_json
) VALUES (
  'notation-final-review-test-puzzle',
  'steps-2-workbook',
  'notation-and-final-review',
  (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM puzzles WHERE collection_slug = 'steps-2-workbook'),
  (SELECT COALESCE(MAX(section_sort_order), -1) + 1 FROM puzzles WHERE collection_slug = 'steps-2-workbook' AND section_slug = 'notation-and-final-review'),
  '{"id":"notation-final-review-test-puzzle","title":"Test Puzzle","fen":"1k1q4/p6p/1pQ5/8/4p3/bP2B1P1/P4P1P/2K5 w - - 0 1","answers":["Kb1"],"playThrough":true,"solutionLines":[["Kb1","Qd1+","Bc1"]],"sideToMove":"white","instruction":"Get out of check and avoid mate.","solutionNote":"1.Kc2? Qd3#."}'
);
