import { levenshtein } from './levenshtein';

export const VN_FUNCTION_WORDS = [
  'sự',
  'việc',
  'cái',
  'chiếc',
  'con',
  'cuộc',
  'nỗi',
  'niềm',
  'một',
  'những',
  'các',
];

const VN_FUNCTION_WORD_REGEX = new RegExp(
  `^(?:${VN_FUNCTION_WORDS.join('|')})(?:\\s+|$)`,
  'i'
);

const EN_PREFIX_REGEX = /^(?:to|a|an|the)(?:\s+|$)/i;

/**
 * Normalizes user input and card strings according to specification:
 * - Unicode NFC normalization
 * - Unifies curly quotes/apostrophes to straight ones
 * - Unifies dash variants (–, —) to standard hyphen (-)
 * - Trims whitespace and collapses inner whitespace
 * - Converts to lowercase
 * - Strips leading/trailing punctuation (. , ; : ! ? " ' [ ] ( ) « » “ ” ‘ ’)
 * - Retains inner apostrophes, hyphens, and diacritics
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeAnswer(str) {
  if (!str || typeof str !== 'string') return '';

  let normalized = str.normalize('NFC');

  // Unify curly quotes / apostrophes
  normalized = normalized.replace(/[‘’]/g, "'").replace(/[“”«»]/g, '"');

  // Unify dashes (en-dash, em-dash to regular hyphen)
  normalized = normalized.replace(/[–—]/g, '-');

  // Trim and collapse whitespace
  normalized = normalized.trim().replace(/\s+/g, ' ');

  // Lowercase
  normalized = normalized.toLowerCase();

  // Strip leading/trailing punctuation: . , ; : ! ? " ' [ ] ( ) « » “ ” ‘ ’
  // Do not strip inner apostrophes or hyphens
  normalized = normalized.replace(
    /^[\s.,;:!?"'()[\]{}«»“”‘’]+|[\s.,;:!?"'()[\]{}«»“”‘’]+$/g,
    ''
  );

  return normalized.trim();
}

/**
 * Removes Vietnamese diacritical marks and maps đ/Đ to d/D.
 *
 * @param {string} str
 * @returns {string}
 */
export function stripVietnameseDiacritics(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

/**
 * Removes leading Vietnamese function words (sự, việc, cái, chiếc, con, cuộc, nỗi, niềm, một, những, các).
 *
 * @param {string} str
 * @returns {string}
 */
export function stripVnFunctionWords(str) {
  if (!str) return '';
  return str.replace(VN_FUNCTION_WORD_REGEX, '').trim();
}

/**
 * Removes leading English articles and infinitive markers (to, a, an, the).
 *
 * @param {string} str
 * @returns {string}
 */
export function stripEnPrefix(str) {
  if (!str) return '';
  return str.replace(EN_PREFIX_REGEX, '').trim();
}

/**
 * Expands variations of strings with parenthetical expressions.
 * Operates before punctuation stripping so that leading parentheses (e.g. "(to) run", "(con) mèo")
 * are correctly expanded.
 *
 * For example:
 * - "take (a) look" -> ["take (a) look", "take a look", "take look"]
 * - "(to) run" -> ["(to) run", "to run", "run"]
 *
 * @param {string} text
 * @returns {string[]}
 */
export function expandParentheses(text) {
  if (!text || typeof text !== 'string') return [];

  const raw = text.trim();
  const results = new Set();

  const normRaw = normalizeAnswer(raw);
  if (normRaw) results.add(normRaw);

  // Variation 1: remove parentheses symbols only, keeping inner text
  const unwrapParens = normalizeAnswer(raw.replace(/[()]/g, ' '));
  if (unwrapParens) results.add(unwrapParens);

  // Variation 2: remove parenthetical content entirely
  const stripParens = normalizeAnswer(raw.replace(/\([^)]*\)/g, ' '));
  if (stripParens) results.add(stripParens);

  return Array.from(results);
}

/**
 * Extracts synonyms list from card.synonyms (can be array or string delimited by ';' or ',').
 *
 * @param {string|string[]} rawSynonyms
 * @returns {string[]}
 */
