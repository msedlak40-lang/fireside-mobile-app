/**
 * Generate 365 Daily Devotions for 2026
 *
 * This script reads practical applications from export_practical_applications.json
 * and generates daily devotions for every day of 2026.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monthly themes for 2026
const MONTHLY_THEMES = {
  1: 'New Beginnings: Starting the Year with God',
  2: 'Love & Relationships: God\'s Design for Connection',
  3: 'Faith in Action: Living Out What You Believe',
  4: 'Resurrection Power: The Hope of Easter',
  5: 'Growth & Transformation: Becoming More Like Christ',
  6: 'Purpose & Calling: Discovering God\'s Plan',
  7: 'Freedom in Christ: Breaking Chains',
  8: 'Spiritual Warfare: Standing Firm',
  9: 'Wisdom & Discernment: Making Godly Choices',
  10: 'Gratitude & Worship: A Thankful Heart',
  11: 'Community & Fellowship: Living Together',
  12: 'Hope & Expectation: Preparing for Christ\'s Return'
};

// Load the data
console.log('Loading practical applications data...');
const dataPath = path.join(__dirname, '..', 'export_practical_applications.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

const practicalApplications = data[0].combined_export.practical_applications;
console.log(`Loaded ${practicalApplications.length} chapters with practical applications`);

// Helper function to get date string
function getDateString(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Helper function to escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// Helper function to create verse reference
function createVerseReference(bookName, chapter, verseNum = 1) {
  return `${bookName} ${chapter}:${verseNum}`;
}

// Helper function to generate devotional text from practical application
function generateDevotionalText(application, bookName, chapter) {
  // Extract the core message from the application
  const appText = application.replace(/^From [^:]+:\s*/, '');

  return `Today we turn to ${bookName} ${chapter}, a passage rich with practical wisdom for our daily walk with God.

${appText}

This truth from Scripture isn't meant to simply inform us—it's meant to transform us. God's Word always calls us to action, to a life that reflects His character and purposes.

Consider how this principle applies to your life right now. Where is God inviting you to grow? What step of obedience is He calling you to take? The beauty of Scripture is that it speaks into every season of life, offering guidance, correction, and encouragement exactly when we need it.

As you reflect on this passage today, ask the Holy Spirit to illuminate areas where you can apply this truth. God's Word is living and active, sharper than any two-edged sword. Let it do its work in your heart.`;
}

// Helper function to generate today's challenge
function generateChallenge(application) {
  const appText = application.replace(/^From [^:]+:\s*/, '');

  // Create actionable challenge based on the application
  if (appText.toLowerCase().includes('pray')) {
    return 'Set aside 15 minutes today for focused prayer, bringing this truth before God and asking Him to make it real in your life.';
  } else if (appText.toLowerCase().includes('relationship') || appText.toLowerCase().includes('community')) {
    return 'Reach out to one person today and share how God is working in your life, or encourage them with this biblical truth.';
  } else if (appText.toLowerCase().includes('serve') || appText.toLowerCase().includes('service')) {
    return 'Look for one practical way to serve someone today, whether at home, work, or in your community.';
  } else if (appText.toLowerCase().includes('trust') || appText.toLowerCase().includes('faith')) {
    return 'Identify one area where you\'ve been relying on your own strength instead of God\'s, and consciously surrender it to Him today.';
  } else {
    return 'Take one concrete step today to put this biblical principle into practice in your daily life.';
  }
}

// Helper function to generate prayer starter
function generatePrayerStarter(application, bookName) {
  return `"Father, thank You for Your Word and the wisdom found in ${bookName}. Help me to not just hear these truths but to live them out. Give me the courage and strength to apply what You're teaching me today. Transform my heart and renew my mind through Your Spirit. In Jesus' name, Amen."`;
}

// Helper function to create devotion title
function createTitle(application, bookName) {
  const appText = application.toLowerCase();

  if (appText.includes('prayer') || appText.includes('pray')) {
    return 'The Power of Prayer in Action';
  } else if (appText.includes('trust') || appText.includes('faith')) {
    return 'Living by Faith, Not by Sight';
  } else if (appText.includes('serve') || appText.includes('service')) {
    return 'Called to Serve with Excellence';
  } else if (appText.includes('love') || appText.includes('compassion')) {
    return 'Love That Transforms Lives';
  } else if (appText.includes('obey') || appText.includes('obedience')) {
    return 'The Path of Obedience';
  } else if (appText.includes('wisdom') || appText.includes('discern')) {
    return 'Seeking God\'s Wisdom';
  } else if (appText.includes('strength') || appText.includes('power')) {
    return 'Strength for the Journey';
  } else if (appText.includes('hope')) {
    return 'Hope That Anchors the Soul';
  } else if (appText.includes('grace')) {
    return 'Living in God\'s Grace';
  } else if (appText.includes('covenant') || appText.includes('promise')) {
    return 'Standing on God\'s Promises';
  } else {
    return `Lessons from ${bookName}`;
  }
}

