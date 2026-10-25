/**
 * Pure Bulk Text Parser for Vocabulary Terms
 * Strictly isolated: No React / UI dependencies.
 * Follows all database schema limits from V1__init_schema.sql.
 */

export const STANDARD_PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'interjection',
  'pronoun',
  'phrase',
  'idiom',
];

export const MAX_PASTE_LINES = 500;
export const MAX_TERM_LENGTH = 255;
export const MAX_PRONUNCIATION_LENGTH = 255;
export const MAX_PART_OF_SPEECH_LENGTH = 50;
export const MAX_DEFINITION_LENGTH = 5000;
export const MAX_EXAMPLE_LENGTH = 5000;
export const MAX_SYNONYM_LENGTH = 255;

export const SAMPLE_BULK_LINES = [
  'hello|xin chào|/həˈloʊ/|interjection|Hello, how are you?|hi; hey',
  'beautiful|xinh đẹp|/ˈbjuːtɪfəl/|adjective|She is beautiful.|pretty; lovely; attractive',
  'book|quyển sách|/bʊk/|noun|I read a book every day.|volume; publication',
  'run|chạy|/rʌn/|verb|I run every morning.|jog; sprint',
  'happy|hạnh phúc|/ˈhæpi/|adjective|I am happy today.|glad; joyful; cheerful',
  'hello|xin chào|||Hello!|',
].join('\n');

/**
 * Normalizes text to Unicode NFC and trims boundary whitespace.
 */
function cleanString(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFC').trim();
}

/**
 * Standardizes pronunciation string while preserving IPA characters without corruption.
 */
function cleanPronunciation(raw) {
  const cleaned = cleanString(raw);
  if (!cleaned) return '';
  return cleaned;
}

/**
 * Parses and deduplicates synonyms separated by ';' case-insensitively.
 */
export function parseSynonyms(rawSynonyms) {
  if (!rawSynonyms) return [];
  const parts = rawSynonyms.split(';');
  const result = [];
  const seenLower = new Set();

  for (const part of parts) {
    const cleaned = cleanString(part);
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      result.push(cleaned);
    }
  }
  return result;
}

/**
 * Detects paste delimiter:
 * If ANY non-empty line contains '|', uses '|'.
 * Otherwise uses '\t' (Tab).
 */
export function detectDelimiter(lines) {
  for (const line of lines) {
    if (line.trim().length > 0 && line.includes('|')) {
      return '|';
    }
  }
  return '\t';
}

/**
 * Main pure parser function
 * @param {string} rawText Raw user pasted text
 * @param {Object} options
 * @param {Array<string|{term: string}>} [options.existingTerms] Existing deck terms for duplicate checking
 * @returns {Object} Parse result with rows and summary
 */
