// src/utils/bibleReferenceParser.ts

export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

// Canonical book names mapped from lowercase aliases
const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  'genesis': 'Genesis', 'gen': 'Genesis', 'gn': 'Genesis', 'ge': 'Genesis',
  'exodus': 'Exodus', 'exod': 'Exodus', 'exo': 'Exodus', 'ex': 'Exodus',
  'leviticus': 'Leviticus', 'lev': 'Leviticus', 'le': 'Leviticus',
  'numbers': 'Numbers', 'num': 'Numbers', 'nu': 'Numbers', 'nm': 'Numbers',
  'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy', 'de': 'Deuteronomy', 'dt': 'Deuteronomy',
  'joshua': 'Joshua', 'josh': 'Joshua', 'jos': 'Joshua',
  'judges': 'Judges', 'judg': 'Judges', 'jdg': 'Judges', 'jg': 'Judges',
  'ruth': 'Ruth', 'ru': 'Ruth',
  '1 samuel': '1 Samuel', '1samuel': '1 Samuel', '1sam': '1 Samuel', '1sa': '1 Samuel', '1 sam': '1 Samuel', 'first samuel': '1 Samuel',
  '2 samuel': '2 Samuel', '2samuel': '2 Samuel', '2sam': '2 Samuel', '2sa': '2 Samuel', '2 sam': '2 Samuel', 'second samuel': '2 Samuel',
  '1 kings': '1 Kings', '1kings': '1 Kings', '1ki': '1 Kings', '1 ki': '1 Kings', '1kgs': '1 Kings', 'first kings': '1 Kings',
  '2 kings': '2 Kings', '2kings': '2 Kings', '2ki': '2 Kings', '2 ki': '2 Kings', '2kgs': '2 Kings', 'second kings': '2 Kings',
  '1 chronicles': '1 Chronicles', '1chronicles': '1 Chronicles', '1chr': '1 Chronicles', '1 chr': '1 Chronicles', '1ch': '1 Chronicles', 'first chronicles': '1 Chronicles',
  '2 chronicles': '2 Chronicles', '2chronicles': '2 Chronicles', '2chr': '2 Chronicles', '2 chr': '2 Chronicles', '2ch': '2 Chronicles', 'second chronicles': '2 Chronicles',
  'ezra': 'Ezra', 'ezr': 'Ezra',
  'nehemiah': 'Nehemiah', 'neh': 'Nehemiah', 'ne': 'Nehemiah',
  'esther': 'Esther', 'est': 'Esther', 'es': 'Esther',
  'job': 'Job', 'jb': 'Job',
  'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms',
  'proverbs': 'Proverbs', 'prov': 'Proverbs', 'pr': 'Proverbs', 'pro': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'ec': 'Ecclesiastes',
  'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon', 'sos': 'Song of Solomon', 'ss': 'Song of Solomon', 'songs': 'Song of Solomon',
  'isaiah': 'Isaiah', 'isa': 'Isaiah', 'is': 'Isaiah',
  'jeremiah': 'Jeremiah', 'jer': 'Jeremiah', 'je': 'Jeremiah',
  'lamentations': 'Lamentations', 'lam': 'Lamentations', 'la': 'Lamentations',
  'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel', 'eze': 'Ezekiel',
  'daniel': 'Daniel', 'dan': 'Daniel', 'da': 'Daniel',
  'hosea': 'Hosea', 'hos': 'Hosea', 'ho': 'Hosea',
  'joel': 'Joel', 'joe': 'Joel',
  'amos': 'Amos', 'am': 'Amos',
  'obadiah': 'Obadiah', 'obad': 'Obadiah', 'ob': 'Obadiah',
  'jonah': 'Jonah', 'jon': 'Jonah',
  'micah': 'Micah', 'mic': 'Micah',
  'nahum': 'Nahum', 'nah': 'Nahum', 'na': 'Nahum',
  'habakkuk': 'Habakkuk', 'hab': 'Habakkuk',
  'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah', 'zep': 'Zephaniah',
  'haggai': 'Haggai', 'hag': 'Haggai', 'hg': 'Haggai',
  'zechariah': 'Zechariah', 'zech': 'Zechariah', 'zec': 'Zechariah',
  'malachi': 'Malachi', 'mal': 'Malachi',
  // New Testament
  'matthew': 'Matthew', 'matt': 'Matthew', 'mat': 'Matthew', 'mt': 'Matthew',
  'mark': 'Mark', 'mrk': 'Mark', 'mk': 'Mark',
  'luke': 'Luke', 'luk': 'Luke', 'lk': 'Luke',
  'john': 'John', 'jn': 'John', 'jhn': 'John',
  'acts': 'Acts', 'act': 'Acts', 'ac': 'Acts',
  'romans': 'Romans', 'rom': 'Romans', 'ro': 'Romans',
  '1 corinthians': '1 Corinthians', '1corinthians': '1 Corinthians', '1cor': '1 Corinthians', '1 cor': '1 Corinthians', '1co': '1 Corinthians', 'first corinthians': '1 Corinthians',
  '2 corinthians': '2 Corinthians', '2corinthians': '2 Corinthians', '2cor': '2 Corinthians', '2 cor': '2 Corinthians', '2co': '2 Corinthians', 'second corinthians': '2 Corinthians',
  'galatians': 'Galatians', 'gal': 'Galatians', 'ga': 'Galatians',
  'ephesians': 'Ephesians', 'eph': 'Ephesians',
  'philippians': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians',
  'colossians': 'Colossians', 'col': 'Colossians',
  '1 thessalonians': '1 Thessalonians', '1thessalonians': '1 Thessalonians', '1thess': '1 Thessalonians', '1 thess': '1 Thessalonians', '1th': '1 Thessalonians', 'first thessalonians': '1 Thessalonians',
  '2 thessalonians': '2 Thessalonians', '2thessalonians': '2 Thessalonians', '2thess': '2 Thessalonians', '2 thess': '2 Thessalonians', '2th': '2 Thessalonians', 'second thessalonians': '2 Thessalonians',
  '1 timothy': '1 Timothy', '1timothy': '1 Timothy', '1tim': '1 Timothy', '1 tim': '1 Timothy', '1ti': '1 Timothy', 'first timothy': '1 Timothy',
  '2 timothy': '2 Timothy', '2timothy': '2 Timothy', '2tim': '2 Timothy', '2 tim': '2 Timothy', '2ti': '2 Timothy', 'second timothy': '2 Timothy',
  'titus': 'Titus', 'tit': 'Titus',
  'philemon': 'Philemon', 'phlm': 'Philemon', 'phm': 'Philemon',
  'hebrews': 'Hebrews', 'heb': 'Hebrews',
  'james': 'James', 'jas': 'James', 'jm': 'James',
  '1 peter': '1 Peter', '1peter': '1 Peter', '1pet': '1 Peter', '1 pet': '1 Peter', '1pe': '1 Peter', 'first peter': '1 Peter',
  '2 peter': '2 Peter', '2peter': '2 Peter', '2pet': '2 Peter', '2 pet': '2 Peter', '2pe': '2 Peter', 'second peter': '2 Peter',
  '1 john': '1 John', '1john': '1 John', '1jn': '1 John', '1 jn': '1 John', 'first john': '1 John',
  '2 john': '2 John', '2john': '2 John', '2jn': '2 John', '2 jn': '2 John', 'second john': '2 John',
  '3 john': '3 John', '3john': '3 John', '3jn': '3 John', '3 jn': '3 John', 'third john': '3 John',
  'jude': 'Jude', 'jud': 'Jude',
  'revelation': 'Revelation', 'rev': 'Revelation', 're': 'Revelation', 'revelations': 'Revelation',
};

