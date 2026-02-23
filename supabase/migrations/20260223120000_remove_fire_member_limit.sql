-- Remove fire member limit
-- Makes fires unlimited in size

-- Make max_members nullable and default to NULL
ALTER TABLE fires
  ALTER COLUMN max_members DROP NOT NULL,
  ALTER COLUMN max_members SET DEFAULT NULL;

-- Remove any constraint that enforced 2-12 limit
ALTER TABLE fires
  DROP CONSTRAINT IF EXISTS max_members_limit;

-- Update existing fires to NULL (unlimited)
UPDATE fires SET max_members = NULL;
