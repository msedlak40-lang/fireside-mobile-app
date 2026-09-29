# Moses Character Study — v2 (15 lessons)

Regenerated from the app's own enrichment corpus (`verse_life_application`, `chapter_deep_dives`, `chapter_life_summary`). All content is original. Published studies were used as a depth/style reference only and were never in context during generation.

**Status:** awaiting theological review. **Not imported.**

## Files

| file | what it is |
|---|---|
| `lessons/lesson_01.md` … `lesson_15.md` | the reviewable text, **with PROVENANCE sections** |
| `lessons.json` | the same content in `character_study_lessons` schema shape — what the import consumes |
| `build_lessons_json.py` | regenerates `lessons.json` from the markdown |

**The markdown is the source of truth.** Edit a `.md`, re-run `python build_lessons_json.py`, re-import. The script also validates numbering, null handling, and array sizes. PROVENANCE sections are deliberately excluded from the JSON — they are review apparatus, not content.

## The 15 lessons

| # | title | passage | life_stage |
|---|---|---|---|
| 1 | Drawn Out of the River | Exodus 2:1-10 | Birth |
| 2 | Murder and Flight | Exodus 2:11-25 | Exile |
| 3 | The Burning Bush | Exodus 3:1-22 | Calling |
| 4 | The Excuses | Exodus 4:1-17 | Calling |
| 5 | Confronting Pharaoh | Exodus 5:1-23 | Boldness |
| 6 | The Plagues | Exodus 7:1-11:10 | Judgment |
| 7 | Passover | Exodus 12:1-51 | Deliverance |
| 8 | The Red Sea | Exodus 14:1-31 | Deliverance |
| 9 | Bread from Heaven | Exodus 16:1-36 | Provision |
| 10 | **Water from the Rock** | Exodus 17:1-16 | Testing |
| 11 | The Ten Commandments | Exodus 20:1-26 | Covenant |
| 12 | The Golden Calf | Exodus 32:1-35 | Crisis |
| 13 | Meeting with God | Exodus 33:1-23 | Intimacy |
| 14 | Striking the Rock | Numbers 20:1-13 | Failure |
| 15 | The Death of Moses | Deuteronomy 34:1-12 | Legacy |

Lesson 10 is new. Old 10-14 became 11-15.

## Import requirements

1. **`UPDATE bible_characters SET total_lessons = 15 WHERE id = 4;`** — `CharacterDetailScreen` drives its display off this column. Updating the lessons alone breaks the detail screen.
2. **Delete-and-reinsert** is the agreed strategy (existing user progress is negligible), so lesson `id`s need not be preserved.
3. **`character_qualities` is NULL on every row** — confirmed nullable. Nothing in the app renders it.
4. Only `id` (auto-sequence) and `created_at` (defaults `now()`) are constrained.
5. Lesson 15's `next_lesson_preview` is **null** — the renderer guards it, so null shows nothing.

## OPEN ITEM — array sizes exceed the brief

The original spec was `key_insights` 3-5, `hard_truths` 4-6, `specific_applications` 3-5, `reflection_questions` 5-7 — the observed ranges across the 242 legacy rows.

**13 of 15 lessons exceed that**, and the drift grows through the study:

| field | spec | actual | lessons over |
|---|---|---|---|
| `key_insights` | 3-5 | 5-9 | 13 |
| `specific_applications` | 3-5 | 5-7 | 13 |
| `hard_truths` | 4-6 | 5-7 | 1 (L12) |
| `reflection_questions` | 5-7 | 7 | 0 — in range |

These are **observed corpus ranges, not DB constraints** — nothing rejects the longer arrays, and `CharacterLessonScreen` maps over them without a cap, so they render. But they were an explicit instruction and the drift was not deliberate.

**Not fixed unilaterally**, because trimming is editorial and the content is under review. Three options:

- **Leave as is** — richer lessons, sets a new corpus norm. Accept that Moses is shaped differently from the other 28 characters.
- **Trim to spec** — cut the weakest 2-4 insights and applications per lesson. Mechanical, and the `.md` is the source of truth so it is a contained edit.
- **Trim selectively** — bring the worst offenders (L11 at 9 insights, the 7-application lessons) back toward range and leave the rest.

## Flagged for theological review

| lesson | item |
|---|---|
| 6 | **Hardening of Pharaoh's heart** — Exodus 7:3 has God announcing the hardening *before* Pharaoh hardens anything. The enrichment resolves the tension compatibilistically; I left it standing. Largest departure from source in the set. |
| 6, 7 | **Egyptian suffering** — the enrichment never raises the moral weight of ordinary Egyptians dying. Added in both. |
| 10 | **Strike/speak pairing** — entirely synthesis across Exodus 17 and Numbers 20. Neither chapter's enrichment connects them. It is the load-bearing claim of the lesson. |
| 13 | **1 Corinthians 10:4** — rock-as-Christ. The enrichment states it; retained per the Christology policy. One precision added: Paul's referent is the *water* rock, not literally the Exodus 33 cleft. The struck/pierced pairing is mine. |
| 14 | **Miriam's death as context for Meribah** — the enrichment never connects the fresh grief to the failure. Edges toward excusing what God did not excuse; check the balance. |

Christology policy: include NT-warranted typology where the enrichment states it outright. Applied consistently in **7** (*tamim* → the Lamb), **13** (1 Cor 10:4), **15** (transfiguration).

Every lesson's PROVENANCE section marks its own additions under **MINE, NOT THE ENRICHMENT'S**.

## Source-corpus defects hit during generation

Three of Moses's own passages sit on known-bad enrichment rows:

- **Exodus 20:19** and **Exodus 32:24** — two of the 157 rows with generator internal-deliberation leaked into `deeper_layer`
- **Exodus 17:6** — one of 24 rows with a blank `deeper_layer` (the strike-the-rock verse itself; its *tsur* material came from the chapter deep dive instead)

Tracked separately as a live data bug — see the `enrichment-leaked-reasoning` memory. Any pipeline reading `deeper_layer` verbatim must filter first.
