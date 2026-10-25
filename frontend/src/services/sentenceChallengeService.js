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

    let promptVi = `Dịch câu sau sang tiếng Anh: "Việc hiểu rõ ${meaning || term} là điều rất quan trọng trong cuộc sống."`;
    let referenceEn = example || `Understanding ${term} is very important in life.`;

    if (pos.includes('adj') || pos.includes('tính')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Hôm nay tôi cảm thấy rất ${meaning || term} sau một ngày dài làm việc."`;
      referenceEn = `Today I feel very ${term} after a long day of work.`;
    } else if (pos.includes('verb') || pos.includes('động')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Chúng ta cần ${meaning || term} kế hoạch này để đạt kết quả tốt nhất."`;
      referenceEn = `We need to ${term} this plan to achieve the best results.`;
    } else if (pos.includes('adv') || pos.includes('trạng')) {
      promptVi = `Dịch câu sau sang tiếng Anh: "Cô ấy đã hoàn thành xuất sắc công việc một cách ${meaning || term}."`;
      referenceEn = `She completed the work ${term}.`;
    }

    return {
      cardId: card.id || index + 1,
      targetWord: term,
      meaning: meaning,
      partOfSpeech: card.partOfSpeech || card.wordType || '',
      promptVi: promptVi,
      referenceEn: referenceEn,
      hint: `Gợi ý: Từ loại là ${card.partOfSpeech || card.wordType || 'từ vựng'}. Bắt đầu viết câu hoàn chỉnh.`
    };
  });
}

/**
 * Fallback client evaluation in case backend is unreachable
 */
function evaluateSentenceLocally({ targetWord, userSentence, referenceSentence }) {
  const user = (userSentence || '').trim();
  const target = (targetWord || '').trim().toLowerCase();
  const userLower = user.toLowerCase();

  const regex = new RegExp(`\\b${target.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
  const targetUsed = regex.test(userLower);

  const wordsUser = userLower.split(/\s+/).filter(Boolean);
  const wordsRef = (referenceSentence || '').toLowerCase().split(/\s+/).filter(Boolean);

  let matchCount = 0;
  wordsUser.forEach(w => {
    if (wordsRef.includes(w)) matchCount++;
  });

  const overlap = wordsRef.length > 0 ? matchCount / wordsRef.length : 0.5;
  let score = Math.round(overlap * 60 + (targetUsed ? 40 : 10));
  score = Math.max(20, Math.min(100, score));

  const isCapitalized = /^[A-Z]/.test(user);
  const hasPunctuation = /[.?!]$/.test(user);
  const feedback = [];

  if (targetUsed) {
    feedback.push(`Rất tốt! Bạn đã sử dụng chính xác từ khóa "${targetWord}".`);
  } else {
    feedback.push(`Chú ý: Câu của bạn chưa xuất hiện từ khóa mục tiêu "${targetWord}".`);
  }

  if (score >= 80) {
    feedback.push('Cấu trúc ngữ pháp rõ ràng và câu dịch tự nhiên.');
  } else if (score >= 50) {
    feedback.push('Câu dịch diễn đạt được ý chính nhưng có thể hoàn thiện cách dùng từ hơn.');
  } else {
    feedback.push('Hãy tham khảo câu mẫu gợi ý để viết câu tự nhiên và chuẩn xác hơn.');
  }

  const grammarNotes = [];
  if (!isCapitalized) grammarNotes.push('Nên viết hoa chữ cái đầu câu.');
  if (!hasPunctuation) grammarNotes.push('Nên có dấu câu kết thúc (. ? !).');

  return {
    score,
    targetWordUsed: targetUsed,
    feedback: feedback.join(' '),
    nativeAlternative: referenceSentence || `Here is a natural way to express it with "${targetWord}".`,
    grammarNotes
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
          return res;
        }
      } catch (err) {
        console.warn('Backend get sentence challenges error, falling back:', err);
      }
    }
    return buildFallbackChallenges(cards, deckTitle);
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
          return res;
        }
      } catch (err) {
        console.warn('Backend generate challenges error, falling back:', err);
      }
    }
    return buildFallbackChallenges(cards, deckTitle);
  },

  /**
   * Evaluate a user's sentence
   */
  async evaluateSentence(deckId, payload) {
    if (deckId) {
      try {
        const res = await request(`/decks/${deckId}/sentence-challenges/evaluate`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res && typeof res.score === 'number') {
          return res;
        }
      } catch (err) {
        console.warn('Backend evaluate error, falling back to local evaluation:', err);
      }
    }
    return evaluateSentenceLocally(payload);
  },
};
