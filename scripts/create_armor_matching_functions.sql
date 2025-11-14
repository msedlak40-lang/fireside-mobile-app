-- Function to get daily practical application for user's battle
-- Matches: armor piece + battle tag + not recently seen

CREATE OR REPLACE FUNCTION get_daily_armor_application(
  p_user_id UUID,
  p_armor_piece_id INTEGER,
  p_battle_tag TEXT,
  p_battle_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INTEGER,
  application_text TEXT,
  book_name TEXT,
  chapter_number INTEGER,
  armor_piece_name TEXT,
  confidence_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ppa.id,
    ppa.application_text,
    ppa.book_name,
    ppa.chapter_number,
    ap.armor_name as armor_piece_name,
    ppa.confidence_score
  FROM parsed_practical_applications ppa
  JOIN armor_pieces ap ON ppa.primary_armor_piece_id = ap.id
  WHERE
    -- Match the armor piece
    ppa.primary_armor_piece_id = p_armor_piece_id

    -- Match the battle tag (if the app has this tag in its array)
    AND (
      p_battle_tag = ANY(ppa.battle_tags)
      OR array_length(ppa.battle_tags, 1) IS NULL  -- Include apps with no specific tags as generic fallback
    )

    -- Exclude recently seen applications (last 30 days)
    AND ppa.id NOT IN (
      SELECT application_id
      FROM user_seen_applications
      WHERE user_id = p_user_id
        AND seen_at > NOW() - INTERVAL '30 days'
    )

  ORDER BY
    -- Prioritize apps that match the battle tag
    CASE WHEN p_battle_tag = ANY(ppa.battle_tags) THEN 1 ELSE 2 END,
    -- Then by confidence score
    ppa.confidence_score DESC,
    -- Then randomly to add variety
    random()

  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to mark an application as seen
CREATE OR REPLACE FUNCTION mark_application_seen(
  p_user_id UUID,
  p_application_id INTEGER,
  p_battle_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_seen_applications (user_id, application_id, battle_id, seen_at)
  VALUES (p_user_id, p_application_id, p_battle_id, NOW())
  ON CONFLICT (user_id, application_id, battle_id)
  DO UPDATE SET seen_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM get_daily_armor_application(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- dummy user ID for testing
  1,  -- Belt of Truth
  'fear'  -- battle tag
);
