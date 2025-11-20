-- Generated Character Profile Import
-- Created: 2025-11-20T12:34:21.700Z
--
-- Run this in Supabase SQL Editor after running the migration
-- ============================================

BEGIN;

-- ============================================
-- UPDATE character profiles
-- ============================================

-- Abraham
UPDATE bible_characters SET
  era = 'Patriarchs',
  tribe = NULL,
  key_locations = ARRAY['Ur', 'Haran', 'Canaan', 'Egypt']::TEXT[],
  known_for = ARRAY['Father of faith', 'Covenant with God', 'Willingness to sacrifice Isaac']::TEXT[],
  character_traits = ARRAY['Faith', 'Obedience', 'Hospitality', 'Trust', 'Patience']::TEXT[]
WHERE name = 'Abraham';

-- Daniel
UPDATE bible_characters SET
  era = 'Exile',
  tribe = 'Judah',
  key_locations = ARRAY['Jerusalem', 'Babylon', 'Lions'' den']::TEXT[],
  known_for = ARRAY['Interpreted dreams', 'Survived lions'' den', 'Prophetic visions']::TEXT[],
  character_traits = ARRAY['Integrity', 'Courage', 'Wisdom', 'Prayer', 'Faithfulness']::TEXT[]
WHERE name = 'Daniel';

-- David
UPDATE bible_characters SET
  era = 'United Monarchy',
  tribe = 'Judah',
  key_locations = ARRAY['Bethlehem', 'Jerusalem', 'Wilderness of En Gedi', 'Hebron']::TEXT[],
  known_for = ARRAY['Defeated Goliath', 'Unified Israel as King', 'Wrote many Psalms']::TEXT[],
  character_traits = ARRAY['Courage', 'Worship', 'Repentance', 'Leadership', 'Passion']::TEXT[]
WHERE name = 'David';

-- Deborah
UPDATE bible_characters SET
  era = 'Judges',
  tribe = 'Ephraim',
  key_locations = ARRAY['Hill country of Ephraim', 'Mount Tabor']::TEXT[],
  known_for = ARRAY['Prophet and judge of Israel', 'Led victory over Canaanites']::TEXT[],
  character_traits = ARRAY['Wisdom', 'Leadership', 'Courage', 'Faith', 'Justice']::TEXT[]
WHERE name = 'Deborah';

-- Elijah
UPDATE bible_characters SET
  era = 'Divided Kingdom',
  tribe = NULL,
  key_locations = ARRAY['Mount Carmel', 'Brook Cherith', 'Zarephath', 'Mount Horeb']::TEXT[],
  known_for = ARRAY['Confronted prophets of Baal', 'Taken to heaven in chariot', 'Fed by ravens']::TEXT[],
  character_traits = ARRAY['Boldness', 'Faith', 'Zeal', 'Courage', 'Devotion']::TEXT[]
WHERE name = 'Elijah';

-- Esther
UPDATE bible_characters SET
  era = 'Exile',
  tribe = 'Benjamin',
  key_locations = ARRAY['Susa', 'Persia']::TEXT[],
  known_for = ARRAY['Saved Jewish people from genocide', 'Queen of Persia', 'Brave approach to king']::TEXT[],
  character_traits = ARRAY['Courage', 'Wisdom', 'Selflessness', 'Strategic thinking', 'Faith']::TEXT[]
WHERE name = 'Esther';

-- Gideon
UPDATE bible_characters SET
  era = 'Judges',
  tribe = 'Manasseh',
  key_locations = ARRAY['Ophrah', 'Valley of Jezreel']::TEXT[],
  known_for = ARRAY['Defeated Midianites with 300 men', 'Asked for signs from God']::TEXT[],
  character_traits = ARRAY['Faith', 'Obedience', 'Humility', 'Courage', 'Doubt']::TEXT[]
WHERE name = 'Gideon';

-- Hosea
UPDATE bible_characters SET
  era = 'Divided Kingdom',
  tribe = NULL,
  key_locations = ARRAY['Northern Kingdom of Israel']::TEXT[],
  known_for = ARRAY['Married unfaithful wife as prophetic sign', 'Prophesied God''s love']::TEXT[],
  character_traits = ARRAY['Faithfulness', 'Obedience', 'Perseverance', 'Love', 'Forgiveness']::TEXT[]
