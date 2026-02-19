import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

// ============================================
// CONFIGURATION
// ============================================

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Core 5 themes to generate
const THEMES = ['Courage', 'Integrity', 'Purpose', 'Leadership', 'Faith'];

// Sub-theme definitions for AI to use
const SUB_THEMES = {
  'Courage': ['Boldness', 'Facing Fear', 'Standing Alone', 'Decisive Action', 'Surrender', 'Obedience'],
  'Integrity': ['Honesty', 'Consistency', 'Character', 'Transparency', 'Keeping Your Word'],
  'Purpose': ['Calling', 'Identity in Christ', 'Divine Design', 'Significance', 'Vision'],
  'Leadership': ['Servant Leadership', 'Influence', 'Leading by Example', 'Empowering Others', 'Responsibility'],
  'Faith': ['Trust', 'Belief', 'Acting on Promises', 'Faith Over Feelings', 'Dependence on God']
};

const DELAY_MS = 1000; // Rate limiting between API calls
const BATCH_SIZE = 50;  // Log progress every N generations

// ============================================
// TYPES
// ============================================

interface Chapter {
  book: string;
  chapter: number;
  text: string;
}

interface ThemeApplication {
  book: string;
  chapter: number;
  theme: string;
  sub_theme: string | null;
  application: string;
  key_insight: string | null;
  action_step: string | null;
}

// ============================================
// GENERATION PROMPT
// ============================================

function buildPrompt(chapter: Chapter, theme: string): string {
  const subThemeList = SUB_THEMES[theme as keyof typeof SUB_THEMES].join(', ');
  
  return `You are creating a brief, powerful theme application for men's Bible study.

BIBLE CHAPTER: ${chapter.book} ${chapter.chapter}
THEME: ${theme}
POSSIBLE SUB-THEMES: ${subThemeList}

CHAPTER TEXT:
${chapter.text}

YOUR TASK:
Write a 150-200 word application showing how this chapter speaks to the theme of ${theme}.

TONE (CRITICAL):
- Direct, masculine, confrontational but hopeful
- Like Proven Men Ministries style
- No religious jargon or fluff
- 2nd person ("you")
- Actionable and practical
- Examples of good tone:
  * "Your past is a graveyard, not a neighborhood. Stop visiting it every day."
  * "Courage isn't the absence of fear; it's action despite fear."
  * "Stop giving your failures more power than God's grace."

STRUCTURE:
1. Identify the most relevant SUB-THEME from the list (pick ONE that best fits)
2. Write 150-200 word application in Proven Men tone
3. Create ONE punchy sentence for key insight
4. Create ONE specific action step (what to do today)

RESPOND IN THIS EXACT JSON FORMAT:
{
  "sub_theme": "The most relevant sub-theme from the list",
  "application": "Your 150-200 word application here",
  "key_insight": "One powerful sentence",
  "action_step": "One specific action to take today"
}

RESPOND ONLY WITH VALID JSON. NO MARKDOWN FENCES. NO PREAMBLE.`;
}

// ============================================
// GENERATION FUNCTION
// ============================================

