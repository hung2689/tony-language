import { request } from './api';

/**
 * Fallback local sentence challenge generation if backend is unavailable or mock data is used
 */
function buildFallbackChallenges(cards = [], deckTitle = '') {
  if (!cards || cards.length === 0) return [];

  // Pick up to 5 cards
  const selectedCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 5);

  return selectedCards.map((card, index) => {
    const term = card.term || card.word || '';
    const meaning = (card.definition || card.meaning || '').trim();
    const pos = (card.partOfSpeech || card.wordType || '').toLowerCase();
    const example = card.example || card.exampleSentence || '';

    let promptVi = `Dịch câu sau sang tiếng Anh: "Tôi luôn mang theo ${meaning || term} khi ra ngoài."`;
    let referenceEn = example || `I always bring my ${term} whenever I go outside.`;

    const lowerTerm = term.toLowerCase();
    if (lowerTerm === 'run') {
      promptVi = `Dịch câu sau sang tiếng Anh: "Tôi thường chạy bộ quanh công viên vào mỗi sáng sớm."`;
      referenceEn = `I usually run around the park early in the morning.`;
    } else if (lowerTerm === 'book') {
      promptVi = `Dịch câu sau sang tiếng Anh: "Tôi cần đặt một bàn cho hai người vào tối nay."`;
      referenceEn = `I need to book a table for two tonight.`;
    } else if (pos.includes('adj') || pos.includes('tính')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Thời tiết hôm nay thật ${meaning || term}, rất thích hợp để đi dạo."`;
      referenceEn = `The weather today is very ${term}, perfect for a walk.`;
    } else if (pos.includes('verb') || pos.includes('động')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Tôi cố gắng ${meaning || term} mỗi ngày để hình thành thói quen tốt."`;
      referenceEn = `I try to ${term} every day to build a good habit.`;
    } else if (pos.includes('adv') || pos.includes('trạng')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Cô ấy nói chuyện một cách ${meaning || term} và thân thiện."`;
      referenceEn = `She speaks ${term} and friendly.`;
    }

    return {
      cardId: card.id || index + 1,
      targetWord: term,
      meaning: meaning,
      partOfSpeech: card.partOfSpeech || card.wordType || '',
      promptVi: promptVi,
      referenceEn: referenceEn,
      hint: `Gợi ý đời thường: Hãy đặt câu ngắn gọn, gần gũi với cuộc sống hàng ngày có từ "${term}".`
    };
  });
}

function normalizeChallenge(item, index) {
  if (!item || typeof item !== 'object') return item;
  const promptVi = item.promptVi || item.vietnamesePrompt;
  const referenceEn = item.referenceEn || item.referenceEnglish;
  const cardId = item.cardId || item.termId || index + 1;

  return {
    ...item,
    cardId,
    promptVi: promptVi || (item.targetWord ? `Dịch câu hoặc viết một câu tiếng Anh hoàn chỉnh có chứa từ "${item.targetWord}".` : ''),
    referenceEn: referenceEn || '',
  };
}

export const sentenceChallengeService = {
  /**
   * Fetch sentence challenges for a deck
   */
  async getChallenges(deckId, cards = [], deckTitle = '') {
    if (deckId) {
      try {
        const res = await request(`/decks/${deckId}/sentence-challenges`);
        if (Array.isArray(res) && res.length > 0) {
          return res.map(normalizeChallenge);
        }
      } catch (err) {
        console.warn('Backend get sentence challenges error, using cards:', err);
      }
    }
    return buildFallbackChallenges(cards, deckTitle).map(normalizeChallenge);
  },

  /**
   * Request fresh challenges generation
   */
  async generateNewChallenges(deckId, cards = [], deckTitle = '') {
    if (deckId) {
      try {
        const res = await request(`/decks/${deckId}/sentence-challenges/generate`, {
          method: 'POST',
        });
        if (Array.isArray(res) && res.length > 0) {
          return res.map(normalizeChallenge);
        }
      } catch (err) {
        console.warn('Backend generate challenges error, using cards:', err);
      }
    }
    return buildFallbackChallenges(cards, deckTitle).map(normalizeChallenge);
  },

  /**
   * Evaluate a user's sentence strictly via Gemini AI
   */
  async evaluateSentence(deckId, payload) {
    const enrichedPayload = {
      ...payload,
      vietnamesePrompt: payload.promptVi || payload.vietnamesePrompt,
      promptVi: payload.promptVi || payload.vietnamesePrompt,
      referenceEnglish: payload.referenceSentence || payload.referenceEn || payload.referenceEnglish,
      referenceSentence: payload.referenceSentence || payload.referenceEn || payload.referenceEnglish,
      referenceEn: payload.referenceSentence || payload.referenceEn || payload.referenceEnglish,
      termId: payload.cardId || payload.termId,
      cardId: payload.cardId || payload.termId,
    };

    if (deckId) {
      const res = await request(`/decks/${deckId}/sentence-challenges/evaluate`, {
        method: 'POST',
        body: JSON.stringify(enrichedPayload),
      });
      if (res && typeof res.score === 'number') {
        return res;
      }
    }
    throw new Error('Dịch vụ chấm điểm câu AI Gemini hiện không khả dụng. Vui lòng thử lại sau.');
  },
};
