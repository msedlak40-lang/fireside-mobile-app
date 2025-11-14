# Armor of God - Complete 7-Day System

## Overview
A complete weekly spiritual battle system that uses all 7 pieces of the Armor of God (Ephesians 6:14-18), with AI-tagged practical applications matched to users' specific battles.

## What We Built

### 1. **AI-Tagged Application Database** ✅
- **6,804 practical applications** extracted from 1,189 Bible chapters
- Each application tagged with:
  - Primary armor piece (Belt, Breastplate, Shoes, Shield, Helmet, Sword, Prayer)
  - Battle tags (fear, anger, temptation, doubt, loneliness, identity, purpose)
  - Keywords and confidence scores (avg 87%)
- Distribution:
  - Belt of Truth: 1,230 apps
  - Breastplate of Righteousness: 1,505 apps
  - Shoes of Peace: 595 apps
  - Shield of Faith: 956 apps
  - Helmet of Salvation: 730 apps
  - Sword of the Spirit: 909 apps
  - Prayer: 879 apps

### 2. **Database Schema** ✅
- `armor_pieces` - All 7 armor pieces
- `parsed_practical_applications` - AI-tagged applications
- `user_seen_applications` - Tracks which apps users have seen
- `user_battles` - User's weekly battles
- `user_weekly_reflections` - Daily reflections
- `user_battle_verses` - Saved battle verses

### 3. **Matching Functions** ✅
- `get_daily_armor_application()` - Finds best application for today's armor + user's battle
- `mark_application_seen()` - Prevents showing same apps repeatedly
- Smart matching algorithm:
  - Prioritizes exact battle tag matches
  - Falls back to generic applications
  - Avoids apps seen in last 30 days
  - Orders by confidence score + randomization

### 4. **Service Layer** ✅
- `getTodaysArmorPiece()` - Gets armor piece based on day of week
- `getDailyApplication()` - Fetches daily application
- `markApplicationSeen()` - Tracks user progress
- `createBattle()` - Creates weekly battle
- `createReflection()` - Saves daily reflections

---

## The 7-Day Weekly Flow

### **Sunday Night / Monday Morning: Battle Setup**
1. User identifies their weekly battle (fear, anger, temptation, etc.)
2. **Use Bible search screen** to find a battle verse matching their theme
3. User selects verse as their primary battle verse
4. System creates battle record with verse

### **Monday-Sunday: Daily Armor Challenges**

Each day presents a different armor piece:

**Monday - Belt of Truth**
- Focus: Honesty, reality, God's Word, confession
- Practical application about truth
- Reflection prompt: "How does truth help me fight [my battle]?"

**Tuesday - Breastplate of Righteousness**
- Focus: Holy living, integrity, purity
- Practical application about righteousness
- Reflection prompt: "How does right living protect me?"

**Wednesday - Shoes of Peace**
- Focus: Calm, rest, God's presence, readiness
- Practical application about peace
- Reflection prompt: "How can I find God's peace today?"

**Thursday - Shield of Faith**
- Focus: Trust, belief, God's promises
- Practical application about faith
- Reflection prompt: "What promise of God can I trust?"

**Friday - Helmet of Salvation**
- Focus: Identity, security, eternal perspective
- Practical application about salvation/identity
- Reflection prompt: "How does my salvation give me security?"

**Saturday - Sword of the Spirit**
- Focus: Scripture as weapon, active resistance
- Practical application about God's Word
- Reflection prompt: "What Scripture can I use to fight?"

**Sunday - Prayer**
- Focus: Communication with God, dependence, intercession
- Practical application about prayer
- Reflection prompt: "How can I pray through this battle?"
- **Victory Reflection**: Review all 7 pieces from the week

---

## What's Completed ✅

1. ✅ Database tables created and populated
2. ✅ 8,131 practical applications extracted from chapters
3. ✅ 6,804 applications AI-tagged with armor pieces + battle tags
4. ✅ Matching functions created (SQL)
5. ✅ Service layer functions added (TypeScript)
6. ✅ 7th armor piece (Prayer) added to database

