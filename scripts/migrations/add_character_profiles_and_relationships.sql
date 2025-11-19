-- Migration: Add enhanced character profiles and relationships
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add new columns to bible_characters
-- ============================================

ALTER TABLE bible_characters
ADD COLUMN IF NOT EXISTS era TEXT,
ADD COLUMN IF NOT EXISTS tribe TEXT,
ADD COLUMN IF NOT EXISTS key_locations TEXT[],
ADD COLUMN IF NOT EXISTS known_for TEXT[],
ADD COLUMN IF NOT EXISTS character_traits TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN bible_characters.era IS 'Historical period: Patriarchs, United Monarchy, Early Church, etc.';
COMMENT ON COLUMN bible_characters.tribe IS 'Tribe of Israel (for Israelites only)';
COMMENT ON COLUMN bible_characters.key_locations IS 'Array of 2-4 significant places in their story';
COMMENT ON COLUMN bible_characters.known_for IS 'Array of 2-3 defining moments or achievements';
COMMENT ON COLUMN bible_characters.character_traits IS 'Array of 3-5 key virtues or character qualities';

-- ============================================
-- STEP 2: Create character_relationships table
-- ============================================

CREATE TABLE IF NOT EXISTS character_relationships (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES bible_characters(id) ON DELETE CASCADE,
  related_character_id INTEGER REFERENCES bible_characters(id) ON DELETE SET NULL,
  related_character_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE character_relationships IS 'Relationships between Bible characters (family, friends, rivals, etc.)';
COMMENT ON COLUMN character_relationships.character_id IS 'The main character this relationship belongs to';
COMMENT ON COLUMN character_relationships.related_character_id IS 'FK to bible_characters if the related person exists in our database';
COMMENT ON COLUMN character_relationships.related_character_name IS 'Display name of the related person';
COMMENT ON COLUMN character_relationships.relationship_type IS 'Type: father, mother, spouse, child, sibling, mentor, friend, rival, etc.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_relationships_character_id
ON character_relationships(character_id);

CREATE INDEX IF NOT EXISTS idx_character_relationships_related_id
ON character_relationships(related_character_id);

CREATE INDEX IF NOT EXISTS idx_character_relationships_type
ON character_relationships(relationship_type);

-- ============================================
-- STEP 3: Enable RLS (Row Level Security)
-- ============================================

ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read relationships
CREATE POLICY "Allow authenticated users to read relationships"
ON character_relationships
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

GRANT SELECT ON character_relationships TO authenticated;
GRANT SELECT ON character_relationships TO anon;

-- ============================================
-- VERIFICATION
-- ============================================

-- Run these to verify the migration worked:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bible_characters' AND column_name IN ('era', 'tribe', 'key_locations', 'known_for', 'character_traits');
-- SELECT * FROM character_relationships LIMIT 1;
