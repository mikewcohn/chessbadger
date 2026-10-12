UPDATE puzzle_sections
SET workbook_pages = 'Pages 32–35'
WHERE collection_slug = 'steps-2-workbook'
  AND slug = 'mate-in-two';

UPDATE puzzle_sections
SET workbook_pages = 'Pages 50–51'
WHERE collection_slug = 'steps-2-workbook'
  AND slug = 'defending-against-mate';

-- Keep page 38 in workbook order, after Double Attack: Knight (pages 36–37).
UPDATE puzzle_sections
SET sort_order = sort_order + 1000
WHERE collection_slug = 'steps-2-workbook'
  AND sort_order >= 9;

UPDATE puzzle_sections
SET sort_order = sort_order - 999
WHERE collection_slug = 'steps-2-workbook'
  AND sort_order >= 1009;

INSERT INTO puzzle_sections VALUES (
  'steps-2-workbook',
  'mate-in-two-rook',
  'Mate in 2 (Rook)',
  'Find the rook and king moves that force checkmate in two moves.',
  'Page 38',
  9
);

-- Attempt history references puzzle IDs, so moving the existing records keeps it intact.
UPDATE puzzles
SET section_slug = 'mate-in-two-rook'
WHERE collection_slug = 'steps-2-workbook'
  AND id LIKE 'page-38-puzzle-%';