async function generateApplication(
  chapter: Chapter,
  theme: string
): Promise<ThemeApplication> {
  
  const prompt = buildPrompt(chapter, theme);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  // Extract text from response
  const responseText = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';
  
  // Parse JSON (strip any markdown fences just in case)
  const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  
  return {
    book: chapter.book,
    chapter: chapter.chapter,
    theme,
    sub_theme: parsed.sub_theme || null,
    application: parsed.application,
    key_insight: parsed.key_insight || null,
    action_step: parsed.action_step || null
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🚀 Starting theme application generation...\n');
  console.log('📊 Configuration:');
  console.log(`   Themes: ${THEMES.join(', ')}`);
  console.log(`   Rate limit: ${DELAY_MS}ms between calls\n`);
  
  // Get all verses from database using pagination (Supabase default limit is 1,000)
  const allVerses: Array<{ book_name: string; chapter_number: number; verse_number: number; verse_text: string }> = [];
  let start = 0;
  const batchSize = 1000;
  let hasMore = true;

  console.log('📥 Fetching all verses from database...');

  while (hasMore) {
    const { data, error: versesError } = await supabase
      .from('bible_verses')
      .select('book_name, chapter_number, verse_number, verse_text')
      .order('book_name')
      .order('chapter_number')
      .order('verse_number')
      .range(start, start + batchSize - 1);

    if (versesError) {
      console.error('❌ Error fetching verses:', versesError);
      Deno.exit(1);
    }

    if (!data || data.length === 0) break;

    allVerses.push(...data);
    hasMore = data.length === batchSize;
    start += batchSize;

    console.log(`   Fetched ${allVerses.length} verses so far...`);
  }

  console.log(`✅ Total verses fetched: ${allVerses.length}\n`);

  // Group verses by chapter
  const chaptersMap = new Map<string, Chapter>();

  for (const verse of allVerses) {
    const key = `${verse.book_name}-${verse.chapter_number}`;
    if (!chaptersMap.has(key)) {
      chaptersMap.set(key, {
        book: verse.book_name,
        chapter: verse.chapter_number,
        text: verse.verse_text,
      });
    } else {
      const chapter = chaptersMap.get(key)!;
      chapter.text += ' ' + verse.verse_text;
    }
  }
  const chapters = Array.from(chaptersMap.values());
  const totalGenerations = chapters.length * THEMES.length;
  
  console.log(`📖 Found ${chapters.length} unique chapters`);
  console.log(`🎯 Total generations needed: ${totalGenerations}`);
  console.log(`💰 Estimated cost: $${(totalGenerations * 0.0081).toFixed(2)}\n`);
  
  const confirm = prompt('Continue? (yes/no): ');
  if (confirm?.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    Deno.exit(0);
  }
  
  let completed = 0;
  let skipped = 0;
  let errors = 0;
  let totalCost = 0;
  const startTime = Date.now();
  
  // Loop through themes and chapters
  for (const theme of THEMES) {
    console.log(`\n🎯 Processing theme: ${theme}`);
    console.log('─'.repeat(50));
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      try {
        // Check if already exists (resume capability)
        const { data: existing } = await supabase
          .from('chapter_themes')
          .select('id')
          .eq('book', chapter.book)
          .eq('chapter', chapter.chapter)
          .eq('theme', theme)
          .maybeSingle();
        
        if (existing) {
          skipped++;
          if (skipped % BATCH_SIZE === 0) {
            console.log(`   ⏭️  Skipped ${skipped} existing entries`);
          }
          continue;
        }
        
        // Generate application
        const application = await generateApplication(chapter, theme);
        
        // Insert to database
        const { error: insertError } = await supabase
          .from('chapter_themes')
          .insert(application);
        
        if (insertError) throw insertError;
        
        completed++;
        totalCost += 0.0081; // Rough estimate
        
        // Log progress every BATCH_SIZE completions
        if (completed % BATCH_SIZE === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          const rate = (completed / (Date.now() - startTime) * 1000 * 60).toFixed(1);
          const remaining = ((totalGenerations - completed - skipped) / parseFloat(rate)).toFixed(0);
          
          console.log(`   ✅ ${completed} completed | ${skipped} skipped | ${errors} errors`);
          console.log(`   ⏱️  ${elapsed}min elapsed | ${rate}/min | ~${remaining}min remaining`);
          console.log(`   💰 $${totalCost.toFixed(2)} spent`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        
      } catch (error) {
        errors++;
        console.error(`   ❌ ${chapter.book} ${chapter.chapter}: ${error.message}`);
        
        // Log error to file for later review
        await Deno.writeTextFile(
          'generation-errors.log',
          `${new Date().toISOString()} | ${theme} | ${chapter.book} ${chapter.chapter} | ${error.message}\n`,
          { append: true }
        );
      }
    }
  }
  
  // Final summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ GENERATION COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Completed: ${completed}`);
  console.log(`   ⏭️  Skipped: ${skipped} (already existed)`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️  Time: ${totalTime} minutes`);
  console.log(`   💰 Cost: $${totalCost.toFixed(2)}`);
  console.log('='.repeat(50));
  
  if (errors > 0) {
    console.log(`\n⚠️  Check generation-errors.log for failed chapters`);
  }
}

// Run it
main().catch(console.error);