#1:

| ordinal_position | column_name    | data_type                   | is_nullable | column_default                           | comment |
| ---------------- | -------------- | --------------------------- | ----------- | ---------------------------------------- | ------- |
| 1                | id             | integer                     | NO          | nextval('bible_verses_id_seq'::regclass) | null    |
| 2                | translation    | text                        | NO          | null                                     | null    |
| 3                | book_name      | text                        | NO          | null                                     | null    |
| 4                | book_number    | integer                     | NO          | null                                     | null    |
| 5                | chapter_number | integer                     | NO          | null                                     | null    |
| 6                | verse_number   | integer                     | NO          | null                                     | null    |
| 7                | verse_text     | text                        | NO          | null                                     | null    |
| 8                | created_at     | timestamp without time zone | YES         | now()                                    | null    |
| 9                | testament      | text                        | YES         | null                                     | null    |

#2:
| index_name                                                      | indexdef                                                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bible_verses_pkey                                               | CREATE UNIQUE INDEX bible_verses_pkey ON public.bible_verses USING btree (id)                                                                                                 |
| bible_verses_translation_book_name_chapter_number_verse_num_key | CREATE UNIQUE INDEX bible_verses_translation_book_name_chapter_number_verse_num_key ON public.bible_verses USING btree (translation, book_name, chapter_number, verse_number) |
| bible_verses_unique_verse                                       | CREATE UNIQUE INDEX bible_verses_unique_verse ON public.bible_verses USING btree (translation, book_name, chapter_number, verse_number)                                       |
| idx_bible_verses_lookup                                         | CREATE INDEX idx_bible_verses_lookup ON public.bible_verses USING btree (translation, book_name, chapter_number)                                                              |
| idx_bible_verses_testament                                      | CREATE INDEX idx_bible_verses_testament ON public.bible_verses USING btree (testament)                                                                                        |
| idx_bible_verses_translation_lookup                             | CREATE INDEX idx_bible_verses_translation_lookup ON public.bible_verses USING btree (translation, book_name, chapter_number)                                                  |

3:
| translation | verse_count |
| ----------- | ----------- |
| KJV         | 31009       |
| WEB         | 31010       |

#4:
| translation | book_number | chapter_number | verse_number | verse_text                                                                                                                                                                                                                                                  |
| ----------- | ----------- | -------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KJV         | 1           | 1              | 1            | In the beginning God created the heaven and the earth.                                                                                                                                                                                                      |
| KJV         | 1           | 1              | 2            | And the earth was without form, and void; and darkness
was
 upon the face of the deep. And the Spirit of God moved upon the face of the waters.                                                                                                             |
| KJV         | 1           | 1              | 3            | And God said, Let there be light: and there was light.                                                                                                                                                                                                      |
| KJV         | 1           | 1              | 4            | And God saw the light, that
it was good: and God divided the light from the darkness.                                                                                                                                                                       |
| KJV         | 1           | 1              | 5            | And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.                                                                                                                                         |
| KJV         | 1           | 1              | 6            | And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.                                                                                                                                            |
| KJV         | 1           | 1              | 7            | And God made the firmament, and divided the waters which
were
 under the firmament from the waters which
