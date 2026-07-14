# Pronoun capitalization backfill — 2026-07-13

One-time data backfill capitalizing God/Jesus-referencing pronouns (He/Him/His) in
`verse_life_application` (`plain_truth`, `deeper_layer`, `reflection_question`) and
`chapter_deep_dives` (`deep_dive`, `short_summary`). Executed directly in the Supabase
SQL editor — this folder is the tracked, reversible record of what ran.

**Scope:** 128 rows across the two tables (118 `verse_life_application` + 10
`chapter_deep_dives`). Auto-fix limited to the bulletproof `his + exclusive divine
attribute` pattern (mercy, steadfast love, righteousness, holiness, grace, etc.), plus
a finite set of hand-reviewed "mixed" sentences fully capitalized after individual review.
No proximity heuristics; human pronouns were never auto-capitalized.

## Files
- `tierA_final_update.sql` — the UPDATEs applied (128 per-row statements).
- `tierA_final_backup.sql` — creates `backfill_pronoun_backup_vla_20260713` /
  `backfill_pronoun_backup_cdd_20260713` capturing original text of the affected rows
  (run BEFORE the update).
- `tierA_final_rollback.sql` — restores originals from those backup tables.
- `tierA_final_changes.csv` — the change ledger: `table, id, field, source, old_text, new_text`.
- `tierA_ledger_clean.csv` / `tierA_ledger_mixed.csv` — the human review inputs (an `Update`
  column: 1=apply, 0=leave, 2=my-edit, 3=unsure) that fed the final reconciliation.

## Reversibility
Run `tierA_final_rollback.sql` while the `backfill_pronoun_backup_*_20260713` tables still
exist in Supabase. Those backup tables are the source of truth for the undo; this folder
documents and reproduces the change set.
