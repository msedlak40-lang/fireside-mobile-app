-- Fix armor_pieces week_order for 7-day flow
-- Monday = 1 (Belt), Tuesday = 2 (Breastplate), ..., Sunday = 7 (Prayer)

-- Update all armor pieces with correct week_order values
UPDATE armor_pieces SET week_order = 1 WHERE armor_name = 'Belt of Truth';
UPDATE armor_pieces SET week_order = 2 WHERE armor_name = 'Breastplate of Righteousness';
UPDATE armor_pieces SET week_order = 3 WHERE armor_name = 'Shoes of Peace';
UPDATE armor_pieces SET week_order = 4 WHERE armor_name = 'Shield of Faith';
UPDATE armor_pieces SET week_order = 5 WHERE armor_name = 'Helmet of Salvation';
UPDATE armor_pieces SET week_order = 6 WHERE armor_name = 'Sword of the Spirit';
UPDATE armor_pieces SET week_order = 7 WHERE armor_name = 'Prayer';

-- Verify the changes
SELECT id, armor_name, week_order, scripture_reference
FROM armor_pieces
ORDER BY week_order;
