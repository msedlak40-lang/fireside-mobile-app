-- Armor of God Feature - Database Schema
-- Solo mode (no group features)

-- 1. Armor Pieces Reference Table
CREATE TABLE IF NOT EXISTS armor_pieces (
  id SERIAL PRIMARY KEY,
  armor_name TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  description TEXT,
  week_order INTEGER NOT NULL UNIQUE,
  icon_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Battle Verse Tags (Tagging system for existing bible_verses)
CREATE TABLE IF NOT EXISTS battle_verse_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  battle_tag TEXT NOT NULL,
  armor_piece_id INTEGER REFERENCES armor_pieces(id),
  context_summary TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(book_name, chapter_number, verse_number, battle_tag)
);

-- Ensure unique constraint exists (for existing tables)
ALTER TABLE battle_verse_tags DROP CONSTRAINT IF EXISTS battle_verse_tags_unique;
ALTER TABLE battle_verse_tags ADD CONSTRAINT battle_verse_tags_unique
  UNIQUE (book_name, chapter_number, verse_number, battle_tag);

-- 3. User Saved Battle Verses (User's personal collection)
CREATE TABLE IF NOT EXISTS user_battle_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  notes TEXT,
  battle_tag TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, book_name, chapter_number, verse_number)
);

-- 4. User Battles (Weekly battle entries)
CREATE TABLE IF NOT EXISTS user_battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  battle_text TEXT NOT NULL,
  battle_tag TEXT NOT NULL,
  armor_piece_id INTEGER REFERENCES armor_pieces(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. User Weekly Reflections (Daily/weekly reflections)
CREATE TABLE IF NOT EXISTS user_weekly_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES user_battles(id) ON DELETE CASCADE,
  verse_id UUID,
  armor_piece_id INTEGER REFERENCES armor_pieces(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  day_of_week INTEGER,
  reflection_text TEXT NOT NULL,
  reflection_type TEXT NOT NULL CHECK (reflection_type IN ('daily', 'midweek', 'victory')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_battle_verse_tags_tag ON battle_verse_tags(battle_tag);
CREATE INDEX IF NOT EXISTS idx_battle_verse_tags_armor ON battle_verse_tags(armor_piece_id);
CREATE INDEX IF NOT EXISTS idx_user_battle_verses_user ON user_battle_verses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_battles_user_active ON user_battles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_battles_week ON user_battles(week_number, year);
CREATE INDEX IF NOT EXISTS idx_user_reflections_battle ON user_weekly_reflections(battle_id);
CREATE INDEX IF NOT EXISTS idx_user_reflections_user_week ON user_weekly_reflections(user_id, week_number, year);

-- RPC Function: Get Battle Verse for Tag
CREATE OR REPLACE FUNCTION get_battle_verse_for_tag(
  p_battle_tag TEXT,
  p_user_id UUID,
  p_translation TEXT DEFAULT 'KJV'
)
RETURNS TABLE (
  book_name TEXT,
  chapter_number INTEGER,
  verse_number INTEGER,
  verse_reference TEXT,
  verse_text TEXT,
  armor_name TEXT,
  context_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bvt.book_name,
    bvt.chapter_number,
    bvt.verse_number,
    bvt.book_name || ' ' || bvt.chapter_number::TEXT || ':' || bvt.verse_number::TEXT AS verse_reference,
    bv.verse_text,
    COALESCE(ap.armor_name, 'Armor of God') AS armor_name,
    COALESCE(bvt.context_summary, '') AS context_summary
  FROM battle_verse_tags bvt
  JOIN bible_verses bv ON
    (bvt.book_name = bv.book_name OR
     (bvt.book_name = 'Psalms' AND bv.book_name = 'Psalm') OR
     (bvt.book_name = 'Psalm' AND bv.book_name = 'Psalms'))
    AND bvt.chapter_number = bv.chapter_number
    AND bvt.verse_number = bv.verse_number
    AND bv.translation = p_translation
  LEFT JOIN armor_pieces ap ON bvt.armor_piece_id = ap.id
  WHERE bvt.battle_tag = p_battle_tag
    -- Exclude verses user has seen in last 12 weeks (optional filtering)
    AND NOT EXISTS (
      SELECT 1 FROM user_battles ub
      WHERE ub.user_id = p_user_id
      AND ub.week_number >= EXTRACT(WEEK FROM NOW())::INTEGER - 12
      AND ub.battle_tag = p_battle_tag
      LIMIT 1
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed Data: 6 Armor Pieces
INSERT INTO armor_pieces (armor_name, scripture_reference, description, week_order, icon_name)
VALUES
  ('Belt of Truth', 'Ephesians 6:14', 'Stand firm with the belt of truth buckled around your waist', 1, 'shield-outline'),
  ('Breastplate of Righteousness', 'Ephesians 6:14', 'Protect your heart with the breastplate of righteousness', 2, 'heart-outline'),
  ('Shoes of Peace', 'Ephesians 6:15', 'Feet fitted with readiness that comes from the gospel of peace', 3, 'walk'),
  ('Shield of Faith', 'Ephesians 6:16', 'Take up the shield of faith to extinguish all the flaming arrows', 4, 'shield-checkmark-outline'),
  ('Helmet of Salvation', 'Ephesians 6:17', 'Put on the helmet of salvation to protect your mind', 5, 'bulb-outline'),
  ('Sword of the Spirit', 'Ephesians 6:17', 'Take the sword of the Spirit, which is the word of God', 6, 'book-outline')
ON CONFLICT (week_order) DO NOTHING;

-- Seed Data: Battle Verse Tags (Initial curated verses)
-- Fear verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Isaiah', 41, 10, 'fear', 'God spoke this promise to Israel during their exile, assuring them of His presence.', true),
  ('2 Timothy', 1, 7, 'fear', 'Paul reminded Timothy that God gives us power, love, and self-discipline, not fear.', true),
  ('Psalms', 56, 3, 'fear', 'David wrote this while fleeing from Saul, choosing to trust God in danger.', true),
  ('Deuteronomy', 31, 6, 'fear', 'Moses encouraged the Israelites before entering the Promised Land.', true),
  ('Joshua', 1, 9, 'fear', 'God commanded Joshua to be strong and courageous as he led Israel.', true),
  ('Psalms', 27, 1, 'fear', 'David declared God as his light and salvation, removing all fear.', true),
  ('Proverbs', 29, 25, 'fear', 'Solomon taught that fear of man is a trap, but trust in God brings safety.', true),
  ('Philippians', 4, 6, 'fear', 'Paul instructed believers to present their anxieties to God in prayer.', true),
  ('1 John', 4, 18, 'fear', 'John explained that perfect love casts out all fear.', true),
  ('Psalms', 34, 4, 'fear', 'David testified that God delivered him from all his fears.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Anger verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Proverbs', 15, 1, 'anger', 'Solomon taught that a gentle answer turns away wrath.', true),
  ('Ephesians', 4, 26, 'anger', 'Paul instructed believers not to let anger lead to sin.', true),
  ('James', 1, 19, 'anger', 'James encouraged quick listening, slow speaking, and slow anger.', true),
  ('Proverbs', 16, 32, 'anger', 'Solomon praised self-control as greater than conquering a city.', true),
  ('Colossians', 3, 8, 'anger', 'Paul told believers to rid themselves of anger and malice.', true),
  ('Psalms', 37, 8, 'anger', 'David warned against anger that leads to evil.', true),
  ('Proverbs', 29, 11, 'anger', 'Solomon contrasted fools who vent anger with the wise who restrain it.', true),
  ('Proverbs', 14, 29, 'anger', 'Solomon taught that patience shows understanding, while quick temper shows folly.', true),
  ('Matthew', 5, 22, 'anger', 'Jesus taught that anger toward others makes us subject to judgment.', true),
  ('Romans', 12, 19, 'anger', 'Paul instructed believers to leave vengeance to God.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Temptation verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('1 Corinthians', 10, 13, 'temptation', 'Paul assured believers that God provides a way out of every temptation.', true),
  ('James', 1, 14, 'temptation', 'James explained that temptation comes from our own desires, not God.', true),
  ('Hebrews', 2, 18, 'temptation', 'The writer reminded us that Jesus was tempted and can help us.', true),
  ('Hebrews', 4, 15, 'temptation', 'Jesus was tempted in every way yet remained sinless.', true),
  ('1 Peter', 5, 8, 'temptation', 'Peter warned believers to be alert because the devil prowls like a lion.', true),
  ('Matthew', 26, 41, 'temptation', 'Jesus told his disciples to watch and pray to avoid temptation.', true),
  ('Galatians', 6, 1, 'temptation', 'Paul instructed believers to restore others gently, watching themselves.', true),
  ('2 Timothy', 2, 22, 'temptation', 'Paul told Timothy to flee youthful lusts and pursue righteousness.', true),
  ('Psalms', 119, 11, 'temptation', 'The psalmist hid God''s word in his heart to avoid sin.', true),
  ('Romans', 13, 14, 'temptation', 'Paul instructed believers to clothe themselves with Christ, not gratifying flesh.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Doubt verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Jeremiah', 29, 11, 'doubt', 'God promised Israel a future and hope during their exile.', true),
  ('Proverbs', 3, 5, 'doubt', 'Solomon taught to trust God completely, not our own understanding.', true),
  ('Romans', 8, 28, 'doubt', 'Paul assured believers that God works all things for good.', true),
  ('Hebrews', 11, 1, 'doubt', 'The writer defined faith as confidence in what we hope for.', true),
  ('James', 1, 6, 'doubt', 'James instructed believers to ask in faith without doubting.', true),
  ('Mark', 11, 23, 'doubt', 'Jesus taught that faith without doubt can move mountains.', true),
  ('2 Corinthians', 5, 7, 'doubt', 'Paul reminded believers that we walk by faith, not by sight.', true),
  ('John', 20, 27, 'doubt', 'Jesus invited Thomas to believe without seeing.', true),
  ('Psalms', 37, 5, 'doubt', 'David encouraged committing our way to the Lord and trusting Him.', true),
  ('Isaiah', 55, 8, 'doubt', 'God reminded Israel that His ways are higher than ours.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Loneliness verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Deuteronomy', 31, 8, 'loneliness', 'Moses assured Israel that God goes before them and will never leave.', true),
  ('Hebrews', 13, 5, 'loneliness', 'The writer quoted God''s promise to never leave or forsake us.', true),
  ('Psalms', 68, 6, 'loneliness', 'David proclaimed that God sets the lonely in families.', true),
  ('Isaiah', 41, 10, 'loneliness', 'God promised to be with Israel and strengthen them.', true),
  ('Matthew', 28, 20, 'loneliness', 'Jesus promised to be with his disciples always, to the end of the age.', true),
  ('Psalms', 23, 4, 'loneliness', 'David found comfort knowing God was with him in the darkest valley.', true),
  ('John', 16, 32, 'loneliness', 'Jesus told his disciples he is never alone because the Father is with him.', true),
  ('Psalms', 139, 7, 'loneliness', 'David realized there is nowhere he can go from God''s presence.', true),
  ('Romans', 8, 38, 'loneliness', 'Paul declared that nothing can separate us from God''s love.', true),
  ('1 Peter', 5, 7, 'loneliness', 'Peter encouraged believers to cast all anxiety on God because He cares.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Identity verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Ephesians', 2, 10, 'identity', 'Paul declared that we are God''s workmanship, created for good works.', true),
  ('1 Peter', 2, 9, 'identity', 'Peter called believers a chosen people, a royal priesthood.', true),
  ('2 Corinthians', 5, 17, 'identity', 'Paul taught that anyone in Christ is a new creation.', true),
  ('Romans', 8, 16, 'identity', 'Paul affirmed that the Spirit testifies we are God''s children.', true),
  ('Galatians', 2, 20, 'identity', 'Paul explained that he lives by faith in the Son of God who loved him.', true),
  ('John', 1, 12, 'identity', 'John declared that those who believe receive the right to be God''s children.', true),
  ('Colossians', 3, 3, 'identity', 'Paul taught that our life is hidden with Christ in God.', true),
  ('1 John', 3, 1, 'identity', 'John marveled at how great the Father''s love is that we are called God''s children.', true),
  ('Psalms', 139, 14, 'identity', 'David praised God because he was fearfully and wonderfully made.', true),
  ('Isaiah', 43, 1, 'identity', 'God declared that He has called Israel by name; they are His.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Purpose verses
INSERT INTO battle_verse_tags (book_name, chapter_number, verse_number, battle_tag, context_summary, is_featured)
VALUES
  ('Jeremiah', 29, 11, 'purpose', 'God promised Israel a future and hope during their exile.', true),
  ('Romans', 8, 28, 'purpose', 'Paul assured believers that God works all things for good.', true),
  ('Proverbs', 16, 9, 'purpose', 'Solomon taught that God establishes our steps even when we plan.', true),
  ('Proverbs', 19, 21, 'purpose', 'Solomon declared that God''s purpose prevails over all plans.', true),
  ('Ephesians', 2, 10, 'purpose', 'Paul explained we are created in Christ for good works God prepared.', true),
  ('Philippians', 1, 6, 'purpose', 'Paul was confident that God completes the good work He began.', true),
  ('Colossians', 3, 23, 'purpose', 'Paul instructed believers to work for the Lord, not for people.', true),
  ('1 Corinthians', 10, 31, 'purpose', 'Paul taught that whatever we do should be for God''s glory.', true),
  ('Psalms', 138, 8, 'purpose', 'David trusted that God would fulfill His purpose for him.', true),
  ('Acts', 20, 24, 'purpose', 'Paul considered his life worth nothing except completing the task God gave him.', true)
ON CONFLICT (book_name, chapter_number, verse_number, battle_tag) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE user_battle_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weekly_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own battle verses" ON user_battle_verses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own battle verses" ON user_battle_verses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own battle verses" ON user_battle_verses
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own battles" ON user_battles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own battles" ON user_battles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own battles" ON user_battles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reflections" ON user_weekly_reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections" ON user_weekly_reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections" ON user_weekly_reflections
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant execute permission on RPC function
GRANT EXECUTE ON FUNCTION get_battle_verse_for_tag(TEXT, UUID, TEXT) TO authenticated;