export function parseBulkText(rawText = '', { existingTerms = [] } = {}) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      delimiter: '|',
      totalLines: 0,
      rows: [],
      summary: {
        total: 0,
        valid: 0,
        duplicates: 0,
        warnings: 0,
        errors: 0,
      },
      isExceededLimit: false,
      globalError: null,
    };
  }

  // Set up lookup set for existing terms (case-insensitive NFC)
  const existingTermSet = new Set(
    existingTerms
      .map((item) => {
        const t = typeof item === 'string' ? item : item?.term;
        return cleanString(t).toLowerCase();
      })
      .filter(Boolean)
  );

  // Split lines supporting \r\n and \n
  const rawLines = rawText.split(/\r\n|\n/);

  // Filter non-empty lines while preserving 1-based original line number
  const indexedLines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const originalLineNumber = i + 1;
    const lineText = rawLines[i];
    if (lineText.trim().length > 0) {
      indexedLines.push({
        lineNumber: originalLineNumber,
        text: lineText,
      });
    }
  }

  // Enforce 500 non-empty line limit
  if (indexedLines.length > MAX_PASTE_LINES) {
    return {
      delimiter: '|',
      totalLines: indexedLines.length,
      rows: [],
      summary: {
        total: indexedLines.length,
        valid: 0,
        duplicates: 0,
        warnings: 0,
        errors: indexedLines.length,
      },
      isExceededLimit: true,
      globalError: `Vượt quá giới hạn ${MAX_PASTE_LINES} thẻ mỗi lần nhập (nhận được ${indexedLines.length} dòng). Vui lòng chia nhỏ nội dung nhập.`,
    };
  }

  const delimiter = detectDelimiter(indexedLines.map((l) => l.text));
  const rows = [];
  const pasteTermsSeen = new Map(); // term.toLowerCase() -> lineNumber

  let validCount = 0;
  let duplicateCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const { lineNumber, text } of indexedLines) {
    const rawTokens = text.split(delimiter);
    const errors = [];
    const warnings = [];

    // Check exact field count (must be exactly 6)
    if (rawTokens.length < 6) {
      errors.push(
        `Dòng ${lineNumber}: Thiếu trường dữ liệu. Cần đúng 6 trường ngăn cách bởi '${delimiter}', nhận được ${rawTokens.length} trường.`
      );
    } else if (rawTokens.length > 6) {
      errors.push(
        `Dòng ${lineNumber}: Thừa trường dữ liệu. Cần đúng 6 trường ngăn cách bởi '${delimiter}', nhận được ${rawTokens.length} trường (kiểm tra ký tự '${delimiter}' thừa trong ví dụ).`
      );
    }

    // Extract fields (guarantee at least empty strings for missing fields)
    const rawTerm = rawTokens[0] || '';
    const rawDef = rawTokens[1] || '';
    const rawPron = rawTokens[2] || '';
    const rawPos = rawTokens[3] || '';
    const rawEx = rawTokens[4] || '';
    const rawSyn = rawTokens[5] || '';

    const term = cleanString(rawTerm);
    const definition = cleanString(rawDef);
    const pronunciation = cleanPronunciation(rawPron);
    let partOfSpeech = cleanString(rawPos).toLowerCase();
    const example = cleanString(rawEx);
    const synonyms = parseSynonyms(rawSyn);

    // Validation 1: Term (required, max 255)
    if (!term) {
      errors.push(`Dòng ${lineNumber}: Thuật ngữ (cột 1) không được để trống.`);
    } else if (term.length > MAX_TERM_LENGTH) {
      errors.push(
        `Dòng ${lineNumber}: Thuật ngữ vượt quá độ dài tối đa (${term.length}/${MAX_TERM_LENGTH} ký tự).`
      );
    }

    // Validation 2: Definition (required, max 5000)
    if (!definition) {
      errors.push(`Dòng ${lineNumber}: Định nghĩa (cột 2) không được để trống.`);
    } else if (definition.length > MAX_DEFINITION_LENGTH) {
      errors.push(
        `Dòng ${lineNumber}: Định nghĩa vượt quá độ dài tối đa (${definition.length}/${MAX_DEFINITION_LENGTH} ký tự).`
      );
    }

    // Validation 3: Pronunciation (optional, max 255)
    if (pronunciation.length > MAX_PRONUNCIATION_LENGTH) {
      errors.push(
        `Dòng ${lineNumber}: Phát âm vượt quá độ dài tối đa (${pronunciation.length}/${MAX_PRONUNCIATION_LENGTH} ký tự).`
      );
    }

    // Validation 4: Part of speech (optional, max 50, standard warning)
    if (partOfSpeech) {
      if (partOfSpeech.length > MAX_PART_OF_SPEECH_LENGTH) {
        errors.push(
          `Dòng ${lineNumber}: Loại từ vượt quá độ dài tối đa (${partOfSpeech.length}/${MAX_PART_OF_SPEECH_LENGTH} ký tự).`
        );
      } else if (!STANDARD_PARTS_OF_SPEECH.includes(partOfSpeech)) {
        warnings.push(
          `Dòng ${lineNumber}: Loại từ '${partOfSpeech}' không thuộc danh mục chuẩn (${STANDARD_PARTS_OF_SPEECH.join(', ')}).`
        );
      }
    }

    // Validation 5: Example (optional, max 5000)
    if (example.length > MAX_EXAMPLE_LENGTH) {
      errors.push(
        `Dòng ${lineNumber}: Ví dụ vượt quá độ dài tối đa (${example.length}/${MAX_EXAMPLE_LENGTH} ký tự).`
      );
    }

    // Validation 6: Synonyms (check individual length <= 255)
    for (const syn of synonyms) {
      if (syn.length > MAX_SYNONYM_LENGTH) {
        errors.push(
          `Dòng ${lineNumber}: Từ đồng nghĩa '${syn}' vượt quá ${MAX_SYNONYM_LENGTH} ký tự.`
        );
      }
    }

    // Duplicates check
    let duplicateReason = null;
    if (term) {
      const termLower = term.toLowerCase();

      // Check duplicate within the same paste
      if (pasteTermsSeen.has(termLower)) {
        const prevLine = pasteTermsSeen.get(termLower);
        duplicateReason = `Dòng ${lineNumber}: Thuật ngữ '${term}' bị trùng lặp với dòng ${prevLine} trong cùng nội dung nhập.`;
      } else {
        pasteTermsSeen.set(termLower, lineNumber);
      }

      // Check duplicate against existing deck cards
      if (!duplicateReason && existingTermSet.has(termLower)) {
        duplicateReason = `Dòng ${lineNumber}: Thuật ngữ '${term}' đã tồn tại trong bộ từ vựng này.`;
      }
    }

    // Determine row status
    let status = 'valid';
    if (errors.length > 0) {
      status = 'error';
      errorCount++;
    } else if (duplicateReason) {
      status = 'duplicate';
      duplicateCount++;
    } else if (warnings.length > 0) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'valid';
      validCount++;
    }

    rows.push({
      id: `row-${lineNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      lineNumber,
      originalText: text,
      fields: {
        term,
        definition,
        pronunciation,
        partOfSpeech,
        example,
        synonyms, // array of strings
        rawSynonyms: synonyms.join('; '),
      },
      status, // 'valid' | 'duplicate' | 'warning' | 'error'
      errors,
      warnings,
      duplicateReason,
    });
  }

  return {
    delimiter,
    totalLines: indexedLines.length,
    rows,
    summary: {
      total: indexedLines.length,
      valid: validCount,
      duplicates: duplicateCount,
      warnings: warningCount,
      errors: errorCount,
    },
    isExceededLimit: false,
    globalError: null,
  };
}
