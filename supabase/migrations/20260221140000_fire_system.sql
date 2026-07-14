-- ============================================
-- FIRE SYSTEM - ACCOUNTABILITY GROUPS
-- ============================================

-- Fires table - small accountability groups
CREATE TABLE IF NOT EXISTS fires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT name_length CHECK (char_length(name) >= 3),
  CONSTRAINT max_members_limit CHECK (max_members >= 2 AND max_members <= 12)
);

-- Fire members table
CREATE TABLE IF NOT EXISTS fire_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fire_id UUID NOT NULL REFERENCES fires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_fire_member UNIQUE(fire_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('creator', 'admin', 'member'))
);

-- Fire shared content table
CREATE TABLE IF NOT EXISTS fire_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fire_id UUID NOT NULL REFERENCES fires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What's being shared
  share_type VARCHAR(20) NOT NULL,
  saved_application_id UUID REFERENCES user_saved_applications(id) ON DELETE CASCADE,

  -- Share content
  message TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_share_type CHECK (share_type IN ('arsenal', 'theme_discovery', 'prayer_request', 'encouragement'))
);

-- Comments on shares
CREATE TABLE IF NOT EXISTS fire_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fire_share_id UUID NOT NULL REFERENCES fire_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT comment_not_empty CHECK (char_length(trim(comment_text)) > 0)
);

-- Reactions to shares
CREATE TABLE IF NOT EXISTS fire_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fire_share_id UUID NOT NULL REFERENCES fire_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_reaction UNIQUE(fire_share_id, user_id),
  CONSTRAINT valid_reaction CHECK (reaction_type IN ('pray', 'amen', 'encouraged', 'grateful'))
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fires_created_by ON fires(created_by);
CREATE INDEX IF NOT EXISTS idx_fires_invite_code ON fires(invite_code);
CREATE INDEX IF NOT EXISTS idx_fire_members_fire ON fire_members(fire_id);
CREATE INDEX IF NOT EXISTS idx_fire_members_user ON fire_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_shares_fire ON fire_shares(fire_id);
CREATE INDEX IF NOT EXISTS idx_fire_shares_user ON fire_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_shares_created ON fire_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fire_comments_share ON fire_comments(fire_share_id);
CREATE INDEX IF NOT EXISTS idx_fire_reactions_share ON fire_reactions(fire_share_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE fires ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_reactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view fires they're members of, or lookup by invite
CREATE POLICY "Users can view fires"
  ON fires FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Can always view fires you're a member of
      EXISTS (
        SELECT 1 FROM fire_members
        WHERE fire_members.fire_id = fires.id
          AND fire_members.user_id = auth.uid()
      )
      -- Or just looking up any fire (to join it)
      OR is_active = true
    )
  );

CREATE POLICY "Users can create fires"
  ON fires FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Fire creators can update their fires"
  ON fires FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Fire creators can delete their fires"
  ON fires FOR DELETE
  USING (auth.uid() = created_by);

-- Fire members: visible to other members
CREATE POLICY "Fire members can view members"
  ON fire_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fire_members fm
      WHERE fm.fire_id = fire_members.fire_id
        AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join fires"
  ON fire_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave fires"
  ON fire_members FOR DELETE
  USING (auth.uid() = user_id);

-- Fire shares: visible to fire members
CREATE POLICY "Fire members can view shares"
  ON fire_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fire_members
      WHERE fire_members.fire_id = fire_shares.fire_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Fire members can create shares"
  ON fire_shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM fire_members
      WHERE fire_members.fire_id = fire_shares.fire_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shares"
  ON fire_shares FOR DELETE
  USING (auth.uid() = user_id);

-- Fire comments: visible to fire members
CREATE POLICY "Fire members can view comments"
  ON fire_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fire_shares
      JOIN fire_members ON fire_members.fire_id = fire_shares.fire_id
      WHERE fire_shares.id = fire_comments.fire_share_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Fire members can create comments"
  ON fire_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM fire_shares
      JOIN fire_members ON fire_members.fire_id = fire_shares.fire_id
      WHERE fire_shares.id = fire_comments.fire_share_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON fire_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Fire reactions: visible to fire members
CREATE POLICY "Fire members can view reactions"
  ON fire_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fire_shares
      JOIN fire_members ON fire_members.fire_id = fire_shares.fire_id
      WHERE fire_shares.id = fire_reactions.fire_share_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Fire members can create reactions"
  ON fire_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM fire_shares
      JOIN fire_members ON fire_members.fire_id = fire_shares.fire_id
      WHERE fire_shares.id = fire_reactions.fire_share_id
        AND fire_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reactions"
  ON fire_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on fires
CREATE TRIGGER update_fires_updated_at
  BEFORE UPDATE ON fires
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on fire_shares
CREATE TRIGGER update_fire_shares_updated_at
  BEFORE UPDATE ON fire_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Generate Invite Code
-- ============================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
