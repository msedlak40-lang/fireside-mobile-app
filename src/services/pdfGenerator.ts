import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

// Convert markdown to HTML
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert headers
  html = html.replace(/### (.+)/g, '<h3>$1</h3>');
  html = html.replace(/## (.+)/g, '<h2>$1</h2>');
  html = html.replace(/# (.+)/g, '<h1>$1</h1>');

  // Convert bold with colon (theme headers) - special handling
  html = html.replace(/\*\*(.+?)\*\*:/g, '<strong class="theme-header">$1:</strong>');

  // Convert remaining bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Convert paragraphs (split by double newline)
  const paragraphs = html.split('\n\n').filter(p => p.trim());
  html = paragraphs
    .map(p => {
      // Don't wrap if already has a tag
      if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<ol')) {
        return p;
      }
      return `<p>${p.trim()}</p>`;
    })
    .join('\n');

  return html;
}

// Brand colors from your theme
const BRAND_COLORS = {
  primary: '#C9A961', // Gold/tan from logo
  dark: '#1a1a1a',
  text: '#2d2d2d',
  textLight: '#666666',
  border: '#e0e0e0',
};

// Common CSS styles for PDFs
const getCommonStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
    padding: 40px;
    color: ${BRAND_COLORS.text};
    line-height: 1.6;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 3px solid ${BRAND_COLORS.primary};
  }

  .logo-text {
    font-size: 20px;
    font-weight: 800;
    color: ${BRAND_COLORS.primary};
    letter-spacing: 1px;
    margin-bottom: 5px;
  }

  .tagline {
    font-size: 11px;
    color: ${BRAND_COLORS.textLight};
    font-style: italic;
  }

  .title {
    font-size: 24px;
    font-weight: 800;
    color: ${BRAND_COLORS.dark};
    margin-top: 15px;
    margin-bottom: 5px;
  }

  .subtitle {
    font-size: 14px;
    color: ${BRAND_COLORS.textLight};
  }

  .section {
    margin-bottom: 25px;
    page-break-inside: avoid;
  }

  .section-title {
    font-size: 13px;
    font-weight: 800;
    color: ${BRAND_COLORS.primary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid ${BRAND_COLORS.border};
  }

  .content {
    font-size: 13px;
    line-height: 1.7;
    color: ${BRAND_COLORS.text};
  }

  .content p {
    margin-bottom: 12px;
  }

  .content strong {
    font-weight: 700;
    color: ${BRAND_COLORS.dark};
  }

  .content strong.theme-header {
    color: ${BRAND_COLORS.primary};
    font-weight: 800;
  }

  .content em {
    font-style: italic;
  }

  .verse-box {
    background-color: #f9f9f9;
    border-left: 4px solid ${BRAND_COLORS.primary};
    padding: 15px;
    margin: 15px 0;
    border-radius: 4px;
  }

  .verse-text {
    font-size: 14px;
    font-style: italic;
    color: ${BRAND_COLORS.text};
    margin-bottom: 8px;
  }

  .verse-reference {
    font-size: 12px;
    color: ${BRAND_COLORS.textLight};
    font-weight: 600;
  }

  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid ${BRAND_COLORS.border};
    text-align: center;
    font-size: 11px;
    color: ${BRAND_COLORS.textLight};
  }

  .highlight-box {
    background-color: #fff7ed;
    border-left: 4px solid #f59e0b;
    padding: 12px;
    margin: 10px 0;
    border-radius: 4px;
  }

  .highlight-title {
    font-size: 11px;
    font-weight: 800;
    color: #9a3412;
    text-transform: uppercase;
    margin-bottom: 5px;
    letter-spacing: 0.5px;
  }

  .highlight-content {
    font-size: 13px;
    color: #9a3412;
    line-height: 1.6;
  }
