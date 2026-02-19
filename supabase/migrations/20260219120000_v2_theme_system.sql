-- ============================================
-- THEME SYSTEM TABLES
-- Migration: v2_theme_system
-- Date: 2026-02-19
-- ============================================

-- User's yearly theme selection
CREATE TABLE IF NOT EXISTS user_yearly_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  theme VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_year UNIQUE(user_id, year)
);

-- User's quarterly theme (optional granularity)
CREATE TABLE IF NOT EXISTS user_quarterly_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  theme VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_year_quarter UNIQUE(user_id, year, quarter)
);

-- AI-generated chapter theme applications
CREATE TABLE IF NOT EXISTS chapter_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book VARCHAR(100) NOT NULL,
  chapter INTEGER NOT NULL,
  theme VARCHAR(100) NOT NULL,
  sub_theme VARCHAR(100),
  application TEXT NOT NULL,
  key_insight TEXT,
  action_step TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_model VARCHAR(50) DEFAULT 'claude-sonnet-4-20250514',

  CONSTRAINT unique_book_chapter_theme UNIQUE(book, chapter, theme)
);

-- Track sub-themes user has discovered
CREATE TABLE IF NOT EXISTS user_theme_discoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(100) NOT NULL,
  sub_theme VARCHAR(100) NOT NULL,
  first_encountered_book VARCHAR(100),
  first_encountered_chapter INTEGER,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_theme_subtheme UNIQUE(user_id, theme, sub_theme)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_yearly_themes_lookup
  ON user_yearly_themes(user_id, year);

CREATE INDEX IF NOT EXISTS idx_user_quarterly_themes_lookup
  ON user_quarterly_themes(user_id, year, quarter);

CREATE INDEX IF NOT EXISTS idx_chapter_themes_lookup
  ON chapter_themes(book, chapter, theme);

CREATE INDEX IF NOT EXISTS idx_chapter_themes_theme
  ON chapter_themes(theme);

CREATE INDEX IF NOT EXISTS idx_theme_discoveries_lookup
  ON user_theme_discoveries(user_id, theme);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_yearly_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quarterly_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_theme_discoveries ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own themes
CREATE POLICY "Users manage own yearly themes"
  ON user_yearly_themes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own quarterly themes"
  ON user_quarterly_themes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Everyone can read chapter themes (public content)
CREATE POLICY "Anyone can read chapter themes"
  ON chapter_themes
  FOR SELECT
  USING (true);

-- Users can only manage their own discoveries
CREATE POLICY "Users manage own discoveries"
  ON user_theme_discoveries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UPDATE EXISTING TABLES (if they exist)
-- ============================================

-- Add theme_tags to parsed_practical_applications if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsed_practical_applications') THEN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsed_practical_applications' AND column_name = 'theme_tags') THEN
      ALTER TABLE parsed_practical_applications ADD COLUMN theme_tags TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsed_practical_applications' AND column_name = 'sub_theme_tags') THEN
      ALTER TABLE parsed_practical_applications ADD COLUMN sub_theme_tags TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsed_practical_applications' AND column_name = 'character_tags') THEN
      ALTER TABLE parsed_practical_applications ADD COLUMN character_tags TEXT[];
    END IF;

    -- Create indexes for the new columns
    CREATE INDEX IF NOT EXISTS idx_practical_apps_theme_tags
      ON parsed_practical_applications USING gin(theme_tags);

    CREATE INDEX IF NOT EXISTS idx_practical_apps_character_tags
      ON parsed_practical_applications USING gin(character_tags);
  END IF;
END $$;
