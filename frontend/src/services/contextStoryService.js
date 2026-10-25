import { request } from './api';

const VERB_TEMPLATES = [
  {
    en: 'During our daily journey, we decided to %s with great focus and dedication.',
    vi: 'Trong hành trình mỗi ngày, chúng tôi quyết định (%s) với sự tập trung và nhiệt huyết.',
  },
  {
    en: 'To overcome the upcoming challenge, everyone worked together to %s effectively.',
    vi: 'Để vượt qua thử thách sắp tới, mọi người đã cùng nhau (%s) một cách hiệu quả.',
  },
  {
    en: 'Our mentor encouraged us to %s whenever new opportunities arise.',
    vi: 'Người hướng dẫn khuyến khích chúng tôi (%s) bất cứ khi nào cơ hội mới xuất hiện.',
  },
  {
    en: 'Step by step, the team learned how to %s to achieve higher performance.',
    vi: 'Từng bước một, toàn đội đã học cách (%s) để đạt hiệu suất cao hơn.',
  },
];

const ADJ_TEMPLATES = [
  {
    en: 'Everyone in the team was impressed by such a %s approach to solving the challenge.',
    vi: 'Mọi người trong đội đều ấn tượng bởi cách tiếp cận (%s) để giải quyết thử thách.',
  },
  {
    en: 'We discovered that cultivating a %s mindset opened up many unexpected possibilities.',
    vi: 'Chúng tôi phát hiện ra rằng việc nuôi dưỡng tư duy (%s) đã mở ra nhiều cơ hội bất ngờ.',
  },
  {
    en: 'It was truly a %s experience that strengthened our confidence in the path ahead.',
    vi: 'Đó thực sự là một trải nghiệm (%s) giúp củng cố niềm tin vào con đường phía trước.',
  },
  {
    en: 'The atmosphere became remarkably %s as positive results began to show.',
    vi: 'Bầu không khí trở nên vô cùng (%s) khi những kết quả khả quan bắt đầu xuất hiện.',
  },
];

const ADV_TEMPLATES = [
  {
    en: 'The speaker expressed the core vision %s, inspiring everyone in the room.',
    vi: 'Diễn giả đã truyền đạt tầm nhìn cốt lõi (%s), truyền cảm hứng cho mọi người trong phòng.',
  },
  {
    en: 'With persistence and passion, they worked %s to reach their long-term milestones.',
    vi: 'Với sự kiên trì và đam mê, họ đã làm việc (%s) để đạt được các cột mốc dài hạn.',
  },
  {
    en: 'The instructions were delivered %s, making the complex concepts crystal clear.',
    vi: 'Các hướng dẫn được trình bày (%s), giúp các khái niệm phức tạp trở nên sáng rõ.',
  },
  {
    en: 'Everything progressed %s once the core principles were understood.',
    vi: 'Mọi thứ tiến triển (%s) một khi các nguyên tắc cốt lõi đã được thấu hiểu.',
  },
];

const GENERAL_TEMPLATES = [
  {
    en: 'We realized that this %s plays a vital role in our ongoing mission.',
    vi: 'Chúng tôi nhận ra rằng (%s) này đóng vai trò thiết yếu trong sứ mệnh của mình.',
  },
  {
    en: 'Through consistent practice, understanding the %s became second nature to us.',
    vi: 'Thông qua luyện tập đều đặn, việc hiểu rõ (%s) đã trở thành phản xạ tự nhiên của chúng tôi.',
  },
  {
    en: 'The team held an in-depth session exploring how the %s impacts real-world success.',
    vi: 'Cả nhóm đã có một buổi thảo luận chuyên sâu về việc (%s) tác động ra sao đến thành công thực tế.',
  },
  {
    en: 'Gaining deep mastery over this %s laid the solid groundwork for all future achievements.',
    vi: 'Làm chủ được (%s) này đã đặt nền móng vững chắc cho mọi thành tựu trong tương lai.',
  },
];

/**
 * Safely locates target term or its inflected form inside example sentence with \b boundaries.
 * Returns { found: boolean, replacedText: string, matchedWord: string }
 */