were above the firmament: and it was so.                                                                                                           |
| KJV         | 1           | 1              | 8            | And God called the firmament Heaven. And the evening and the morning were the second day.                                                                                                                                                                   |
| KJV         | 1           | 1              | 9            | And God said, Let the waters under the heaven be gathered together unto one place, and let the dry
land appear: and it was so.                                                                                                                              |
| KJV         | 1           | 1              | 10           | And God called the dry
land Earth; and the gathering together of the waters called he Seas: and God saw that
it was good.                                                                                                                                   |
| KJV         | 1           | 1              | 11           | And God said, Let the earth bring forth grass, the herb yielding seed,
and the fruit tree yielding fruit after his kind, whose seed
is in itself, upon the earth: and it was so.                                                                            |
| KJV         | 1           | 1              | 12           | And the earth brought forth grass,
and herb yielding seed after his kind, and the tree yielding fruit, whose seed
was in itself, after his kind: and God saw that
it was good.                                                                              |
| KJV         | 1           | 1              | 13           | And the evening and the morning were the third day.                                                                                                                                                                                                         |
| KJV         | 1           | 1              | 14           | And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years:                                                                                     |
| KJV         | 1           | 1              | 15           | And let them be for lights in the firmament of the heaven to give light upon the earth: and it was so.                                                                                                                                                      |
| KJV         | 1           | 1              | 16           | And God made two great lights; the greater light to rule the day, and the lesser light to rule the night:
he made the stars also.                                                                                                                           |
| KJV         | 1           | 1              | 17           | And God set them in the firmament of the heaven to give light upon the earth,                                                                                                                                                                               |
| KJV         | 1           | 1              | 18           | And to rule over the day and over the night, and to divide the light from the darkness: and God saw that
it was good.                                                                                                                                       |
| KJV         | 1           | 1              | 19           | And the evening and the morning were the fourth day.                                                                                                                                                                                                        |
| KJV         | 1           | 1              | 20           | And God said, Let the waters bring forth abundantly the moving creature that hath life, and fowl
that may fly above the earth in the open firmament of heaven.                                                                                              |
| KJV         | 1           | 1              | 21           | And God created great whales, and every living creature that moveth, which the waters brought forth abundantly, after their kind, and every winged fowl after his kind: and God saw that
it was good.                                                       |
| KJV         | 1           | 1              | 22           | And God blessed them, saying, Be fruitful, and multiply, and fill the waters in the seas, and let fowl multiply in the earth.                                                                                                                               |
| KJV         | 1           | 1              | 23           | And the evening and the morning were the fifth day.                                                                                                                                                                                                         |
| KJV         | 1           | 1              | 24           | And God said, Let the earth bring forth the living creature after his kind, cattle, and creeping thing, and beast of the earth after his kind: and it was so.                                                                                               |
| KJV         | 1           | 1              | 25           | And God made the beast of the earth after his kind, and cattle after their kind, and every thing that creepeth upon the earth after his kind: and God saw that
it was good.                                                                                 |
| KJV         | 1           | 1              | 26           | And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth. |
| KJV         | 1           | 1              | 27           | So God created man in his
own image, in the image of God created he him; male and female created he them.                                                                                                                                                   |
| KJV         | 1           | 1              | 28           | And God blessed them, and God said unto them, Be fruitful, and multiply, and replenish the earth, and subdue it: and have dominion over the fish of the sea, and over the fowl of the air, and over every living thing that moveth upon the earth.          |
| KJV         | 1           | 1              | 29           | And God said, Behold, I have given you every herb bearing seed, which
is upon the face of all the earth, and every tree, in the which
is the fruit of a tree yielding seed; to you it shall be for meat.                                                    |
| KJV         | 1           | 1              | 30           | And to every beast of the earth, and to every fowl of the air, and to every thing that creepeth upon the earth, wherein
there is life,
I have given every green herb for meat: and it was so.                                                               |
| KJV         | 1           | 1              | 31           | And God saw every thing that he had made, and, behold,
it was
 very good. And the evening and the morning were the sixth day.                                                                                                                               |
| WEB         | 1           | 1              | 1            | In the beginning, God created the heavens and the earth.                                                                                                                                                                                                    |
| WEB         | 1           | 1              | 2            | The earth was formless and empty. Darkness was on the surface of the deep and God’s Spirit was hovering over the surface of the waters.                                                                                                                     |
| WEB         | 1           | 1              | 3            | God said, “Let there be light,” and there was light.                                                                                                                                                                                                        |
| WEB         | 1           | 1              | 4            | God saw the light, and saw that it was good. God divided the light from the darkness.                                                                                                                                                                       |
| WEB         | 1           | 1              | 5            | God called the light “day”, and the darkness he called “night”. There was evening and there was morning, the first day.                                                                                                                                     |
| WEB         | 1           | 1              | 6            | God said, “Let there be an expanse in the middle of the waters, and let it divide the waters from the waters.”                                                                                                                                              |
| WEB         | 1           | 1              | 7            | God made the expanse, and divided the waters which were under the expanse from the waters which were above the expanse; and it was so.                                                                                                                      |
| WEB         | 1           | 1              | 8            | God called the expanse “sky”. There was evening and there was morning, a second day.                                                                                                                                                                        |
| WEB         | 1           | 1              | 9            | God said, “Let the waters under the sky be gathered together to one place, and let the dry land appear”; and it was so.                                                                                                                                     |
| WEB         | 1           | 1              | 10           | God called the dry land “earth”, and the gathering together of the waters he called “seas”. God saw that it was good.                                                                                                                                       |
| WEB         | 1           | 1              | 11           | God said, “Let the earth yield grass, herbs yielding seeds, and fruit trees bearing fruit after their kind, with their seeds in it, on the earth”; and it was so.                                                                                           |
| WEB         | 1           | 1              | 12           | The earth yielded grass, herbs yielding seed after their kind, and trees bearing fruit, with their seeds in it, after their kind; and God saw that it was good.                                                                                             |
| WEB         | 1           | 1              | 13           | There was evening and there was morning, a third day.                                                                                                                                                                                                       |
| WEB         | 1           | 1              | 14           | God said, “Let there be lights in the expanse of the sky to divide the day from the night; and let them be for signs to mark seasons, days, and years;                                                                                                      |
| WEB         | 1           | 1              | 15           | and let them be for lights in the expanse of the sky to give light on the earth”; and it was so.                                                                                                                                                            |
| WEB         | 1           | 1              | 16           | God made the two great lights: the greater light to rule the day, and the lesser light to rule the night. He also made the stars.                                                                                                                           |
| WEB         | 1           | 1              | 17           | God set them in the expanse of the sky to give light to the earth,                                                                                                                                                                                          |
| WEB         | 1           | 1              | 18           | and to rule over the day and over the night, and to divide the light from the darkness. God saw that it was good.                                                                                                                                           |
| WEB         | 1           | 1              | 19           | There was evening and there was morning, a fourth day.                                                                                                                                                                                                      |


