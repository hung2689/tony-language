import { describe, it, expect } from 'vitest';
import {
  STUDY_MODES,
  getAvailableModes,
  isModeRoutable,
  getModeById,
  getDefaultMode,
  getModeRoute,
  resolveStudyModeRoute,
} from '../studyModeRegistry';

describe('studyModeRegistry', () => {
  it('defines all required initial study modes with full metadata', () => {
    const ids = STUDY_MODES.map((m) => m.id);
    expect(ids).toEqual(['flashcard', 'learn', 'story', 'test-game', 'dictation']);

    for (const mode of STUDY_MODES) {
      expect(mode).toHaveProperty('id');
      expect(mode).toHaveProperty('label');
      expect(mode).toHaveProperty('icon');
      expect(mode).toHaveProperty('route');
      expect(mode).toHaveProperty('status');
      expect(mode).toHaveProperty('component');
      expect(['available', 'coming-soon']).toContain(mode.status);
    }
  });

  it('marks flashcard, learn and story as available', () => {
    const available = getAvailableModes();
    expect(available).toHaveLength(3);
    expect(available.map((m) => m.id)).toEqual(['flashcard', 'learn', 'story']);
  });

  it('correctly identifies routable modes', () => {
    expect(isModeRoutable('flashcard')).toBe(true);
    expect(isModeRoutable('learn')).toBe(true);
    expect(isModeRoutable('story')).toBe(true);
    expect(isModeRoutable('test-game')).toBe(false);
    expect(isModeRoutable('dictation')).toBe(false);
    expect(isModeRoutable('non-existent')).toBe(false);
  });

  it('returns default mode as flashcard', () => {
    const def = getDefaultMode();
    expect(def.id).toBe('flashcard');
    expect(def.status).toBe('available');
  });

  it('looks up mode by id correctly', () => {
    expect(getModeById('learn')?.label).toBe('Học');
    expect(getModeById('story')?.label).toBe('Đoạn văn ngữ cảnh');
    expect(getModeById('unknown')).toBeNull();
  });

  it('generates correct routes for modes', () => {
    expect(getModeRoute(42, 'flashcard')).toBe('/decks/42');
    expect(getModeRoute(42, 'learn')).toBe('/decks/42/learn');
    expect(getModeRoute(42, 'story')).toBe('/decks/42/story');
    expect(getModeRoute(42, 'test-game')).toBe('/decks/42/test');
    expect(getModeRoute(42, 'dictation')).toBe('/decks/42/dictation');
  });

  describe('resolveStudyModeRoute (Route Guard)', () => {
    it('allows valid flashcard base route without redirection', () => {
      const res = resolveStudyModeRoute(42, '/decks/42');
      expect(res.valid).toBe(true);
      expect(res.modeId).toBe('flashcard');
      expect(res.redirectTo).toBeNull();
    });

    it('allows available mode /decks/42/learn without redirection', () => {
      const res = resolveStudyModeRoute(42, '/decks/42/learn');
      expect(res.valid).toBe(true);
      expect(res.modeId).toBe('learn');
      expect(res.redirectTo).toBeNull();
    });

    it('allows available mode /decks/42/story without redirection', () => {
      const res = resolveStudyModeRoute(42, '/decks/42/story');
      expect(res.valid).toBe(true);
      expect(res.modeId).toBe('story');
      expect(res.redirectTo).toBeNull();
    });

    it('redirects coming-soon mode /decks/42/test back to /decks/42', () => {
      const res = resolveStudyModeRoute(42, '/decks/42/test');
      expect(res.valid).toBe(false);
      expect(res.modeId).toBe('test-game');
      expect(res.redirectTo).toBe('/decks/42');
    });

    it('redirects coming-soon mode /decks/42/dictation back to /decks/42', () => {
      const res = resolveStudyModeRoute(42, '/decks/42/dictation');
      expect(res.valid).toBe(false);
      expect(res.modeId).toBe('dictation');
      expect(res.redirectTo).toBe('/decks/42');
    });

    it('redirects any arbitrary unknown subpath back to /decks/42', () => {
      const res = resolveStudyModeRoute(42, '/decks/42/unknown-mode');
      expect(res.valid).toBe(false);
      expect(res.redirectTo).toBe('/decks/42');
    });
  });
});