export function findAndReplaceTerm(example, term, placeholder) {
  if (!example || !term || !term.trim()) {
    return { found: false, replacedText: example || '', matchedWord: null };
  }

  const cleanTerm = term.trim();
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [];

  // 1. Exact whole word match
  patterns.push(new RegExp(`\\b${escapeRegex(cleanTerm)}\\b`, 'i'));

  // 2. Extract core term if particle prefix is present (e.g. "to explore", "a novel")
  let coreTerm = cleanTerm;
  const lowerTerm = cleanTerm.toLowerCase();
  if (lowerTerm.startsWith('to ') && cleanTerm.length > 3) {
    coreTerm = cleanTerm.substring(3).trim();
    patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}\\b`, 'i'));
  } else if (lowerTerm.startsWith('a ') && cleanTerm.length > 2) {
    coreTerm = cleanTerm.substring(2).trim();
    patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}\\b`, 'i'));
  } else if (lowerTerm.startsWith('an ') && cleanTerm.length > 3) {
    coreTerm = cleanTerm.substring(3).trim();
    patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}\\b`, 'i'));
  } else if (lowerTerm.startsWith('the ') && cleanTerm.length > 4) {
    coreTerm = cleanTerm.substring(4).trim();
    patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}\\b`, 'i'));
  }

  // 3. Inflected forms (using coreTerm)
  if (!coreTerm.includes(' ') && coreTerm.length >= 3) {
    const len = coreTerm.length;
    const lastChar = coreTerm[len - 1].toLowerCase();

    if (lastChar === 'e') {
      const root = coreTerm.slice(0, len - 1);
      patterns.push(new RegExp(`\\b${escapeRegex(root)}(ing|ed|es|e)\\b`, 'i'));
      patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}(s|d)?\\b`, 'i'));
    } else if (lastChar === 'y') {
      const root = coreTerm.slice(0, len - 1);
      patterns.push(new RegExp(`\\b${escapeRegex(root)}(ied|ies)\\b`, 'i'));
      patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}(ing)?\\b`, 'i'));
    } else {
      patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}${lastChar}(ing|ed)\\b`, 'i'));
      patterns.push(new RegExp(`\\b${escapeRegex(coreTerm)}(s|es|ed|ing|ly)?\\b`, 'i'));
    }
  }

  for (const regex of patterns) {
    const match = regex.exec(example);
    if (match) {
      const matchedWord = match[0];
      const replacedText = example.replace(regex, placeholder);
      return { found: true, replacedText, matchedWord };
    }
  }

  return { found: false, replacedText: example, matchedWord: null };
}

/**
 * Fallback procedural story generator when backend endpoint is not reachable or deck is local.
 */
export function buildFallbackStory(deckId, cards, deckTitle = '') {
  if (!cards || cards.length === 0) {
    throw new Error('Bộ từ vựng cần có ít nhất 1 thẻ để tạo đoạn văn ngữ cảnh.');
  }

  // Pick up to 10 cards
  const selectedCards = [...cards].slice(0, 10);
  const chunkSize = selectedCards.length <= 4 ? selectedCards.length : Math.min(4, Math.ceil(selectedCards.length / 2));
  const paragraphs = [];
  let blankIndex = 0;
  let paragraphNum = 0;

  for (let i = 0; i < selectedCards.length; i += chunkSize) {
    const chunk = selectedCards.slice(i, i + chunkSize);
    const enParts = [];
    const viParts = [];
    const paragraphBlanks = [];

    chunk.forEach((card) => {
      const synonyms = Array.isArray(card.synonyms) ? [...card.synonyms] : [];
      const blank = {
        index: blankIndex,
        cardId: card.id,
        term: card.term,
        definition: card.definition,
        partOfSpeech: card.partOfSpeech || '',
        example: card.example || '',
        synonyms,
      };

      const placeholder = `{{${blankIndex}}}`;
      let enSentence = '';
      let viSentence = '';

      const matchResult = findAndReplaceTerm(card.example, card.term, placeholder);

      if (matchResult.found) {
        enSentence = matchResult.replacedText;
        viSentence = `Ví dụ: ${card.example} (Nghĩa: ${card.definition})`;
        blank.matchedWord = matchResult.matchedWord || card.term;
        if (
          matchResult.matchedWord &&
          matchResult.matchedWord.toLowerCase() !== (card.term || '').toLowerCase()
        ) {
          const lowerMatched = matchResult.matchedWord.toLowerCase();
          if (!synonyms.includes(lowerMatched)) {
            synonyms.push(lowerMatched);
          }
        }
      } else {
        const pos = (card.partOfSpeech || '').toLowerCase();
        const def = card.definition || '';

        let pool = GENERAL_TEMPLATES;
        if (pos.includes('verb') || pos.includes('động từ') || pos === 'v') {
          pool = VERB_TEMPLATES;
        } else if (pos.includes('adj') || pos.includes('tính từ')) {
          pool = ADJ_TEMPLATES;
        } else if (pos.includes('adv') || pos.includes('trạng từ')) {
          pool = ADV_TEMPLATES;
        }

        const template = pool[blankIndex % pool.length];
        enSentence = template.en.replace('%s', placeholder);
        viSentence = template.vi.replace('%s', def);
        blank.matchedWord = card.term;
      }

      // If term starts with "to ", register core word as synonym
      const cleanTerm = (card.term || '').trim();
      if (cleanTerm.toLowerCase().startsWith('to ') && cleanTerm.length > 3) {
        const core = cleanTerm.substring(3).trim().toLowerCase();
        if (!synonyms.includes(core)) {
          synonyms.push(core);
        }
      }

      paragraphBlanks.push(blank);
      enParts.push(enSentence);
      viParts.push(viSentence);
      blankIndex++;
    });

    paragraphs.push({
      paragraphIndex: paragraphNum++,
      text: enParts.join(' '),
      translation: viParts.join(' '),
      blanks: paragraphBlanks,
    });
  }

  return {
    id: `local-story-${deckId || 'temp'}-${Date.now()}`,
    deckId,
    title: deckTitle ? `Câu chuyện ngữ cảnh: ${deckTitle}` : 'Hành trình khám phá từ vựng',
    paragraphs,
    totalBlanks: blankIndex,
  };
}

export const contextStoryService = {
  /**
   * Generates or fetches contextual cloze story for the given deck.
   * If deckId is available, tries backend first, fallback to client-side synthesis.
   */
  async getContextStory(deckId, cards, deckTitle = '') {
    if (deckId) {
      try {
        const res = await request(`/decks/${deckId}/context-story`, {
          method: 'POST',
        });
        if (res && res.paragraphs && res.paragraphs.length > 0) {
          return res;
        }
      } catch (err) {
        // Graceful fallback to client generation if network/API fails
        console.warn('Backend story generation unavailable, using local synthesis:', err);
      }
    }
    return buildFallbackStory(deckId, cards, deckTitle);
  },
};