// Helper function to extract theme
function extractTheme(application) {
  const appText = application.toLowerCase();

  if (appText.includes('prayer')) return 'Prayer';
  if (appText.includes('faith') || appText.includes('trust')) return 'Faith';
  if (appText.includes('obey') || appText.includes('obedience')) return 'Obedience';
  if (appText.includes('serve') || appText.includes('service')) return 'Service';
  if (appText.includes('love') || appText.includes('compassion')) return 'Love';
  if (appText.includes('wisdom')) return 'Wisdom';
  if (appText.includes('hope')) return 'Hope';
  if (appText.includes('grace')) return 'Grace';
  if (appText.includes('covenant')) return 'Covenant Faithfulness';
  if (appText.includes('strength') || appText.includes('power')) return 'God\'s Strength';
  if (appText.includes('leadership')) return 'Leadership';
  if (appText.includes('family') || appText.includes('generation')) return 'Generational Faithfulness';

  return 'Christian Living';
}

// Helper function to determine difficulty level
function getDifficultyLevel(bookName) {
  const narrativeBooks = ['Genesis', 'Exodus', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
                          '1 Kings', '2 Kings', 'Esther', 'Daniel', 'Jonah', 'Matthew', 'Mark',
                          'Luke', 'John', 'Acts'];
  const advancedBooks = ['Leviticus', 'Deuteronomy', 'Ezekiel', 'Romans', 'Hebrews', 'Revelation'];

  if (narrativeBooks.includes(bookName)) return 'beginner';
  if (advancedBooks.includes(bookName)) return 'advanced';
  return 'intermediate';
}

// Generate devotions for all 365 days of 2026
console.log('Generating 365 devotions for 2026...');

const devotions = [];
let dayIndex = 0;

for (let month = 1; month <= 12; month++) {
  const daysInMonth = new Date(2026, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    if (dayIndex >= practicalApplications.length) {
      console.error('Ran out of practical applications!');
      break;
    }

    const chapter = practicalApplications[dayIndex];
    const firstApp = chapter.applications[0]; // Use first application from each chapter

    const devotionDate = getDateString(2026, month, day);
    const bookName = chapter.book_name;
    const chapterNum = chapter.chapter_number;
    const verseRef = createVerseReference(bookName, chapterNum, 1);

    const devotion = {
      devotion_date: devotionDate,
      title: createTitle(firstApp, bookName),
      theme: extractTheme(firstApp),
      key_verse_reference: verseRef,
      key_verse_book: bookName,
      key_verse_chapter: chapterNum,
      key_verse_number: 1,
      key_verse_text: `[Verse text from ${verseRef}]`, // Placeholder - will need actual verse text
      devotional_text: generateDevotionalText(firstApp, bookName, chapterNum),
      today_challenge: generateChallenge(firstApp),
      prayer_starter: generatePrayerStarter(firstApp, bookName),
      monthly_theme: MONTHLY_THEMES[month],
      difficulty_level: getDifficultyLevel(bookName),
      target_audience: ['men', 'general']
    };

    devotions.push(devotion);
    dayIndex++;
  }
}

console.log(`Generated ${devotions.length} devotions`);

// Generate SQL INSERT statements
console.log('Generating SQL...');

let sql = `-- Daily Devotions for 2026
-- Generated from practical applications
-- Total devotions: ${devotions.length}

`;

devotions.forEach((dev, index) => {
  sql += `-- ${dev.devotion_date} - ${dev.title}\n`;
  sql += `INSERT INTO daily_devotions (
  devotion_date,
  title,
  theme,
  key_verse_reference,
  key_verse_book,
  key_verse_chapter,
  key_verse_number,
  key_verse_text,
  devotional_text,
  today_challenge,
  prayer_starter,
  monthly_theme,
  difficulty_level,
  target_audience
) VALUES (
  '${dev.devotion_date}',
  ${escapeSql(dev.title)},
  ${escapeSql(dev.theme)},
  ${escapeSql(dev.key_verse_reference)},
  ${escapeSql(dev.key_verse_book)},
  ${dev.key_verse_chapter},
  ${dev.key_verse_number},
  ${escapeSql(dev.key_verse_text)},
  ${escapeSql(dev.devotional_text)},
  ${escapeSql(dev.today_challenge)},
  ${escapeSql(dev.prayer_starter)},
  ${escapeSql(dev.monthly_theme)},
  ${escapeSql(dev.difficulty_level)},
  ARRAY[${dev.target_audience.map(a => `'${a}'`).join(', ')}]
);

`;
});

// Write to file
const outputPath = path.join(__dirname, 'insert_2026_devotions.sql');
fs.writeFileSync(outputPath, sql);

console.log(`\nSQL file generated: ${outputPath}`);
console.log(`\nTo import into Supabase:`);
console.log(`1. Open Supabase SQL Editor`);
console.log(`2. Copy and paste the contents of scripts/insert_2026_devotions.sql`);
console.log(`3. Run the query`);
console.log(`\nNote: You'll need to update the key_verse_text placeholders with actual verse text.`);
