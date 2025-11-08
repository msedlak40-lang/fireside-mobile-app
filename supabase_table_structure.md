| table_name                      | column_name             | data_type                   | is_nullable |
| ------------------------------- | ----------------------- | --------------------------- | ----------- |
| bible_books_metadata            | id                      | integer                     | NO          |
| bible_books_metadata            | book_name               | text                        | NO          |
| bible_books_metadata            | testament               | text                        | NO          |
| bible_books_metadata            | book_order              | integer                     | NO          |
| bible_books_metadata            | total_chapters          | integer                     | NO          |
| bible_books_metadata            | book_category           | text                        | YES         |
| bible_books_metadata            | osis_code               | text                        | YES         |
| bible_chapter_summaries         | id                      | integer                     | NO          |
| bible_chapter_summaries         | book_name               | text                        | NO          |
| bible_chapter_summaries         | chapter_number          | integer                     | NO          |
| bible_chapter_summaries         | summary_title           | text                        | NO          |
| bible_chapter_summaries         | summary_content         | text                        | NO          |
| bible_chapter_summaries         | key_themes              | ARRAY                       | YES         |
| bible_chapter_summaries         | created_at              | timestamp without time zone | YES         |
| bible_chapter_summaries         | book_id                 | integer                     | NO          |
| bible_chapter_summaries         | tsv                     | tsvector                    | YES         |
| bible_chapter_summaries_strongs | id                      | integer                     | NO          |
| bible_chapter_summaries_strongs | book_name               | text                        | NO          |
| bible_chapter_summaries_strongs | chapter_number          | integer                     | NO          |
| bible_chapter_summaries_strongs | testament               | text                        | NO          |
| bible_chapter_summaries_strongs | summary_basic           | text                        | YES         |
| bible_chapter_summaries_strongs | summary_intermediate    | text                        | YES         |
| bible_chapter_summaries_strongs | word_studies            | jsonb                       | YES         |
| bible_chapter_summaries_strongs | discussion_questions    | jsonb                       | YES         |
| bible_chapter_summaries_strongs | practical_applications  | ARRAY                       | YES         |
| bible_chapter_summaries_strongs | cross_references        | jsonb                       | YES         |
| bible_chapter_summaries_strongs | created_at              | timestamp with time zone    | YES         |
| bible_chapter_summaries_strongs | updated_at              | timestamp with time zone    | YES         |
| bible_chapter_summaries_strongs | summary_advanced        | jsonb                       | NO          |
| bible_characters                | id                      | integer                     | NO          |
| bible_characters                | name                    | text                        | NO          |
| bible_characters                | also_known_as           | ARRAY                       | YES         |
| bible_characters                | testament               | text                        | YES         |
| bible_characters                | first_appearance        | text                        | YES         |
| bible_characters                | last_appearance         | text                        | YES         |
| bible_characters                | character_type          | text                        | YES         |
| bible_characters                | one_sentence_summary    | text                        | YES         |
| bible_characters                | total_lessons           | integer                     | YES         |
| bible_characters                | created_at              | timestamp without time zone | YES         |
| bible_reading_plans             | id                      | integer                     | NO          |
| bible_reading_plans             | theme_id                | integer                     | YES         |
| bible_reading_plans             | plan_name               | text                        | NO          |
| bible_reading_plans             | plan_description        | text                        | YES         |
| bible_reading_plans             | total_days              | integer                     | NO          |
| bible_reading_plans             | difficulty_level        | text                        | YES         |
| bible_reading_plans             | target_audience         | text                        | YES         |
| bible_reading_plans             | created_by_user_id      | uuid                        | YES         |
| bible_reading_plans             | is_official             | boolean                     | YES         |
| bible_reading_plans             | is_public               | boolean                     | YES         |
| bible_reading_plans             | times_used              | integer                     | YES         |
| bible_reading_plans             | average_rating          | numeric                     | YES         |
| bible_reading_plans             | created_at              | timestamp without time zone | YES         |
| bible_verses                    | id                      | integer                     | NO          |
| bible_verses                    | translation             | text                        | NO          |
| bible_verses                    | book_name               | text                        | NO          |
| bible_verses                    | book_number             | integer                     | NO          |
| bible_verses                    | chapter_number          | integer                     | NO          |
| bible_verses                    | verse_number            | integer                     | NO          |
| bible_verses                    | verse_text              | text                        | NO          |
| bible_verses                    | created_at              | timestamp without time zone | YES         |
| bible_verses                    | testament               | text                        | YES         |
| biblical_terms                  | id                      | integer                     | NO          |
| biblical_terms                  | term                    | USER-DEFINED                | NO          |
| biblical_terms                  | term_variants           | ARRAY                       | YES         |
| biblical_terms                  | category                | text                        | NO          |
| biblical_terms                  | simple_definition       | text                        | NO          |
| biblical_terms                  | detailed_explanation    | text                        | YES         |
| biblical_terms                  | hebrew_word             | text                        | YES         |
| biblical_terms                  | greek_word              | text                        | YES         |
| biblical_terms                  | pronunciation           | text                        | YES         |
| biblical_terms                  | first_mention           | text                        | YES         |
| biblical_terms                  | related_verses          | ARRAY                       | YES         |
| biblical_terms                  | related_terms           | ARRAY                       | YES         |
| biblical_terms                  | why_it_matters          | text                        | YES         |
| biblical_terms                  | common_misconceptions   | text                        | YES         |
| biblical_terms                  | created_at              | timestamp without time zone | YES         |
| biblical_terms                  | fts                     | tsvector                    | YES         |
| biblical_terms                  | variant_blob            | text                        | YES         |
| biblical_terms                  | definition              | text                        | YES         |
| biblical_terms                  | synonyms                | ARRAY                       | YES         |
| character_study_lessons         | id                      | integer                     | NO          |
| character_study_lessons         | character_id            | integer                     | YES         |
| character_study_lessons         | lesson_number           | integer                     | YES         |
| character_study_lessons         | lesson_title            | text                        | YES         |
| character_study_lessons         | life_stage              | text                        | YES         |
| character_study_lessons         | key_passage             | text                        | YES         |
| character_study_lessons         | character_qualities     | ARRAY                       | YES         |
| character_study_lessons         | story_narrative         | text                        | YES         |
| character_study_lessons         | verse_sections          | jsonb                       | YES         |
| character_study_lessons         | key_insights            | ARRAY                       | YES         |
| character_study_lessons         | hard_truths             | ARRAY                       | YES         |
| character_study_lessons         | about_god               | text                        | YES         |
| character_study_lessons         | about_ourselves         | text                        | YES         |
| character_study_lessons         | failures_struggles      | text                        | YES         |
| character_study_lessons         | specific_applications   | jsonb                       | YES         |
| character_study_lessons         | reflection_questions    | ARRAY                       | YES         |
| character_study_lessons         | next_lesson_preview     | text                        | YES         |
| character_study_lessons         | created_at              | timestamp without time zone | YES         |
| daily_devotions                 | id                      | integer                     | NO          |
| daily_devotions                 | devotion_date           | date                        | YES         |
| daily_devotions                 | title                   | text                        | NO          |
| daily_devotions                 | theme                   | text                        | YES         |
| daily_devotions                 | key_verse_reference     | text                        | NO          |
| daily_devotions                 | key_verse_book          | text                        | NO          |
| daily_devotions                 | key_verse_chapter       | integer                     | NO          |
| daily_devotions                 | key_verse_number        | integer                     | NO          |
| daily_devotions                 | key_verse_text          | text                        | NO          |
| daily_devotions                 | devotional_text         | text                        | NO          |
| daily_devotions                 | today_challenge         | text                        | YES         |
| daily_devotions                 | prayer_starter          | text                        | YES         |
| daily_devotions                 | related_character_id    | integer                     | YES         |
| daily_devotions                 | related_reading_plan_id | integer                     | YES         |
| daily_devotions                 | difficulty_level        | text                        | YES         |
| daily_devotions                 | target_audience         | ARRAY                       | YES         |
| daily_devotions                 | monthly_theme           | text                        | YES         |
| daily_devotions                 | created_at              | timestamp without time zone | YES         |
| daily_devotions                 | updated_at              | timestamp without time zone | YES         |
| daily_devotions                 | key_verse_range         | text                        | YES         |
| daily_devotions                 | hard_truth              | text                        | YES         |
| daily_devotions                 | tags                    | ARRAY                       | YES         |
| daily_devotions                 | is_themed               | boolean                     | YES         |
| daily_devotions                 | theme_category          | text                        | YES         |
| daily_devotions                 | situation_tags          | ARRAY                       | YES         |
| reading_plan_days               | id                      | integer                     | NO          |
| reading_plan_days               | plan_id                 | integer                     | YES         |
| reading_plan_days               | day_number              | integer                     | NO          |
| reading_plan_days               | day_title               | text                        | NO          |
| reading_plan_days               | daily_theme             | text                        | YES         |
| reading_plan_days               | book_name               | text                        | NO          |
| reading_plan_days               | chapter_number          | integer                     | NO          |
| reading_plan_days               | verse_range             | text                        | NO          |
| reading_plan_days               | full_reference          | text                        | NO          |
| reading_plan_days               | verse_insight           | text                        | NO          |
| reading_plan_days               | reflection_questions    | ARRAY                       | YES         |
| reading_plan_days               | prayer_prompt           | text                        | YES         |
| reading_plan_days               | created_at              | timestamp without time zone | YES         |
| reading_plan_themes             | id                      | integer                     | NO          |
| reading_plan_themes             | theme_name              | text                        | NO          |
| reading_plan_themes             | theme_description       | text                        | YES         |
| reading_plan_themes             | icon_name               | text                        | YES         |
| reading_plan_themes             | sort_order              | integer                     | YES         |
| reading_plan_themes             | created_at              | timestamp without time zone | YES         |
| study_highlights                | id                      | uuid                        | NO          |
| study_highlights                | entry_id                | uuid                        | NO          |
| study_highlights                | user_id                 | uuid                        | NO          |
| study_highlights                | text                    | text                        | NO          |
| study_highlights                | loc                     | jsonb                       | YES         |
| study_highlights                | note                    | text                        | YES         |
| study_highlights                | created_at              | timestamp with time zone    | NO          |
| user_daily_presence             | id                      | uuid                        | NO          |
| user_daily_presence             | user_id                 | uuid                        | NO          |
| user_daily_presence             | group_id                | uuid                        | NO          |
| user_daily_presence             | present_date            | date                        | NO          |
| user_daily_presence             | source                  | text                        | NO          |
| user_daily_presence             | created_at              | timestamp with time zone    | NO          |
| user_devotion_progress          | id                      | integer                     | NO          |
| user_devotion_progress          | user_id                 | uuid                        | YES         |
| user_devotion_progress          | devotion_id             | integer                     | YES         |
| user_devotion_progress          | completed_at            | timestamp without time zone | YES         |
| user_devotion_progress          | personal_notes          | text                        | YES         |
| user_reading_progress           | id                      | integer                     | NO          |
| user_reading_progress           | user_id                 | uuid                        | YES         |
| user_reading_progress           | book_name               | text                        | NO          |
| user_reading_progress           | chapter_number          | integer                     | NO          |
| user_reading_progress           | completed_at            | timestamp without time zone | YES         |
| user_reading_progress           | reading_notes           | text                        | YES         |
| user_reading_stats              | user_id                 | uuid                        | NO          |
| user_reading_stats              | current_streak_days     | integer                     | YES         |
| user_reading_stats              | longest_streak_days     | integer                     | YES         |
| user_reading_stats              | total_chapters_read     | integer                     | YES         |
| user_reading_stats              | total_books_completed   | integer                     | YES         |
| user_reading_stats              | last_read_date          | date                        | YES         |
| user_reading_stats              | ot_chapters_read        | integer                     | YES         |
| user_reading_stats              | nt_chapters_read        | integer                     | YES         |
| user_reading_stats              | updated_at              | timestamp without time zone | YES         |