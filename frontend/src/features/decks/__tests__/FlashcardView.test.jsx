import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FlashcardView from '../FlashcardView';

describe('FlashcardView Component', () => {
  const mockCards = [
    {
      id: 1,
      term: 'administrative assistant',
      definition: 'trợ lý hành chính',
      partOfSpeech: 'noun',
      pronunciation: "əd'mɪnɪstreɪtɪv ə'sɪstənt",
      example: 'The administrative assistant scheduled all the interviews.',
      synonyms: 'clerk; secretary',
    },
  ];

  it('renders flashcard with term, meta and controls in default state', () => {
    const html = renderToStaticMarkup(<FlashcardView cards={mockCards} />);
    expect(html).toContain('vintage-flashcard-experience');
    expect(html).not.toContain('is-zen-mode');
    expect(html).toContain('administrative assistant');
    expect(html).toContain('1 / 1');
    expect(html).toContain('Phóng to thẻ (Zen Mode)');
  });

  it('does not have hardcoded is-active-moss on Zen button when zen is inactive', () => {
    const html = renderToStaticMarkup(<FlashcardView cards={mockCards} />);
    // The capsule button should not have both is-active and is-active-moss
    expect(html).not.toContain('vintage-fc-tool-btn is-active-moss is-active');
  });
});