`;

export async function generateOnePagerPDF(data: {
  bookName: string | null;
  chapter: number;
  summary: string | null;
  theologicalThemes: string | null;
  keyVersesText: string | null;
  practicalApplications: string | null;
}) {
  const { bookName, chapter, summary, theologicalThemes, keyVersesText, practicalApplications } = data;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${getCommonStyles()}</style>
      </head>
      <body>
        <div class="header">
          <div class="logo-text">🔥 FIRESIDE</div>
          <div class="tagline">Strength for the Battle</div>
          <div class="title">${bookName} ${chapter}</div>
          <div class="subtitle">One Pager Summary</div>
        </div>

        ${summary ? `
          <div class="section">
            <div class="section-title">Summary</div>
            <div class="content">
              ${markdownToHtml(summary)}
            </div>
          </div>
        ` : ''}

        ${theologicalThemes ? `
          <div class="section">
            <div class="section-title">Theological Themes</div>
            <div class="content">
              ${markdownToHtml(theologicalThemes)}
            </div>
          </div>
        ` : ''}

        ${keyVersesText ? `
          <div class="section">
            <div class="section-title">Key Verses with Context</div>
            <div class="content">
              ${markdownToHtml(keyVersesText)}
            </div>
          </div>
        ` : ''}

        ${practicalApplications ? `
          <div class="section">
            <div class="section-title">Practical Applications</div>
            <div class="content">
              ${markdownToHtml(practicalApplications)}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          Generated by Fireside App • Fellowship for Men
        </div>
      </body>
    </html>
  `;

  try {
    const filename = `${bookName} ${chapter} - One Pager.pdf`.replace(/[^a-zA-Z0-9\s\-\.]/g, '');
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });
    await shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: filename,
    });
  } catch (error) {
    console.error('[PDF] Failed to generate One Pager PDF:', error);
    throw error;
  }
}

export async function generateDevotionPDF(data: {
  title: string;
  devotionDate: string | null;
  keyVerseText: string;
  keyVerseBook: string;
  keyVerseChapter: number;
  keyVerseRange: string | null;
  keyVerseNumber: number;
  devotionalText: string | null;
  hardTruth: string | null;
  todayChallenge: string | null;
  prayerStarter: string | null;
}) {
  const {
    title,
    devotionDate,
    keyVerseText,
    keyVerseBook,
    keyVerseChapter,
    keyVerseRange,
    keyVerseNumber,
    devotionalText,
    hardTruth,
    todayChallenge,
    prayerStarter,
  } = data;

  const keyRangeOrNum = keyVerseRange ?? String(keyVerseNumber);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${getCommonStyles()}</style>
      </head>
      <body>
        <div class="header">
          <div class="logo-text">🔥 FIRESIDE</div>
          <div class="tagline">Strength for the Battle</div>
          <div class="title">${title}</div>
          ${devotionDate ? `<div class="subtitle">${devotionDate}</div>` : ''}
        </div>

        <div class="verse-box">
          <div class="verse-text">"${keyVerseText}"</div>
          <div class="verse-reference">— ${keyVerseBook} ${keyVerseChapter}:${keyRangeOrNum}</div>
        </div>

        ${devotionalText ? `
          <div class="section">
            <div class="content">
              ${devotionalText.split('\n\n').map(para => `<p>${para.trim()}</p>`).join('\n')}
            </div>
          </div>
        ` : ''}

        ${hardTruth ? `
          <div class="highlight-box" style="background-color: #fff7ed; border-left-color: #f97316;">
            <div class="highlight-title">Hard Truth</div>
            <div class="highlight-content">${hardTruth}</div>
          </div>
        ` : ''}

        ${todayChallenge ? `
          <div class="highlight-box" style="background-color: #ecfeff; border-left-color: #06b6d4;">
            <div class="highlight-title" style="color: #155e75;">Today's Challenge</div>
            <div class="highlight-content" style="color: #155e75;">${todayChallenge}</div>
          </div>
        ` : ''}

        ${prayerStarter ? `
          <div class="highlight-box" style="background-color: #eef2ff; border-left-color: #6366f1;">
            <div class="highlight-title" style="color: #3730a3;">Prayer Starter</div>
            <div class="highlight-content" style="color: #3730a3;">${prayerStarter}</div>
          </div>
        ` : ''}

        <div class="footer">
          Generated by Fireside App • Daily Devotional for Men
        </div>
      </body>
    </html>
  `;

  try {
    // Create clean filename from title
    const filename = `${title}.pdf`.replace(/[^a-zA-Z0-9\s\-\.]/g, '');
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });
    await shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: filename,
    });
  } catch (error) {
    console.error('[PDF] Failed to generate Devotion PDF:', error);
    throw error;
  }
}