WHERE name = 'Hosea';

-- Isaiah
UPDATE bible_characters SET
  era = 'Divided Kingdom',
  tribe = NULL,
  key_locations = ARRAY['Jerusalem', 'Judah']::TEXT[],
  known_for = ARRAY['Prophesied coming Messiah', 'Vision of God''s throne', 'Called by God']::TEXT[],
  character_traits = ARRAY['Holiness', 'Obedience', 'Boldness', 'Vision', 'Dedication']::TEXT[]
WHERE name = 'Isaiah';

-- Jacob
UPDATE bible_characters SET
  era = 'Patriarchs',
  tribe = NULL,
  key_locations = ARRAY['Canaan', 'Haran', 'Bethel', 'Peniel']::TEXT[],
  known_for = ARRAY['Wrestled with God', 'Father of 12 tribes', 'Deceived for birthright']::TEXT[],
  character_traits = ARRAY['Perseverance', 'Transformation', 'Cunning', 'Faith', 'Determination']::TEXT[]
WHERE name = 'Jacob';

-- Jeremiah
UPDATE bible_characters SET
  era = 'Exile',
  tribe = 'Benjamin',
  key_locations = ARRAY['Jerusalem', 'Anathoth', 'Egypt']::TEXT[],
  known_for = ARRAY['Weeping prophet', 'Warned of Jerusalem''s fall', 'Faithful despite rejection']::TEXT[],
  character_traits = ARRAY['Faithfulness', 'Courage', 'Compassion', 'Perseverance', 'Obedience']::TEXT[]
WHERE name = 'Jeremiah';

-- Jesus Christ
UPDATE bible_characters SET
  era = 'Life of Christ',
  tribe = 'Judah',
  key_locations = ARRAY['Bethlehem', 'Nazareth', 'Jerusalem', 'Galilee']::TEXT[],
  known_for = ARRAY['Son of God', 'Died for humanity''s sins', 'Rose from the dead']::TEXT[],
  character_traits = ARRAY['Love', 'Holiness', 'Compassion', 'Authority', 'Humility']::TEXT[]
WHERE name = 'Jesus Christ';

-- Job
UPDATE bible_characters SET
  era = 'Patriarchs',
  tribe = NULL,
  key_locations = ARRAY['Land of Uz']::TEXT[],
  known_for = ARRAY['Endured suffering faithfully', 'Questioned God', 'Restored double']::TEXT[],
  character_traits = ARRAY['Patience', 'Integrity', 'Faithfulness', 'Perseverance', 'Humility']::TEXT[]
WHERE name = 'Job';

-- John
UPDATE bible_characters SET
  era = 'Early Church',
  tribe = NULL,
  key_locations = ARRAY['Galilee', 'Jerusalem', 'Patmos', 'Ephesus']::TEXT[],
  known_for = ARRAY['Beloved disciple', 'Wrote Gospel and Revelation', 'Exiled to Patmos']::TEXT[],
  character_traits = ARRAY['Love', 'Devotion', 'Boldness', 'Vision', 'Faithfulness']::TEXT[]
WHERE name = 'John';

-- Jonah
UPDATE bible_characters SET
  era = 'Divided Kingdom',
  tribe = NULL,
  key_locations = ARRAY['Nineveh', 'Tarshish', 'Belly of fish']::TEXT[],
  known_for = ARRAY['Swallowed by great fish', 'Preached to Nineveh', 'Ran from God']::TEXT[],
  character_traits = ARRAY['Disobedience', 'Repentance', 'Reluctance', 'Anger', 'Obedience']::TEXT[]
WHERE name = 'Jonah';

-- Jonathan
UPDATE bible_characters SET
  era = 'United Monarchy',
  tribe = 'Benjamin',
  key_locations = ARRAY['Gibeah', 'Philistine garrison', 'Wilderness']::TEXT[],
  known_for = ARRAY['Covenant friendship with David', 'Military valor', 'Selfless loyalty']::TEXT[],
  character_traits = ARRAY['Loyalty', 'Courage', 'Selflessness', 'Honor', 'Faith']::TEXT[]
WHERE name = 'Jonathan';

