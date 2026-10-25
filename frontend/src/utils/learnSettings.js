const LEARN_SETTINGS_KEY = 'language_learning_learn_settings';

export const DEFAULT_LEARN_SETTINGS = {
  countMode: 'all',
  customCount: 10,
  order: 'random',
  direction: 'VI_TO_EN',
  autoSpeak: true,
  soundEffects: true,
  ignoreDiacritics: false,
  acceptSynonyms: true,
  autoAdvance: false,
};

/**
 * Loads learn settings from localStorage safely.
 * Returns default settings if missing, corrupt, or on error.
 *
 * @param {Storage} [storage=window?.localStorage] - Storage implementation for testing
 * @returns {typeof DEFAULT_LEARN_SETTINGS}
 */
export function loadLearnSettings(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) return { ...DEFAULT_LEARN_SETTINGS };

  try {
    const raw = storage.getItem(LEARN_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_LEARN_SETTINGS };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_LEARN_SETTINGS };
    }

    return {
      countMode: parsed.countMode === 'custom' ? 'custom' : 'all',
      customCount: Number.isInteger(parsed.customCount) && parsed.customCount > 0 ? parsed.customCount : 10,
      order: parsed.order === 'order' ? 'order' : 'random',
      direction: ['VI_TO_EN', 'EN_TO_VI', 'RANDOM'].includes(parsed.direction) ? parsed.direction : 'VI_TO_EN',
      autoSpeak: typeof parsed.autoSpeak === 'boolean' ? parsed.autoSpeak : true,
      soundEffects: typeof parsed.soundEffects === 'boolean' ? parsed.soundEffects : true,
      ignoreDiacritics: typeof parsed.ignoreDiacritics === 'boolean' ? parsed.ignoreDiacritics : false,
      autoAdvance: typeof parsed.autoAdvance === 'boolean' ? parsed.autoAdvance : false,
    };
  } catch {
    return { ...DEFAULT_LEARN_SETTINGS };
  }
}

/**
 * Saves learn settings to localStorage safely.
 *
 * @param {Partial<typeof DEFAULT_LEARN_SETTINGS>} newSettings
 * @param {Storage} [storage=window?.localStorage] - Storage implementation for testing
 */
export function saveLearnSettings(newSettings, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) return;

  try {
    const current = loadLearnSettings(storage);
    const merged = { ...current, ...newSettings };
    storage.setItem(LEARN_SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota or access errors safely
  }
}
