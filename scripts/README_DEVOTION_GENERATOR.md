# Daily Devotion Generator

This system generates daily devotions for any year using the practical applications extracted from Bible chapters.

## Quick Start

Generate devotions for a specific year:

```bash
node scripts/generate_devotions.js 2027
```

This creates `scripts/insert_2027_devotions.sql` ready to import into Supabase.

## Files Overview

| File | Purpose |
|------|---------|
| `generate_devotions.js` | Main script - generates devotions for any year |
| `insert_YYYY_devotions.sql` | Generated SQL file for the specified year |
| `export_practical_applications.json` | Source data with 1,189 chapters of practical applications |

## Step-by-Step: Generate Devotions for a New Year

### 1. Generate the SQL File

```bash
# For 2027
node scripts/generate_devotions.js 2027

# For 2028
node scripts/generate_devotions.js 2028
```

The script will:
- Automatically detect leap years (365 vs 366 days)
- Create devotions for every day of the year
- Output a SQL file named `insert_YYYY_devotions.sql`

### 2. Import into Supabase

1. Open **Supabase Dashboard** → https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the entire contents of `scripts/insert_YYYY_devotions.sql`
5. Paste and click **Run**

### 3. Populate Verse Text (Optional)

The generated devotions have placeholder verse text like `[Verse text from Genesis 1:1]`. You can update these with actual Bible text by running a query like:

```sql
UPDATE daily_devotions
SET key_verse_text = 'In the beginning God created the heaven and the earth.'
WHERE key_verse_reference = 'Genesis 1:1' AND devotion_date >= '2027-01-01';
```

## What's Included in Each Devotion

Each generated devotion contains:

- **devotion_date** - Specific date (e.g., 2027-01-01)
- **title** - Generated based on content (e.g., "Living by Faith, Not by Sight")
- **theme** - Category (Prayer, Faith, Service, Obedience, etc.)
- **monthly_theme** - 12 themes covering the year
- **key_verse_reference** - Bible reference (e.g., "Genesis 1:1")
- **key_verse_book/chapter/number** - Parsed reference
- **key_verse_text** - Placeholder (update with actual verse)
- **devotional_text** - 5-paragraph devotional content
- **today_challenge** - Actionable step
- **prayer_starter** - Customized prayer
- **difficulty_level** - beginner/intermediate/advanced
- **target_audience** - ["men", "general"]

## Monthly Themes

| Month | Theme |
|-------|-------|
| January | New Beginnings: Starting the Year with God |
| February | Love & Relationships: God's Design for Connection |
| March | Faith in Action: Living Out What You Believe |
| April | Resurrection Power: The Hope of Easter |
| May | Growth & Transformation: Becoming More Like Christ |
| June | Purpose & Calling: Discovering God's Plan |
| July | Freedom in Christ: Breaking Chains |
| August | Spiritual Warfare: Standing Firm |
| September | Wisdom & Discernment: Making Godly Choices |
| October | Gratitude & Worship: A Thankful Heart |
| November | Community & Fellowship: Living Together |
| December | Hope & Expectation: Preparing for Christ's Return |

## Customization

### Change Monthly Themes

Edit the `MONTHLY_THEMES` object in `generate_devotions.js`:

```javascript
const MONTHLY_THEMES = {
  1: 'Your January Theme',
  2: 'Your February Theme',
  // ...
};
```

### Change Target Audience

Modify the `target_audience` array in the devotion object:

```javascript
target_audience: ['women', 'general']  // or ['youth', 'general']
```

### Change Difficulty Mapping

Edit the `getDifficultyLevel()` function to adjust which books are beginner/intermediate/advanced.

## Source Data

The devotions are generated from `export_practical_applications.json`, which contains:
- **1,189 Bible chapters** with practical applications
- Also includes theological themes (not currently used in devotion generation)

This data was extracted from the `bible_chapter_summaries_strongs` table using the scripts in this directory.

## Troubleshooting

### "Ran out of practical applications!"
You're trying to generate more days than we have chapters. We have 1,189 chapters, which covers ~3 years. If you need more, you'll need to cycle through the applications again.

### SQL syntax errors
Check for special characters in the verse text. The script escapes single quotes, but unusual characters might cause issues.

### Duplicate key errors
You may already have devotions for that date range. Either:
- Delete existing devotions first: `DELETE FROM daily_devotions WHERE devotion_date >= '2027-01-01' AND devotion_date <= '2027-12-31';`
- Or update the script to use `INSERT ... ON CONFLICT` syntax

## Annual Checklist

Each year before January:
1. [ ] Run `node scripts/generate_devotions.js YYYY` for the new year
2. [ ] Review the generated SQL file
3. [ ] Import into Supabase
4. [ ] Optionally populate actual verse text
5. [ ] Test a few devotions in the app
