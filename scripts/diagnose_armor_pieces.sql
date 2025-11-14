-- Diagnostic query to check armor_pieces table and what getTodaysArmorPiece() would return

-- 1. Show all armor pieces with their week_order
SELECT
  id,
  armor_name,
  week_order,
  scripture_reference,
  description
FROM armor_pieces
ORDER BY week_order;

-- 2. Show what day of week it is and what armor piece should be returned
-- This simulates what getTodaysArmorPiece() does
-- Note: PostgreSQL's EXTRACT(DOW) returns 0=Sunday, 1=Monday, ..., 6=Saturday
-- We convert to 1-7 where Monday=1, Sunday=7

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
  cd.day_name,
  cd.js_day_of_week,
  cd.armor_day_order,
  ap.armor_name,
  ap.week_order,
  'This is what getTodaysArmorPiece() should return' AS note
FROM current_day cd
LEFT JOIN armor_pieces ap ON ap.week_order = cd.armor_day_order;

-- 3. Check for duplicates or missing week_order values
SELECT
  week_order,
  COUNT(*) as count,
  STRING_AGG(armor_name, ', ') as armor_pieces
FROM armor_pieces
GROUP BY week_order
ORDER BY week_order;