-- Joseph
UPDATE bible_characters SET
  era = 'Egyptian Bondage',
  tribe = NULL,
  key_locations = ARRAY['Canaan', 'Egypt', 'Prison', 'Pharaoh''s palace']::TEXT[],
  known_for = ARRAY['Sold into slavery by brothers', 'Interpreted dreams', 'Saved Egypt from famine']::TEXT[],
  character_traits = ARRAY['Integrity', 'Forgiveness', 'Wisdom', 'Faithfulness', 'Leadership']::TEXT[]
WHERE name = 'Joseph';

-- Joshua
UPDATE bible_characters SET
  era = 'Conquest',
  tribe = 'Ephraim',
  key_locations = ARRAY['Wilderness', 'Jericho', 'Ai', 'Canaan']::TEXT[],
  known_for = ARRAY['Led conquest of Canaan', 'Walls of Jericho fell', 'Succeeded Moses']::TEXT[],
  character_traits = ARRAY['Courage', 'Obedience', 'Leadership', 'Faith', 'Strategic']::TEXT[]
WHERE name = 'Joshua';

-- Mary
UPDATE bible_characters SET
  era = 'Life of Christ',
  tribe = 'Judah',
  key_locations = ARRAY['Nazareth', 'Bethlehem', 'Jerusalem', 'Cana']::TEXT[],
  known_for = ARRAY['Mother of Jesus', 'Virgin birth', 'Pondered things in her heart']::TEXT[],
  character_traits = ARRAY['Obedience', 'Faith', 'Humility', 'Devotion', 'Trust']::TEXT[]
WHERE name = 'Mary';

-- Mary Magdalene
UPDATE bible_characters SET
  era = 'Life of Christ',
  tribe = NULL,
  key_locations = ARRAY['Magdala', 'Galilee', 'Jerusalem', 'Tomb']::TEXT[],
  known_for = ARRAY['First witness to resurrection', 'Delivered from demons', 'Devoted follower']::TEXT[],
  character_traits = ARRAY['Devotion', 'Courage', 'Faithfulness', 'Gratitude', 'Love']::TEXT[]
WHERE name = 'Mary Magdalene';

-- Moses
UPDATE bible_characters SET
  era = 'Exodus & Wilderness',
  tribe = 'Levi',
  key_locations = ARRAY['Egypt', 'Mount Sinai', 'Wilderness', 'Midian']::TEXT[],
  known_for = ARRAY['Led Exodus from Egypt', 'Received Ten Commandments', 'Parted Red Sea']::TEXT[],
  character_traits = ARRAY['Humility', 'Obedience', 'Leadership', 'Courage', 'Intercession']::TEXT[]
WHERE name = 'Moses';

-- Nehemiah
UPDATE bible_characters SET
  era = 'Post-Exile',
  tribe = 'Judah',
  key_locations = ARRAY['Susa', 'Jerusalem']::TEXT[],
  known_for = ARRAY['Rebuilt Jerusalem''s walls', 'Reformed the people', 'Cupbearer to king']::TEXT[],
  character_traits = ARRAY['Leadership', 'Prayer', 'Courage', 'Determination', 'Organization']::TEXT[]
WHERE name = 'Nehemiah';

-- Paul
UPDATE bible_characters SET
  era = 'Early Church',
  tribe = 'Benjamin',
  key_locations = ARRAY['Tarsus', 'Damascus', 'Jerusalem', 'Rome']::TEXT[],
  known_for = ARRAY['Converted on Damascus road', 'Missionary journeys', 'Wrote many epistles']::TEXT[],
  character_traits = ARRAY['Zeal', 'Transformation', 'Perseverance', 'Boldness', 'Love']::TEXT[]
WHERE name = 'Paul';

-- Peter
UPDATE bible_characters SET
  era = 'Early Church',
  tribe = NULL,
  key_locations = ARRAY['Galilee', 'Caesarea Philippi', 'Jerusalem', 'Rome']::TEXT[],
  known_for = ARRAY['Walked on water', 'Denied Jesus three times', 'Leader of early church']::TEXT[],
  character_traits = ARRAY['Boldness', 'Impulsiveness', 'Repentance', 'Leadership', 'Faith']::TEXT[]
WHERE name = 'Peter';

