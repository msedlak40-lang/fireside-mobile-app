# Character Profile & Relationship Data Generation Prompt

Use this prompt with Claude or GPT to generate enriched character profile data for your Bible characters.

---

## Prompt

```
I need you to generate enriched profile data for Bible characters. For each character, provide the following information in JSON format.

**OUTPUT FORMAT:**
Return a JSON object with two arrays: "character_updates" and "relationships"

### character_updates array
Each object should have:
- name: (string) Character name - must match exactly with existing database
- era: (string) Historical period. Use one of: "Creation", "Patriarchs", "Egyptian Bondage", "Exodus & Wilderness", "Conquest", "Judges", "United Monarchy", "Divided Kingdom", "Exile", "Post-Exile", "Intertestamental", "Life of Christ", "Early Church"
- tribe: (string or null) For Israelites only - Judah, Benjamin, Levi, etc.
- key_locations: (array of strings) 2-4 most important places in their story
- known_for: (array of strings) 2-3 defining moments or achievements - keep each under 10 words
- character_traits: (array of strings) 3-5 key virtues or character qualities demonstrated

### relationships array
Each object should have:
- character_name: (string) The main character's name - must match exactly
- related_name: (string) Name of the related person
- relationship_type: (string) One of: "father", "mother", "spouse", "child", "sibling", "mentor", "student", "friend", "rival", "predecessor", "successor", "servant", "master"
- notes: (string or null) Brief context if helpful (e.g., "adoptive", "by Bathsheba")

**IMPORTANT GUIDELINES:**
1. Only include relationships where both people are significant Bible figures
2. Include relationships from BOTH directions (if David is Jonathan's friend, also add Jonathan as David's friend)
3. For polygamous marriages, include all wives as separate relationship entries
4. Keep "known_for" items concise and action-oriented
5. Ensure character names match exactly as they appear in the database

**CHARACTERS TO PROCESS:**
[PASTE YOUR CHARACTER LIST HERE]

**EXAMPLE OUTPUT:**
```json
{
  "character_updates": [
    {
      "name": "David",
      "era": "United Monarchy",
      "tribe": "Judah",
      "key_locations": ["Bethlehem", "Jerusalem", "Wilderness of En Gedi", "Hebron"],
      "known_for": ["Defeated Goliath", "Unified Israel as King", "Wrote many Psalms"],
      "character_traits": ["Courage", "Worship", "Repentance", "Leadership", "Passion"]
    },
    {
      "name": "Jonathan",
      "era": "United Monarchy",
      "tribe": "Benjamin",
      "key_locations": ["Gibeah", "Philistine garrison", "Wilderness"],
      "known_for": ["Covenant friendship with David", "Military valor against Philistines"],
      "character_traits": ["Loyalty", "Courage", "Selflessness", "Honor"]
    }
  ],
  "relationships": [
    {
      "character_name": "David",
      "related_name": "Jesse",
      "relationship_type": "father",
      "notes": null
    },
    {
      "character_name": "David",
      "related_name": "Jonathan",
      "relationship_type": "friend",
      "notes": "Covenant friendship"
    },
    {
      "character_name": "David",
      "related_name": "Saul",
      "relationship_type": "rival",
      "notes": "Also father-in-law"
    },
    {
      "character_name": "David",
      "related_name": "Bathsheba",
      "relationship_type": "spouse",
      "notes": null
    },
    {
      "character_name": "David",
      "related_name": "Solomon",
      "relationship_type": "child",
      "notes": "by Bathsheba, successor"
    },
    {
      "character_name": "Jonathan",
      "related_name": "Saul",
      "relationship_type": "father",
      "notes": null
    },
    {
      "character_name": "Jonathan",
      "related_name": "David",
      "relationship_type": "friend",
      "notes": "Covenant friendship"
    }
  ]
}
```

Now generate the data for the characters provided.
```

---

## How to Use

1. Get your character list from the database:
   ```sql
   SELECT name FROM bible_characters ORDER BY name;
   ```

2. Paste the list into the prompt where it says [PASTE YOUR CHARACTER LIST HERE]

3. Run the prompt with Claude or GPT-4

4. Save the JSON output

5. Use the SQL scripts in this folder to import the data

---

## Tips for Best Results

- Process in batches of 10-20 characters for better accuracy
- Review the output for any name mismatches before importing
- For minor characters, some fields may be sparse - that's okay
- Cross-reference relationships to ensure consistency
