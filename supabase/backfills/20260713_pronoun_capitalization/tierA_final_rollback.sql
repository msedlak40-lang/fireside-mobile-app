UPDATE verse_life_application t SET plain_truth = b.plain_truth, deeper_layer = b.deeper_layer, reflection_question = b.reflection_question FROM backfill_pronoun_backup_vla_20260713 b WHERE t.id = b.id;
UPDATE chapter_deep_dives t SET deep_dive = b.deep_dive, short_summary = b.short_summary FROM backfill_pronoun_backup_cdd_20260713 b WHERE t.id = b.id;