-- Ruth
UPDATE bible_characters SET
  era = 'Judges',
  tribe = NULL,
  key_locations = ARRAY['Moab', 'Bethlehem']::TEXT[],
  known_for = ARRAY['Loyalty to Naomi', 'Married Boaz', 'Ancestor of David']::TEXT[],
  character_traits = ARRAY['Loyalty', 'Faithfulness', 'Devotion', 'Kindness', 'Humility']::TEXT[]
WHERE name = 'Ruth';

-- Samson
UPDATE bible_characters SET
  era = 'Judges',
  tribe = 'Dan',
  key_locations = ARRAY['Zorah', 'Gaza', 'Valley of Sorek']::TEXT[],
  known_for = ARRAY['Supernatural strength', 'Killed lion', 'Betrayed by Delilah']::TEXT[],
  character_traits = ARRAY['Strength', 'Impulsiveness', 'Passion', 'Vengeance', 'Repentance']::TEXT[]
WHERE name = 'Samson';

-- Solomon
UPDATE bible_characters SET
  era = 'United Monarchy',
  tribe = 'Judah',
  key_locations = ARRAY['Jerusalem', 'Temple']::TEXT[],
  known_for = ARRAY['Wisest man', 'Built the Temple', 'Wrote Proverbs and Ecclesiastes']::TEXT[],
  character_traits = ARRAY['Wisdom', 'Wealth', 'Leadership', 'Pride', 'Compromise']::TEXT[]
WHERE name = 'Solomon';

-- The Prodigal Son
UPDATE bible_characters SET
  era = 'Life of Christ',
  tribe = NULL,
  key_locations = ARRAY['Father''s house', 'Distant country']::TEXT[],
  known_for = ARRAY['Squandered inheritance', 'Returned to father', 'Parable of grace']::TEXT[],
  character_traits = ARRAY['Rebellion', 'Repentance', 'Humility', 'Restoration', 'Gratitude']::TEXT[]
WHERE name = 'The Prodigal Son';

-- Thomas
UPDATE bible_characters SET
  era = 'Early Church',
  tribe = NULL,
  key_locations = ARRAY['Galilee', 'Jerusalem', 'Upper room']::TEXT[],
  known_for = ARRAY['Doubted resurrection', 'My Lord and my God declaration', 'Willing to die with Jesus']::TEXT[],
  character_traits = ARRAY['Doubt', 'Loyalty', 'Courage', 'Honesty', 'Faith']::TEXT[]
WHERE name = 'Thomas';


-- ============================================
-- INSERT relationships
-- ============================================

