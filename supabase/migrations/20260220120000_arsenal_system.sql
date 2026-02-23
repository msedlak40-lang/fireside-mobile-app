-- ============================================
-- ARSENAL SYSTEM - USER SAVED APPLICATIONS
-- Migration: arsenal_system
-- Date: 2026-02-20
-- ============================================

-- User's saved theme applications
CREATE TABLE IF NOT EXISTS user_saved_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reference to the chapter theme application
  chapter_theme_id UUID REFERENCES chapter_themes(id) ON DELETE CASCADE,

  -- Denormalized for faster queries (copy from chapter_themes)
  book VARCHAR(100) NOT NULL,
  chapter INTEGER NOT NULL,
  theme_tag VARCHAR(100) NOT NULL,
  sub_theme_tag VARCHAR(100),
  character_tag VARCHAR(100),

  -- User's personal additions
  user_note TEXT,
  is_favorite BOOLEAN DEFAULT false,

  -- Sharing (for Phase 3 - Fire features)
  shared_with_fire BOOLEAN DEFAULT false,
  fire_id UUID,

  -- Metadata
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate saves
  CONSTRAINT unique_user_chapter_theme UNIQUE(user_id, chapter_theme_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_saved_apps_user
  ON user_saved_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_apps_user_saved_at
  ON user_saved_applications(user_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_apps_theme
  ON user_saved_applications(user_id, theme_tag);

CREATE INDEX IF NOT EXISTS idx_saved_apps_subtheme
  ON user_saved_applications(user_id, sub_theme_tag);

CREATE INDEX IF NOT EXISTS idx_saved_apps_character
  ON user_saved_applications(user_id, character_tag);

CREATE INDEX IF NOT EXISTS idx_saved_apps_favorites
  ON user_saved_applications(user_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_saved_apps_book_chapter
  ON user_saved_applications(book, chapter);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_saved_applications ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own saved applications
CREATE POLICY "Users manage own saved applications"
  ON user_saved_applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_applications_updated_at
  BEFORE UPDATE ON user_saved_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
