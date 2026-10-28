import { request } from './api';

export const contextStoryService = {
  /**
   * Generates contextual cloze story for the given deck using Gemini AI.
   * Completely avoids heuristic NLP fallback templates.
   */
  async getContextStory(deckId) {
    if (!deckId) {
      throw new Error('Cần có ID bộ từ vựng để tạo đoạn văn bằng AI.');
    }

    const res = await request(`/decks/${deckId}/context-story`, {
      method: 'POST',
    });

    if (res && res.paragraphs && res.paragraphs.length > 0) {
      return res;
    }

    throw new Error('Dịch vụ AI Gemini hiện chưa tạo được câu chuyện phù hợp. Vui lòng thử lại.');
  },
};
