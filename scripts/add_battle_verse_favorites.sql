-- Add favorites support to battle verses
-- This allows users to pin/star their most-used verses

-- Add is_favorite column to user_battle_verses table
ALTER TABLE user_battle_verses
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on favorites
CREATE INDEX IF NOT EXISTS idx_user_battle_verses_favorite
ON user_battle_verses(user_id, is_favorite)
WHERE is_favorite = TRUE;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_battle_verses'
ORDER BY ordinal_position;
