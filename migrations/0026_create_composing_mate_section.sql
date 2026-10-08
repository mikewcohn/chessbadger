-- Make room for the page 31 section without violating the unique section order.
UPDATE puzzle_sections
SET sort_order = sort_order + 1000
WHERE collection_slug = 'steps-2-workbook'
  AND sort_order >= 6;

UPDATE puzzle_sections
SET sort_order = sort_order - 999
WHERE collection_slug = 'steps-2-workbook'
  AND sort_order >= 1006;

INSERT INTO puzzle_sections VALUES (
  'steps-2-workbook',
  'composing-mate',
  'Composing Mate',
  'Compose checkmate positions by placing the requested pieces.',
  'Page 31',
  6
);

UPDATE puzzle_sections
SET workbook_pages = 'Pages 32–35 and 38'
WHERE collection_slug = 'steps-2-workbook'
  AND slug = 'mate-in-two';

-- Attempt history references puzzle IDs, so moving the existing records keeps it intact.
UPDATE puzzles
SET section_slug = 'composing-mate'
WHERE collection_slug = 'steps-2-workbook'
  AND id LIKE 'page-31-puzzle-%';