-- Abraham -> Sarah (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Sarah',
  'spouse',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Sarah'
WHERE c.name = 'Abraham';

-- Abraham -> Isaac (child)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Isaac',
  'child',
  'Son of promise'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Isaac'
WHERE c.name = 'Abraham';

-- Abraham -> Lot (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Lot',
  'sibling',
  'Nephew'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Lot'
WHERE c.name = 'Abraham';

-- Daniel -> Shadrach (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Shadrach',
  'friend',
  'Fellow exile'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Shadrach'
WHERE c.name = 'Daniel';

-- Daniel -> Meshach (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Meshach',
  'friend',
  'Fellow exile'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Meshach'
WHERE c.name = 'Daniel';

-- Daniel -> Abednego (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Abednego',
  'friend',
  'Fellow exile'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Abednego'
WHERE c.name = 'Daniel';

-- David -> Jesse (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesse',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesse'
WHERE c.name = 'David';

-- David -> Jonathan (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jonathan',
  'friend',
  'Covenant friendship'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jonathan'
WHERE c.name = 'David';

-- David -> Saul (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Saul',
  'rival',
  'Also father-in-law'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Saul'
WHERE c.name = 'David';

-- David -> Bathsheba (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Bathsheba',
  'spouse',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Bathsheba'
WHERE c.name = 'David';

-- David -> Solomon (child)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Solomon',
  'child',
  'by Bathsheba, successor'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Solomon'
WHERE c.name = 'David';

-- David -> Samuel (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Samuel',
  'mentor',
  'Anointed David as king'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Samuel'
WHERE c.name = 'David';

-- Deborah -> Barak (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Barak',
  'student',
  'Military commander she led'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Barak'
WHERE c.name = 'Deborah';

-- Elijah -> Elisha (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Elisha',
  'student',
  'Successor prophet'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Elisha'
WHERE c.name = 'Elijah';

-- Elijah -> Ahab (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Ahab',
  'rival',
  'Wicked king of Israel'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Ahab'
WHERE c.name = 'Elijah';

-- Elijah -> Jezebel (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jezebel',
  'rival',
  'Queen who persecuted prophets'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jezebel'
WHERE c.name = 'Elijah';

-- Esther -> Mordecai (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Mordecai',
  'father',
  'Adoptive father, cousin'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Mordecai'
WHERE c.name = 'Esther';

-- Esther -> Xerxes (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Xerxes',
  'spouse',
  'King of Persia'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Xerxes'
WHERE c.name = 'Esther';

-- Esther -> Haman (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Haman',
  'rival',
  'Plotted genocide of Jews'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Haman'
WHERE c.name = 'Esther';

-- Gideon -> Joash (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Joash',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Joash'
WHERE c.name = 'Gideon';

-- Jacob -> Isaac (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Isaac',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Isaac'
WHERE c.name = 'Jacob';

-- Jacob -> Rebekah (mother)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Rebekah',
  'mother',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Rebekah'
WHERE c.name = 'Jacob';

-- Jacob -> Esau (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Esau',
  'sibling',
  'Twin brother'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Esau'
WHERE c.name = 'Jacob';

-- Jacob -> Rachel (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Rachel',
  'spouse',
  'Beloved wife'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Rachel'
WHERE c.name = 'Jacob';

-- Jacob -> Leah (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Leah',
  'spouse',
  'First wife'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Leah'
WHERE c.name = 'Jacob';

-- Jacob -> Joseph (child)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Joseph',
  'child',
  'Favorite son'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Joseph'
WHERE c.name = 'Jacob';

-- Jacob -> Abraham (predecessor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Abraham',
  'predecessor',
  'Grandfather'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Abraham'
WHERE c.name = 'Jacob';

-- Jesus Christ -> Mary (mother)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Mary',
  'mother',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Mary'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> Joseph (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Joseph',
  'father',
  'Earthly father'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Joseph'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> John (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'John',
  'friend',
  'Beloved disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'John'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> Peter (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Peter',
  'student',
  'Disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Peter'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> Thomas (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Thomas',
  'student',
  'Disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Thomas'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> Mary Magdalene (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Mary Magdalene',
  'friend',
  'Devoted follower'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Mary Magdalene'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> David (predecessor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'David',
  'predecessor',
  'Ancestor, Son of David'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'David'
WHERE c.name = 'Jesus Christ';

-- Jesus Christ -> Abraham (predecessor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Abraham',
  'predecessor',
  'Ancestor'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Abraham'
WHERE c.name = 'Jesus Christ';

-- John -> Jesus Christ (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'mentor',
  'Beloved disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'John';

-- John -> Peter (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Peter',
  'friend',
  'Fellow apostle'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Peter'
WHERE c.name = 'John';

-- John -> James (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'James',
  'sibling',
  'Brother, son of Zebedee'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'James'
WHERE c.name = 'John';

-- Jonathan -> Saul (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Saul',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Saul'
WHERE c.name = 'Jonathan';

-- Jonathan -> David (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'David',
  'friend',
  'Covenant friendship'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'David'
WHERE c.name = 'Jonathan';

-- Joseph -> Jacob (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jacob',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jacob'
WHERE c.name = 'Joseph';

-- Joseph -> Rachel (mother)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Rachel',
  'mother',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Rachel'
WHERE c.name = 'Joseph';

-- Joseph -> Benjamin (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Benjamin',
  'sibling',
  'Full brother'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Benjamin'
WHERE c.name = 'Joseph';

-- Joseph -> Judah (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Judah',
  'sibling',
  'Half brother'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Judah'
WHERE c.name = 'Joseph';

-- Joseph -> Abraham (predecessor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Abraham',
  'predecessor',
  'Great-grandfather'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Abraham'
WHERE c.name = 'Joseph';

-- Joshua -> Moses (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Moses',
  'mentor',
  'Successor'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Moses'
WHERE c.name = 'Joshua';

-- Joshua -> Caleb (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Caleb',
  'friend',
  'Fellow faithful spy'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Caleb'
WHERE c.name = 'Joshua';

-- Mary -> Jesus Christ (child)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'child',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'Mary';

-- Mary -> Joseph (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Joseph',
  'spouse',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Joseph'
WHERE c.name = 'Mary';

-- Mary -> Elizabeth (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Elizabeth',
  'friend',
  'Cousin, mother of John the Baptist'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Elizabeth'
WHERE c.name = 'Mary';

-- Mary Magdalene -> Jesus Christ (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'mentor',
  'Devoted follower'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'Mary Magdalene';

-- Moses -> Aaron (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Aaron',
  'sibling',
  'Brother, high priest'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Aaron'
WHERE c.name = 'Moses';

-- Moses -> Miriam (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Miriam',
  'sibling',
  'Sister, prophetess'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Miriam'
WHERE c.name = 'Moses';

-- Moses -> Joshua (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Joshua',
  'student',
  'Successor'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Joshua'
WHERE c.name = 'Moses';

-- Moses -> Pharaoh (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Pharaoh',
  'rival',
  'King of Egypt'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Pharaoh'
WHERE c.name = 'Moses';

-- Nehemiah -> Ezra (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Ezra',
  'friend',
  'Fellow reformer'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Ezra'
WHERE c.name = 'Nehemiah';

-- Paul -> Barnabas (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Barnabas',
  'friend',
  'Ministry partner'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Barnabas'
WHERE c.name = 'Paul';

-- Paul -> Timothy (student)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Timothy',
  'student',
  'Son in the faith'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Timothy'
WHERE c.name = 'Paul';

-- Paul -> Silas (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Silas',
  'friend',
  'Missionary companion'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Silas'
WHERE c.name = 'Paul';

-- Paul -> Peter (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Peter',
  'friend',
  'Fellow apostle'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Peter'
WHERE c.name = 'Paul';

-- Peter -> Jesus Christ (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'mentor',
  'Disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'Peter';

-- Peter -> John (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'John',
  'friend',
  'Fellow apostle'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'John'
WHERE c.name = 'Peter';

-- Peter -> Andrew (sibling)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Andrew',
  'sibling',
  'Brother'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Andrew'
WHERE c.name = 'Peter';

-- Peter -> Paul (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Paul',
  'friend',
  'Fellow apostle'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Paul'
WHERE c.name = 'Peter';

-- Ruth -> Naomi (mother)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Naomi',
  'mother',
  'Mother-in-law'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Naomi'
WHERE c.name = 'Ruth';

-- Ruth -> Boaz (spouse)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Boaz',
  'spouse',
  'Kinsman redeemer'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Boaz'
WHERE c.name = 'Ruth';

-- Ruth -> Obed (child)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Obed',
  'child',
  'Grandfather of David'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Obed'
WHERE c.name = 'Ruth';

-- Ruth -> David (successor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'David',
  'successor',
  'Great-grandmother'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'David'
WHERE c.name = 'Ruth';

-- Samson -> Manoah (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Manoah',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Manoah'
WHERE c.name = 'Samson';

-- Samson -> Delilah (rival)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Delilah',
  'rival',
  'Betrayed him'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Delilah'
WHERE c.name = 'Samson';

-- Solomon -> David (father)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'David',
  'father',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'David'
WHERE c.name = 'Solomon';

-- Solomon -> Bathsheba (mother)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Bathsheba',
  'mother',
  NULL
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Bathsheba'
WHERE c.name = 'Solomon';

-- Solomon -> Jesus Christ (successor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'successor',
  'Ancestor'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'Solomon';

-- Thomas -> Jesus Christ (mentor)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Jesus Christ',
  'mentor',
  'Disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Jesus Christ'
WHERE c.name = 'Thomas';

-- Thomas -> Peter (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'Peter',
  'friend',
  'Fellow disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'Peter'
WHERE c.name = 'Thomas';

-- Thomas -> John (friend)
INSERT INTO character_relationships (character_id, related_character_id, related_character_name, relationship_type, notes)
SELECT
  c.id,
  r.id,
  'John',
  'friend',
  'Fellow disciple'
FROM bible_characters c
LEFT JOIN bible_characters r ON r.name = 'John'
WHERE c.name = 'Thomas';


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
