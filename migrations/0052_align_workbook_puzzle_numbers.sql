-- Keep stable puzzle IDs while aligning displayed puzzle numbers with the
-- workbook's twelve physical positions, including positions used by drawings.
WITH parsed AS (
  SELECT
    id,
    CAST(substr(id, 6, instr(substr(id, 6), '-') - 1) AS INTEGER) AS page_number,
    CAST(substr(id, -2) AS INTEGER) AS source_number
  FROM puzzles
  WHERE collection_slug = 'steps-2-workbook'
),
renumbered AS (
  SELECT
    id,
    page_number,
    CASE page_number
      WHEN 4 THEN CASE WHEN source_number = 1 THEN 1 ELSE source_number + 2 END
      WHEN 8 THEN CASE WHEN source_number < 5 THEN source_number ELSE source_number + 1 END
      WHEN 12 THEN source_number
      WHEN 16 THEN source_number
      WHEN 18 THEN CASE WHEN source_number < 7 THEN source_number WHEN source_number = 7 THEN 9 ELSE 12 END
      WHEN 22 THEN CASE WHEN source_number < 7 THEN source_number ELSE source_number + 2 END
      WHEN 27 THEN CASE WHEN source_number < 7 THEN source_number ELSE source_number + 1 END
      WHEN 30 THEN CASE WHEN source_number < 9 THEN source_number ELSE source_number + 1 END
      WHEN 32 THEN CASE WHEN source_number < 6 THEN source_number WHEN source_number < 8 THEN source_number + 1 ELSE source_number + 2 END
      WHEN 35 THEN CASE WHEN source_number < 8 THEN source_number ELSE source_number + 2 END
      WHEN 38 THEN CASE WHEN source_number < 9 THEN source_number ELSE source_number + 1 END
      WHEN 42 THEN CASE WHEN source_number < 8 THEN source_number ELSE 10 END
      WHEN 50 THEN source_number
      WHEN 54 THEN CASE WHEN source_number = 1 THEN 1 ELSE source_number + 1 END
    END AS workbook_number
  FROM parsed
  WHERE page_number IN (4, 8, 12, 16, 18, 22, 27, 30, 32, 35, 38, 42, 50, 54)
)
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.title', printf(
    'Page %d, Puzzle %d',
    (SELECT page_number FROM renumbered WHERE renumbered.id = puzzles.id),
    (SELECT workbook_number FROM renumbered WHERE renumbered.id = puzzles.id)
  ),
  '$.workbookPuzzleNumber', (SELECT workbook_number FROM renumbered WHERE renumbered.id = puzzles.id)
)
WHERE id IN (SELECT id FROM renumbered);