---

## What Still Needs to Be Built 🚧

### 1. UI Screen Updates

**BattleIdentification.tsx** (existing screen)
- Already exists - minimal changes needed
- Just ensure it saves verse info when creating battle

**DailyArmorChallenge.tsx** (NEW screen needed)
- Show today's armor piece (icon, name, description)
- Display daily practical application from database
- Show Bible reference (book + chapter)
- Input field for daily reflection
- Save button to store reflection + mark application as seen

**ArmorUpHome.tsx** (existing screen - needs updates)
- Show current battle info
- Display 7-day calendar showing which armor pieces for each day
- Highlight today's armor piece
- Show "View Today's Challenge" button
- Track progress (which days have reflections)

**VictoryReflection.tsx** (existing screen - minimal updates)
- Review all 7 armor pieces from the week
- Show which applications were seen
- Final victory reflection
- Complete battle

### 2. Example Implementation for DailyArmorChallenge Screen

```typescript
// src/screens/DailyArmorChallenge.tsx
import React, { useState, useEffect } from 'react';
import { getTodaysArmorPiece, getDailyApplication, markApplicationSeen, createReflection, getActiveBattle } from '../services/armor';

export default function DailyArmorChallengeScreen() {
  const [armorPiece, setArmorPiece] = useState(null);
  const [application, setApplication] = useState(null);
  const [battle, setBattle] = useState(null);
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyChallenge();
  }, []);

  async function loadDailyChallenge() {
    const userId = 'USER_ID'; // Get from auth

    // Get today's armor piece
    const armor = await getTodaysArmorPiece();
    setArmorPiece(armor);

    // Get user's active battle
    const userBattle = await getActiveBattle(userId);
    setBattle(userBattle);

    if (armor && userBattle) {
      // Get daily application
      const app = await getDailyApplication(
        userId,
        armor.id,
        userBattle.battle_tag,
        userBattle.id
      );
      setApplication(app);
    }

    setLoading(false);
  }

  async function saveReflection() {
    // Mark application as seen
    await markApplicationSeen(userId, application.id, battle.id);

    // Save reflection
    await createReflection(
      userId,
      battle.id,
      reflection,
      'daily',
      new Date().getDay()
    );

    // Navigate back or show success
  }

  // Render UI with armor piece, application, reflection input
}
```

---

## Database Queries for Testing

```sql
-- See how many applications match each armor piece + battle tag combo
SELECT
  ap.armor_name,
  unnest(ppa.battle_tags) as battle_tag,
  COUNT(*) as matching_apps
FROM parsed_practical_applications ppa
JOIN armor_pieces ap ON ppa.primary_armor_piece_id = ap.id
GROUP BY ap.armor_name, battle_tag
ORDER BY ap.armor_name, matching_apps DESC;

-- Test the matching function for different combos
SELECT * FROM get_daily_armor_application(
  '00000000-0000-0000-0000-000000000000'::uuid,
  1,  -- Belt of Truth
  'fear'
);

SELECT * FROM get_daily_armor_application(
  '00000000-0000-0000-0000-000000000000'::uuid,
  4,  -- Shield of Faith
  'doubt'
);
```

---

## Next Steps Priority

1. **Create DailyArmorChallenge.tsx screen** (core functionality)
2. **Update ArmorUpHome.tsx** to show 7-day calendar
3. **Test full flow** with a real user battle
4. **Polish UI/UX** based on user feedback

---

## Technical Notes

- All RPC functions are server-side for security
- Applications avoid repeats using 30-day window
- Matching algorithm prioritizes exact tag matches, then high confidence scores
- Falls back to generic applications if no exact match
- Day-of-week calculation: Monday=1 (Belt), Sunday=7 (Prayer)

---

## Success Metrics

✅ 6,804 applications tagged
✅ Average 87% confidence score
✅ All 7 armor pieces represented
✅ All 7 battle tags mapped
✅ Smart matching with variety (random ordering)
✅ Avoids repetition (30-day window)
