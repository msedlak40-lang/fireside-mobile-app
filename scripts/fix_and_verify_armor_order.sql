-- Combined script: Fix armor_pieces week_order AND verify it worked
-- Run this in your Supabase SQL Editor

-- STEP 1: Show current state
SELECT 'BEFORE UPDATE:' as step;
SELECT id, armor_name, week_order, scripture_reference
FROM armor_pieces
ORDER BY week_order;

-- STEP 2: Update all armor pieces with correct week_order values
-- Monday = 1 (Belt), Tuesday = 2 (Breastplate), ..., Sunday = 7 (Prayer)
UPDATE armor_pieces SET week_order = 1 WHERE armor_name = 'Belt of Truth';
UPDATE armor_pieces SET week_order = 2 WHERE armor_name = 'Breastplate of Righteousness';
UPDATE armor_pieces SET week_order = 3 WHERE armor_name = 'Shoes of Peace';
UPDATE armor_pieces SET week_order = 4 WHERE armor_name = 'Shield of Faith';
UPDATE armor_pieces SET week_order = 5 WHERE armor_name = 'Helmet of Salvation';
UPDATE armor_pieces SET week_order = 6 WHERE armor_name = 'Sword of the Spirit';
UPDATE armor_pieces SET week_order = 7 WHERE armor_name = 'Prayer';

-- STEP 3: Verify the changes
SELECT 'AFTER UPDATE:' as step;
SELECT id, armor_name, week_order, scripture_reference
FROM armor_pieces
ORDER BY week_order;

-- STEP 4: Show what getTodaysArmorPiece() will return today
WITH current_day AS (
  SELECT
    EXTRACT(DOW FROM NOW()) AS js_day_of_week,
    CASE
      WHEN EXTRACT(DOW FROM NOW()) = 0 THEN 7  -- Sunday becomes 7
      ELSE EXTRACT(DOW FROM NOW())             -- Mon-Sat become 1-6
    END AS armor_day_order,
    TO_CHAR(NOW(), 'Day') AS day_name
)
SELECT
  'TODAY IS:' as step,
  TRIM(cd.day_name) as day_name,
  cd.armor_day_order as week_order_to_fetch,
  ap.armor_name as todays_armor_piece,
  ap.scripture_reference
FROM current_day cd
LEFT JOIN armor_pieces ap ON ap.week_order = cd.armor_day_order;
