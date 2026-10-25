import { describe, it, expect, beforeEach } from 'vitest';
import { loadLearnSettings, saveLearnSettings, DEFAULT_LEARN_SETTINGS } from '../learnSettings';

describe('learnSettings', () => {
  let mockStorage;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => {
        store[key] = String(val);
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
  });

  it('returns default settings when storage is empty', () => {
    const settings = loadLearnSettings(mockStorage);
    expect(settings).toEqual(DEFAULT_LEARN_SETTINGS);
  });

  it('safely recovers when storage contains corrupt or invalid JSON', () => {
    mockStorage.setItem('language_learning_learn_settings', 'not-a-valid-json{{{');
    const settings = loadLearnSettings(mockStorage);
    expect(settings).toEqual(DEFAULT_LEARN_SETTINGS);
  });

  it('safely recovers when storage contains non-object values', () => {
    mockStorage.setItem('language_learning_learn_settings', JSON.stringify('a plain string'));
    const settings = loadLearnSettings(mockStorage);
    expect(settings).toEqual(DEFAULT_LEARN_SETTINGS);
  });

  it('persists and loads valid settings properly', () => {
    saveLearnSettings(
      {
        direction: 'EN_TO_VI',
        ignoreDiacritics: true,
        customCount: 15,
        countMode: 'custom',
      },
      mockStorage
    );

    const loaded = loadLearnSettings(mockStorage);
    expect(loaded.direction).toBe('EN_TO_VI');
    expect(loaded.ignoreDiacritics).toBe(true);
    expect(loaded.customCount).toBe(15);
    expect(loaded.countMode).toBe('custom');
    // Defaults preserved for unchanged keys
    expect(loaded.autoSpeak).toBe(true);
    expect(loaded.soundEffects).toBe(true);
  });
});
