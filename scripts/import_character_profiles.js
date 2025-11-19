/**
 * Import Character Profiles and Relationships
 *
 * Converts AI-generated JSON into SQL INSERT/UPDATE statements
 *
 * Usage:
 *   node scripts/import_character_profiles.js <input.json> <output.sql>
 *
 * Example:
 *   node scripts/import_character_profiles.js character_data.json import_characters.sql
 */

import fs from 'fs';
import path from 'path';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node import_character_profiles.js <input.json> <output.sql>');
  console.error('Example: node import_character_profiles.js character_data.json import_characters.sql');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Read and parse the JSON file
let data;
try {
  const jsonContent = fs.readFileSync(inputFile, 'utf-8');
  data = JSON.parse(jsonContent);
} catch (err) {
  console.error(`Error reading input file: ${err.message}`);
  process.exit(1);
}

const { character_updates = [], relationships = [] } = data;

// Helper to escape single quotes for SQL
const escapeSQL = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

// Helper to format array for PostgreSQL
const formatArray = (arr) => {
  if (!arr || arr.length === 0) return 'NULL';
  const escaped = arr.map(item => `"${String(item).replace(/"/g, '\\"').replace(/'/g, "''")}"`);
  return `ARRAY[${escaped.map(e => `'${e.slice(1, -1)}'`).join(', ')}]::TEXT[]`;
};

// Build SQL output
let sql = `-- Generated Character Profile Import
-- Created: ${new Date().toISOString()}
--
-- Run this in Supabase SQL Editor after running the migration
-- ============================================

BEGIN;

-- ============================================
-- UPDATE character profiles
-- ============================================

`;

// Generate UPDATE statements for character profiles
for (const char of character_updates) {
  sql += `-- ${char.name}
UPDATE bible_characters SET
  era = ${escapeSQL(char.era)},
  tribe = ${escapeSQL(char.tribe)},
  key_locations = ${formatArray(char.key_locations)},
  known_for = ${formatArray(char.known_for)},
  character_traits = ${formatArray(char.character_traits)}
WHERE name = ${escapeSQL(char.name)};

`;
}

sql += `
-- ============================================
-- INSERT relationships
-- ============================================

`;

// Generate INSERT statements for relationships
for (const rel of relationships) {
  sql += `-- ${rel.character_name} -> ${rel.related_name} (${rel.relationship_type})
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  ${escapeSQL(rel.related_name)},
  ${escapeSQL(rel.relationship_type)},
  ${escapeSQL(rel.notes)}
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = ${escapeSQL(rel.related_name)}
WHERE c.name = ${escapeSQL(rel.character_name)};

`;
}

sql += `
COMMIT;

-- ============================================
-- Verification queries
-- ============================================

-- Check updated characters:
-- SELECT name, era, tribe, known_for FROM bible_characters WHERE era IS NOT NULL LIMIT 10;

-- Check relationships:
-- SELECT
--   c.name as character,
--   r.related_character_name as related_to,
--   r.relationship_type,
--   r.notes
-- FROM character_relationships r
-- JOIN bible_characters c ON c.id = r.character_id
-- LIMIT 20;
`;

// Write the output file
try {
  fs.writeFileSync(outputFile, sql);
  console.log(`✅ Generated SQL file: ${outputFile}`);
  console.log(`   - ${character_updates.length} character updates`);
  console.log(`   - ${relationships.length} relationships`);
} catch (err) {
  console.error(`Error writing output file: ${err.message}`);
  process.exit(1);
}
