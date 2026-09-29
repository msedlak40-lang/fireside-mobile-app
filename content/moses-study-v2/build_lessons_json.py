#!/usr/bin/env python3
"""
Build lessons.json (import shape) from the reviewable lesson_NN.md files.

The markdown is the source of truth. This script parses it into the exact
character_study_lessons schema so the two can never drift: edit the .md,
re-run this, re-import.

PROVENANCE sections are deliberately NOT carried into the JSON -- they are
review apparatus, not content. They live only in the .md files.

Usage:  python build_lessons_json.py
"""

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
LESSONS_DIR = os.path.join(HERE, "lessons")
OUT = os.path.join(HERE, "lessons.json")

CHARACTER_ID = 4  # bible_characters.id for Moses

NUMBERED = re.compile(r"^\d+\.\s+(.*)$")
# "1. **If you are X** - application"  (em dash or hyphen)
APPLICATION = re.compile(r"^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.*)$")
# "### [1-4] An Ark the Size of a Baby"
SECTION = re.compile(r"^\[(.+?)\]\s*(.*)$")


def strip_notes(text):
    """Drop blockquote editorial notes; they are for the human reviewer only."""
    return "\n".join(l for l in text.split("\n") if not l.lstrip().startswith(">"))


def join_paragraphs(text):
    """Collapse a block to its prose, preserving paragraph breaks."""
    return strip_notes(text).strip()


def numbered_list(text):
    out = []
    for line in strip_notes(text).split("\n"):
        m = NUMBERED.match(line.strip())
        if m:
            out.append(m.group(1).strip())
    return out


def applications(text):
    out = []
    for line in strip_notes(text).split("\n"):
        m = APPLICATION.match(line.strip())
        if m:
            out.append({"situation": m.group(1).strip(), "application": m.group(2).strip()})
    return out


def verse_sections(text):
    out = []
    for chunk in strip_notes(text).split("\n### ")[1:]:
        head, _, body = chunk.partition("\n")
        m = SECTION.match(head.strip())
        if not m:
            raise ValueError("unparseable verse_section heading: {!r}".format(head))
        out.append({
            "verses": m.group(1).strip(),
            "heading": m.group(2).strip(),
            "content": body.strip(),
        })
    return out


def parse(path):
    raw = open(path, encoding="utf-8").read()

    # Everything after the "---\n\n## PROVENANCE" fence is review apparatus.
    body = raw.split("\n---\n\n## PROVENANCE")[0]

    blocks = body.split("\n## ")
    head = blocks[0]

    title_line = head.split("\n")[0]
    m = re.match(r"^#\s*Lesson\s+(\d+)\s*[—–-]\s*(.+)$", title_line.strip())
    if not m:
        raise ValueError("bad title line in {}: {!r}".format(path, title_line))
    lesson_number, lesson_title = int(m.group(1)), m.group(2).strip()

    def meta(field):
        mm = re.search(r"\*\*" + field + r":\*\*\s*(.+)", head)
        return mm.group(1).strip() if mm else None

    sections = {}
    for b in blocks[1:]:
        name, _, content = b.partition("\n")
        sections[name.strip()] = content

    preview = join_paragraphs(sections.get("next_lesson_preview", ""))
    if preview.strip().upper() == "NULL" or not preview:
        preview = None

    cq = meta("character_qualities")
    character_qualities = None if (cq is None or cq.lower() == "null") else cq

    return {
        "character_id": CHARACTER_ID,
        "lesson_number": lesson_number,
        "lesson_title": lesson_title,
        "life_stage": meta("life_stage"),
        "key_passage": meta("key_passage"),
        "character_qualities": character_qualities,
        "story_narrative": join_paragraphs(sections["story_narrative"]),
        "verse_sections": verse_sections(sections["verse_sections"]),
        "key_insights": numbered_list(sections["key_insights"]),
        "hard_truths": numbered_list(sections["hard_truths"]),
        "about_god": join_paragraphs(sections["about_god"]),
        "about_ourselves": join_paragraphs(sections["about_ourselves"]),
        "failures_struggles": join_paragraphs(sections["failures_struggles"]),
        "specific_applications": applications(sections["specific_applications"]),
        "reflection_questions": numbered_list(sections["reflection_questions"]),
        "next_lesson_preview": preview,
    }


def main():
    files = sorted(f for f in os.listdir(LESSONS_DIR) if re.match(r"^lesson_\d+\.md$", f))
    lessons = [parse(os.path.join(LESSONS_DIR, f)) for f in files]
    lessons.sort(key=lambda x: x["lesson_number"])

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(lessons, f, indent=2, ensure_ascii=False)

    # Validate against the constraints established from the legacy corpus.
    print("{:>2}  {:<28} {:<22} {:>3} {:>3} {:>3} {:>3} {:>3} {:>3}".format(
        "#", "title", "passage", "vs", "ki", "ht", "sa", "rq", "nlp"))
    problems = []
    for L in lessons:
        n = L["lesson_number"]
        vs, ki, ht = len(L["verse_sections"]), len(L["key_insights"]), len(L["hard_truths"])
        sa, rq = len(L["specific_applications"]), len(L["reflection_questions"])
        print("{:>2}  {:<28} {:<22} {:>3} {:>3} {:>3} {:>3} {:>3} {:>3}".format(
            n, L["lesson_title"][:28], (L["key_passage"] or "")[:22], vs, ki, ht, sa, rq,
            "-" if L["next_lesson_preview"] is None else "y"))
        if not 3 <= ki <= 5: problems.append("L%d key_insights=%d (expect 3-5)" % (n, ki))
        if not 4 <= ht <= 6: problems.append("L%d hard_truths=%d (expect 4-6)" % (n, ht))
        if not 3 <= sa <= 5: problems.append("L%d specific_applications=%d (expect 3-5)" % (n, sa))
        if not 5 <= rq <= 7: problems.append("L%d reflection_questions=%d (expect 5-7)" % (n, rq))
        if not 1 <= vs <= 5: problems.append("L%d verse_sections=%d" % (n, vs))
        for k in ("lesson_title", "life_stage", "key_passage", "story_narrative",
                  "about_god", "about_ourselves", "failures_struggles"):
            if not L[k]:
                problems.append("L%d %s is empty" % (n, k))
        for s in L["verse_sections"]:
            if not (s["verses"] and s["heading"] and s["content"]):
                problems.append("L%d incomplete verse_section %r" % (n, s["verses"]))

    print()
    print("lessons: {}   numbering: {}".format(
        len(lessons),
        "contiguous 1-%d" % len(lessons)
        if [L["lesson_number"] for L in lessons] == list(range(1, len(lessons) + 1))
        else "NOT CONTIGUOUS"))
    print("character_qualities all null:",
          all(L["character_qualities"] is None for L in lessons))
    print("next_lesson_preview null only on last:",
          [L["lesson_number"] for L in lessons if L["next_lesson_preview"] is None] == [len(lessons)])
    print()
    if problems:
        print("RANGE / COMPLETENESS NOTES ({}):".format(len(problems)))
        for p in problems:
            print("  -", p)
    else:
        print("All lessons within the legacy corpus ranges.")
    print()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
