/**
 * Browser SpeechSynthesis wrapper for reading English terms.
 * Handles unsupported browsers gracefully with callbacks, never crashing.
 */

export function speakEnglishTerm(text, onError) {
  if (!text || typeof text !== 'string') return false;

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
    if (typeof onError === 'function') {
      onError('Trình duyệt hiện tại không hỗ trợ tính năng phát âm giọng nói (SpeechSynthesis).');
    }
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new window.SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for clear English pronunciation

    // Optional: pick an en-US voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && (v.lang.includes('US') || v.name.includes('English')));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onerror = (e) => {
      // Ignore user cancellation errors
      if (e.error !== 'canceled' && e.error !== 'interrupted' && typeof onError === 'function') {
        onError('Không thể phát âm từ vựng này.');
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    if (typeof onError === 'function') {
      onError('Lỗi khi phát âm từ vựng: ' + (err.message || 'Lỗi hệ thống'));
    }
    return false;
  }
}
