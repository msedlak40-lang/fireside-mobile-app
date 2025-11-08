// src/types/supabase-characters.ts
export type BibleCharacter = {
id: number;
name: string;
also_known_as: string[] | null;
testament: 'OT' | 'NT' | null;
first_appearance: string | null;
last_appearance: string | null;
character_type: string | null;
one_sentence_summary: string | null;
total_lessons: number | null;
created_at: string | null;
};


export type CharacterLesson = {
id: number;
character_id: number | null;
lesson_number: number | null;
lesson_title: string | null;
life_stage: string | null;
key_passage: string | null;
character_qualities: string[] | null;
story_narrative: string | null;
verse_sections: any | null; // { verses, heading, content }[]
key_insights: string[] | null;
hard_truths: string[] | null;
about_god: string | null;
about_ourselves: string | null;
failures_struggles: string | null;
specific_applications: any | null; // [{ situation, application }]
reflection_questions: string[] | null;
next_lesson_preview: string | null;
created_at: string | null;
};