function normalizeBookName(input: string): string | null {
  const cleaned = input.toLowerCase().replace(/\s+/g, ' ').trim();

  // Direct match
  if (BOOK_ALIASES[cleaned]) return BOOK_ALIASES[cleaned];

  // Startswith match (e.g., "joh" -> "john" -> "John")
  for (const [alias, fullName] of Object.entries(BOOK_ALIASES)) {
    if (alias.startsWith(cleaned) && cleaned.length >= 2) {
      return fullName;
    }
  }

  return null;
}

/**
 * Parse a Bible reference string into structured data.
 * Handles: "John 3:16", "john 3 16", "John3:16", "John 3:16-18", "jn 3:16", "Psalm 23"
 */
export function parseReference(input: string): ParsedReference | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  // Patterns ordered from most specific to least
  const patterns: RegExp[] = [
    // "John 3:16-18" or "1 John 3:16-18"
    /^(.+?)\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/,
    // "John 3:16" or "1 John 3:16"
    /^(.+?)\s+(\d+)\s*:\s*(\d+)$/,
    // "John3:16-18" (no space before chapter)
    /^(.+?)(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/,
    // "John3:16" (no space before chapter)
    /^(.+?)(\d+)\s*:\s*(\d+)$/,
    // "John 3 16-18" (space instead of colon)
    /^(.+?)\s+(\d+)\s+(\d+)\s*-\s*(\d+)$/,
    // "John 3 16" (space instead of colon)
    /^(.+?)\s+(\d+)\s+(\d+)$/,
    // "John 3" (chapter only, no verse)
    /^(.+?)\s+(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    const parts = match.slice(1); // [bookRaw, chapter, verseStart?, verseEnd?]
    const bookRaw = parts[0];
    const book = normalizeBookName(bookRaw);
    if (!book) continue;

    const chapter = parseInt(parts[1], 10);
    if (isNaN(chapter) || chapter < 1) continue;

    // Chapter-only match (last pattern)
    if (parts.length === 2) {
      return { book, chapter, verseStart: 0 }; // verseStart=0 means whole chapter
    }

    const verseStart = parseInt(parts[2], 10);
    if (isNaN(verseStart) || verseStart < 1) continue;

    const verseEnd = parts[3] ? parseInt(parts[3], 10) : undefined;
    if (verseEnd !== undefined && (isNaN(verseEnd) || verseEnd < verseStart)) continue;

    return { book, chapter, verseStart, verseEnd };
  }

  return null;
}

/**
 * Check if a search query looks like a Bible reference (vs keyword search)
 */
export function looksLikeReference(query: string): boolean {
  return parseReference(query) !== null;
}
