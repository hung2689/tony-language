const GEMINI_STORAGE_KEY = 'user_gemini_api_key';

/**
 * Retrieves the stored Gemini API Key for the current user.
 */
export function getGeminiApiKey() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Saves or updates user's personal Gemini API Key.
 */
export function setGeminiApiKey(apiKey) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = (apiKey || '').trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('gemini_api_key_changed', { detail: trimmed }));
  } catch (err) {
    console.error('Error saving Gemini API key to localStorage:', err);
  }
}

/**
 * Removes user's personal Gemini API Key.
 */
export function removeGeminiApiKey() {
  setGeminiApiKey('');
}

/**
 * Checks if user has configured their Gemini API key.
 */
export function hasGeminiApiKey() {
  return Boolean(getGeminiApiKey());
}