export function parseCardSynonyms(rawSynonyms) {
  if (!rawSynonyms) return [];
  if (Array.isArray(rawSynonyms)) {
    return rawSynonyms
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
  }
  if (typeof rawSynonyms === 'string') {
    return rawSynonyms
      .split(/[;,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks an answer against a card and returns:
 * {
 *   result: 'correct' | 'accepted' | 'almost' | 'wrong',
 *   via: 'exact' | 'sense' | 'core' | 'synonym' | 'same-meaning' | 'diacritics-ignored' | null,
 *   matchedText: string | null,
 *   note: string | null
 * }
 *
 * @param {string} input - User submitted answer
 * @param {object} card - Current vocabulary card { id, term, definition, synonyms, ... }
 * @param {'VI_TO_EN'|'EN_TO_VI'|'vi-en'|'en-vi'} direction - Direction of the question
 * @param {object} options - Learn options { ignoreDiacritics: boolean, acceptSynonyms: boolean }
 * @param {Array} deckCards - All cards in the current deck (for same-meaning check)
 * @returns {{
 *   result: 'correct' | 'accepted' | 'almost' | 'wrong',
 *   via: 'exact' | 'sense' | 'core' | 'synonym' | 'same-meaning' | 'diacritics-ignored' | null,
 *   matchedText: string | null,
 *   note: string | null
 * }}
 */
export function checkAnswer(
  input,
  card,
  direction = 'VI_TO_EN',
  options = {},
  deckCards = []
) {
  if (!card) {
    return {
      result: 'wrong',
      via: null,
      matchedText: null,
      note: 'Không tìm thấy thẻ từ vựng',
    };
  }

  const normInput = normalizeAnswer(input);
  if (!normInput) {
    return {
      result: 'wrong',
      via: null,
      matchedText: null,
      note: 'Chưa nhập câu trả lời',
    };
  }

  const isViToEn =
    direction === 'VI_TO_EN' ||
    direction === 'vi_to_en' ||
    direction === 'vi-en';

  if (isViToEn) {
    return checkViToEnAnswer(normInput, card, options, deckCards);
  }

  return checkEnToViAnswer(normInput, card, options);
}

/**
 * Internal logic for Việt -> Anh checking (Answer is English card.term)
 */
function checkViToEnAnswer(normInput, card, options, deckCards) {
  const termRaw = card.term || '';
  const acceptSynonyms = options?.acceptSynonyms !== false;

  // 1. Split term alternatives on "/" or ";"
  const termParts = termRaw
    .split(/[/;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (termParts.length === 0) {
    termParts.push(termRaw);
  }

  // Generate all accepted candidates from target card
  const exactCandidates = new Set();
  for (const part of termParts) {
    for (const exp of expandParentheses(part)) {
      if (exp) exactCandidates.add(exp);
    }
  }
  for (const exp of expandParentheses(termRaw)) {
    if (exp) exactCandidates.add(exp);
  }

  // Check 1: Direct exact match
  if (exactCandidates.has(normInput)) {
    return {
      result: 'correct',
      via: 'exact',
      matchedText: normInput,
      note: null,
    };
  }

  // Check 2: Core English prefix rule (leading to, a, an, the optional on either side)
  // e.g. term "to run" accepts "run", term "run" accepts "to run", "apple" accepts "an apple"
  const strippedInput = stripEnPrefix(normInput);
  for (const cand of exactCandidates) {
    const strippedCand = stripEnPrefix(cand);
    if (strippedInput === strippedCand) {
      return {
        result: 'accepted',
        via: 'core',
        matchedText: cand,
        note: `Chấp nhận. Đáp án trong bộ: ${card.term}`,
      };
    }
  }

  // Check 3: Synonyms (Field 6) if setting ON
  const synonyms = parseCardSynonyms(card.synonyms);
  const synonymCandidates = [];
  for (const syn of synonyms) {
    for (const exp of expandParentheses(syn)) {
      if (exp) {
        synonymCandidates.push({ raw: syn, norm: exp });
      }
    }
  }

  if (acceptSynonyms) {
    for (const item of synonymCandidates) {
      if (
        normInput === item.norm ||
        strippedInput === stripEnPrefix(item.norm)
      ) {
        return {
          result: 'accepted',
          via: 'synonym',
          matchedText: item.raw,
          note: `Chấp nhận (đồng nghĩa). Từ trong bộ: ${card.term}`,
        };
      }
    }
  }

  // Check 4: Same-meaning cards in the deck
  // Term of another card whose normalized definition is identical is accepted via 'same-meaning'
  const currentNormDef = normalizeAnswer(card.definition || '');
  if (currentNormDef && Array.isArray(deckCards)) {
    for (const otherCard of deckCards) {
      if (!otherCard || otherCard.id === card.id) continue;
      const otherNormDef = normalizeAnswer(otherCard.definition || '');
      if (otherNormDef === currentNormDef) {
        const otherParts = (otherCard.term || '')
          .split(/[/;]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        for (const op of otherParts) {
          for (const exp of expandParentheses(op)) {
            if (
              exp === normInput ||
              stripEnPrefix(exp) === strippedInput
            ) {
              return {
                result: 'accepted',
                via: 'same-meaning',
                matchedText: otherCard.term,
                note: `Chấp nhận (thẻ cùng nghĩa). Từ trong bộ: ${card.term}`,
              };
            }
          }
        }
      }
    }
  }

  // Check 5: Typo tolerance (Levenshtein on the whole normalized string)
  // length 4-8 allows distance 1, 9+ allows distance 2, 3 or less none -> 'almost' ("Gần đúng")
  const inputLen = normInput.length;
  const typoPool = Array.from(exactCandidates);
  if (acceptSynonyms) {
    for (const item of synonymCandidates) {
      typoPool.push(item.norm);
    }
  }

  let closestCandidate = null;
  let minDistance = Infinity;

  for (const cand of typoPool) {
    const refLen = Math.min(inputLen, cand.length);
    let allowedDistance = 0;
    if (refLen >= 9) {
      allowedDistance = 2;
    } else if (refLen >= 4) {
      allowedDistance = 1;
    }
    if (allowedDistance === 0) continue;

    const dist = levenshtein(normInput, cand);
    if (dist <= allowedDistance && dist < minDistance) {
      minDistance = dist;
      closestCandidate = cand;
    }
  }

  if (closestCandidate) {
    return {
      result: 'almost',
      via: null,
      matchedText: closestCandidate,
      note: 'Gần đúng! Hãy kiểm tra chính tả.',
    };
  }

  return {
    result: 'wrong',
    via: null,
    matchedText: null,
    note: 'Chưa chính xác',
  };
}

/**
 * Internal logic for Anh -> Việt checking (Answer is Vietnamese card.definition)
 */
function checkEnToViAnswer(normInput, card, options) {
  const defRaw = card.definition || '';
  const ignoreDiacritics = Boolean(
    options?.ignoreDiacritics || options?.ignoreVietnameseDiacritics
  );

  // Split definition into senses on ",", ";", and "/"
  const rawSenses = defRaw
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawSenses.length === 0) {
    rawSenses.push(defRaw);
  }

  // Expand parenthetical variations for each sense
  const allCandidateSenses = [];
  for (const sense of rawSenses) {
    for (const exp of expandParentheses(sense)) {
      if (exp && !allCandidateSenses.includes(exp)) {
        allCandidateSenses.push(exp);
      }
    }
  }

  // Also include the whole definition expanded
  for (const exp of expandParentheses(defRaw)) {
    if (exp && !allCandidateSenses.includes(exp)) {
      allCandidateSenses.push(exp);
    }
  }

  // Filter candidate senses: a sense that reduces to nothing after removing function words is not matchable
  const candidateSenses = allCandidateSenses.filter(
    (s) => stripVnFunctionWords(s).length > 0
  );

  // If user input only consists of function words (e.g. "sự", "việc", "cái") -> core becomes empty -> wrong
  const coreInput = stripVnFunctionWords(normInput);
  if (!coreInput || coreInput.length === 0) {
    return {
      result: 'wrong',
      via: null,
      matchedText: null,
      note: null,
    };
  }

  // Check 1: User input equals the whole definition or any single valid sense
  if (candidateSenses.includes(normInput)) {
    const isWholeDef = normInput === normalizeAnswer(defRaw);
    return {
      result: 'correct',
      via: isWholeDef ? 'exact' : 'sense',
      matchedText: normInput,
      note: null,
    };
  }

  // Check 2: Core-phrase rule
  // Remove leading optional function words (sự, việc, cái, chiếc, con, cuộc, nỗi, niềm, một, những, các)
  // from both the sense and input, then compare.
  // Definition "sự bất ngờ" accepts "bất ngờ" and "sự bất ngờ"; definition "bất ngờ" accepts "sự bất ngờ".
  // Reject inputs with extra content words ("bất ngờ lớn") or a fragment of a multi-word sense ("bất" alone).
  for (const sense of candidateSenses) {
    const coreSense = stripVnFunctionWords(sense);
    if (coreInput === coreSense && coreInput.length > 0) {
      return {
        result: 'accepted',
        via: 'core',
        matchedText: sense,
        note: `Chấp nhận. Đáp án trong bộ: ${sense}`,
      };
    }
  }

  // Check 3: Multi-sense input
  // User input lists several senses (split by comma, semicolon, slash)
  // and EVERY listed part matches a valid sense (exact or core)
  const inputParts = normInput
    .split(/[,;/]+/)
    .map((p) => normalizeAnswer(p))
    .filter(Boolean);

  if (inputParts.length > 1) {
    const allMatch = inputParts.every((part) => {
      if (candidateSenses.includes(part)) return true;
      const cPart = stripVnFunctionWords(part);
      return candidateSenses.some(
        (sense) => stripVnFunctionWords(sense) === cPart
      );
    });

    if (allMatch) {
      return {
        result: 'correct',
        via: 'sense',
        matchedText: normInput,
        note: null,
      };
    }
  }

  // Check 4: Diacritics rule
  // Compare after removing diacritics
  const strippedInput = stripVietnameseDiacritics(normInput);
  const strippedCoreInput = stripVietnameseDiacritics(coreInput);

  let diacriticMatchSense = null;
  for (const sense of candidateSenses) {
    const strippedSense = stripVietnameseDiacritics(sense);
    const strippedCoreSense = stripVietnameseDiacritics(
      stripVnFunctionWords(sense)
    );

    if (
      strippedInput === strippedSense ||
      (strippedCoreInput === strippedCoreSense && strippedCoreInput.length > 0)
    ) {
      diacriticMatchSense = sense;
      break;
    }
  }

  if (!diacriticMatchSense && inputParts.length > 1) {
    const allDiacriticMatch = inputParts.every((part) => {
      const sp = stripVietnameseDiacritics(part);
      const scp = stripVietnameseDiacritics(stripVnFunctionWords(part));
      return candidateSenses.some((sense) => {
        const ss = stripVietnameseDiacritics(sense);
        const scs = stripVietnameseDiacritics(stripVnFunctionWords(sense));
        return sp === ss || scp === scs;
      });
    });

    if (allDiacriticMatch) {
      diacriticMatchSense = normInput;
    }
  }

  if (diacriticMatchSense) {
    if (ignoreDiacritics) {
      return {
        result: 'accepted',
        via: 'diacritics-ignored',
        matchedText: diacriticMatchSense,
        note: `Chấp nhận (bỏ qua dấu). Đáp án trong bộ: ${diacriticMatchSense}`,
      };
    }
    return {
      result: 'almost',
      via: null,
      matchedText: diacriticMatchSense,
      note: 'Đúng chữ nhưng chưa đúng dấu',
    };
  }

  return {
    result: 'wrong',
    via: null,
    matchedText: null,
    note: 'Chưa chính xác',
  };
}
