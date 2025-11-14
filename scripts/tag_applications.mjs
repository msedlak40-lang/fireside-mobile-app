/**
 * AI-Tag Practical Applications with Armor Pieces and Battle Tags
 *
 * Run with: node tag_applications.mjs
 *
 * Requirements:
 * - npm install @anthropic-ai/sdk @supabase/supabase-js
 * - Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const BATCH_SIZE = 20; // Process 20 applications at a time

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✅' : '❌');
  console.error('   - ANTHROPIC_API_KEY:', ANTHROPIC_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Armor piece mapping
const ARMOR_PIECES = {
  1: 'Belt of Truth',
  2: 'Breastplate of Righteousness',
  3: 'Shoes of Peace',
  4: 'Shield of Faith',
  5: 'Helmet of Salvation',
  6: 'Sword of the Spirit',
  7: 'Prayer'
};

const BATTLE_TAGS = ['fear', 'anger', 'temptation', 'doubt', 'loneliness', 'identity', 'purpose'];

/**
 * Fetch all applications from the database
 */
async function fetchAllApplications() {
  console.log('📚 Fetching all applications from database...');

  const { data, error } = await supabase
    .from('bible_chapter_summaries_strongs')
    .select('book_name, chapter_number, practical_applications')
    .not('practical_applications', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }

  // Flatten the array of arrays
  const applications = [];
  for (const chapter of data) {
    if (chapter.practical_applications && Array.isArray(chapter.practical_applications)) {
      chapter.practical_applications.forEach((app, index) => {
        applications.push({
          book_name: chapter.book_name,
          chapter_number: chapter.chapter_number,
          application_text: app,
          application_index: index
        });
      });
    }
  }

  console.log(`✅ Found ${applications.length} applications across ${data.length} chapters\n`);
  return applications;
}

/**
 * Use Claude AI to tag a batch of applications
 */
async function tagApplicationsBatch(applications) {
  const prompt = `You are a biblical scholar analyzing practical applications from Scripture. For each application below, identify:

1. **Primary Armor Piece** (the ONE piece that best fits):
   - 1 = Belt of Truth (honesty, reality, God's Word, confession)
   - 2 = Breastplate of Righteousness (holy living, integrity, purity)
   - 3 = Shoes of Peace (calm, rest, God's presence, readiness)
   - 4 = Shield of Faith (trust, belief, God's promises)
   - 5 = Helmet of Salvation (identity, security, eternal perspective)
   - 6 = Sword of the Spirit (Scripture as weapon, active resistance)
   - 7 = Prayer (communication with God, dependence, intercession)

2. **Battle Tags** (which struggles does this help with?):
   - fear, anger, temptation, doubt, loneliness, identity, purpose

3. **Keywords** (extract 3-5 key themes from the application)

4. **Confidence Score** (0.0-1.0, how confident are you in the primary armor piece match?)

Applications to analyze:
${applications.map((app, i) => `[${i}] ${app.application_text}`).join('\n\n')}

Respond with ONLY valid JSON in this exact format:
{
  "results": [
    {
      "index": 0,
      "primary_armor": 1,
      "secondary_armor": [4, 5],
      "battle_tags": ["fear", "doubt"],
      "keywords": ["trust", "faith", "God's promises"],
      "confidence": 0.95
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.results;

  } catch (error) {
    console.error('❌ AI tagging failed:', error.message);
    return null;
  }
}

/**
 * Insert tagged applications into database
 */
async function insertTaggedApplications(applications, tags) {
  const records = applications.map((app, i) => {
    const tag = tags[i];
    if (!tag) return null;

    return {
      book_name: app.book_name,
      chapter_number: app.chapter_number,
      application_text: app.application_text,
      application_index: app.application_index,
      primary_armor_piece_id: tag.primary_armor,
      secondary_armor_piece_ids: tag.secondary_armor || [],
      battle_tags: tag.battle_tags || [],
      extracted_keywords: tag.keywords || [],
      confidence_score: tag.confidence || 0.5
    };
  }).filter(Boolean);

  const { data, error } = await supabase
    .from('parsed_practical_applications')
    .upsert(records, {
      onConflict: 'book_name,chapter_number,application_index'
    });

  if (error) {
    throw new Error(`Failed to insert: ${error.message}`);
  }

  return records.length;
}

/**
 * Main processing function
 */
async function main() {
  console.log('🚀 Starting AI Tagging Process\n');
  console.log('='.repeat(60));

  try {
    // Fetch all applications
    const allApplications = await fetchAllApplications();

    // Process in batches
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allApplications.length; i += BATCH_SIZE) {
      const batch = allApplications.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allApplications.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} applications)...`);

      // Tag with AI
      const tags = await tagApplicationsBatch(batch);

      if (tags && tags.length > 0) {
        // Insert into database
        const insertedCount = await insertTaggedApplications(batch, tags);
        processedCount += insertedCount;

        console.log(`   ✅ Tagged and saved ${insertedCount} applications`);

        // Show sample result
        if (tags[0]) {
          console.log(`   📋 Sample: "${batch[0].application_text.substring(0, 60)}..."`);
          console.log(`      → Armor: ${ARMOR_PIECES[tags[0].primary_armor]}`);
          console.log(`      → Battles: ${tags[0].battle_tags.join(', ')}`);
          console.log(`      → Confidence: ${(tags[0].confidence * 100).toFixed(0)}%`);
        }
      } else {
        console.log(`   ⚠️  Failed to tag batch ${batchNum}`);
        errorCount += batch.length;
      }

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < allApplications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ TAGGING COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Successfully tagged: ${processedCount} applications`);
    console.log(`   ❌ Failed: ${errorCount} applications`);
    console.log(`   📈 Success rate: ${((processedCount / allApplications.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
