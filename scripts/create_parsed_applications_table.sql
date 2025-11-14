-- Create table to store parsed and AI-tagged practical applications
-- Run this first before running the tagging script

-- Drop table if it exists (for fresh start)
DROP TABLE IF EXISTS user_seen_applications CASCADE;
DROP TABLE IF EXISTS parsed_practical_applications CASCADE;

-- Create the main table
CREATE TABLE parsed_practical_applications (
  id SERIAL PRIMARY KEY,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  application_text TEXT NOT NULL,
  application_index INTEGER NOT NULL, -- Position in original array (0-based)

  -- AI-generated tags
  primary_armor_piece_id INTEGER REFERENCES armor_pieces(id),
  secondary_armor_piece_ids INTEGER[], -- Can match multiple pieces
  battle_tags TEXT[], -- ['fear', 'doubt', etc.]
  extracted_keywords TEXT[],

  -- Relevance scores (for ranking)
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(book_name, chapter_number, application_index)
);

-- Create indexes for fast lookups
CREATE INDEX idx_ppa_armor ON parsed_practical_applications(primary_armor_piece_id);
CREATE INDEX idx_ppa_battle_tags ON parsed_practical_applications USING GIN(battle_tags);
CREATE INDEX idx_ppa_book_chapter ON parsed_practical_applications(book_name, chapter_number);
CREATE INDEX idx_ppa_keywords ON parsed_practical_applications USING GIN(extracted_keywords);

-- Create user tracking table
CREATE TABLE user_seen_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES parsed_practical_applications(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES user_battles(id) ON DELETE CASCADE,
  seen_at TIMESTAMP DEFAULT NOW(),
  was_helpful BOOLEAN, -- Optional user feedback

  UNIQUE(user_id, application_id, battle_id)
);

CREATE INDEX idx_usa_user ON user_seen_applications(user_id);
CREATE INDEX idx_usa_battle ON user_seen_applications(battle_id);

-- Insert the 7th armor piece (Prayer) if it doesn't exist
INSERT INTO armor_pieces (armor_name, scripture_reference, description, week_order, icon_name)
VALUES ('Prayer', 'Ephesians 6:18', 'Praying always with all prayer and supplication in the Spirit', 7, '🙏')
ON CONFLICT DO NOTHING;

-- Verify armor pieces
SELECT * FROM armor_pieces ORDER BY week_order;
