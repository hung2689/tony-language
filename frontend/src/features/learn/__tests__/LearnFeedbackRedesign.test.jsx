import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import LearnFeedback from '../LearnFeedback';

describe('LearnFeedback Redesign (Incorrect Answer UI)', () => {
  const sampleCard = {
    id: 99,
    term: 'supervisor',
    definition: 'người giám sát',
    partOfSpeech: 'noun',
    pronunciation: 'ˈsuːpərvaɪzər',
    example: 'The supervisor approved the request.',
    synonyms: ['manager', 'director', 'overseer'],
  };

  const sampleSessionStats = {
    totalWords: 10,
    masteredWords: 2,
  };

  it('renders incorrect answer UI matching all required sections A, B, C, D, E', () => {
    const feedback = {
      result: 'wrong',
      userAnswer: 'người làm công',
      correctAnswer: 'supervisor',
      card: sampleCard,
      direction: 'VI_TO_EN',
      override: false,
    };

    const html = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'TOEIC Vocabulary' }}
        feedback={feedback}
        sessionStats={sampleSessionStats}
        distinctCardCount={1}
        options={{ autoSpeak: false }}
        onNextQuestion={() => {}}
      />
    );

    // A. Trạng thái trả lời
    expect(html).toContain('Chưa đúng');
    expect(html).toContain('vintage-status-icon is-wrong');

    // B. Bạn trả lời
    expect(html).toContain('Bạn trả lời:');
    expect(html).toContain('vintage-wrong-answer-strikethrough');
    expect(html).toContain('người làm công');

    // C. Đáp án chính xác (Hero English term + Speaker button)
    expect(html).toContain('Đáp án:');
    expect(html).toContain('vintage-english-term-hero');
    expect(html).toContain('supervisor');
    expect(html).toContain('vintage-speaker-btn');

    // D. Từ đồng nghĩa trên 1 dòng với dấu " · "
    expect(html).toContain('Từ đồng nghĩa:');
    expect(html).toContain('manager · director · overseer');

    // E. Nút tiếp tục
    expect(html).toContain('vintage-feedback-continue-btn');
    expect(html).toContain('Tiếp tục');
  });

  it('does NOT render notes, examples, POS tags, IPA or readonly input box in the redesigned card', () => {
    const feedback = {
      result: 'wrong',
      userAnswer: 'sai roi',
      correctAnswer: 'supervisor',
      card: sampleCard,
      note: 'Ghi chú không mong muốn',
      direction: 'VI_TO_EN',
    };

    const html = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'TOEIC' }}
        feedback={feedback}
        sessionStats={sampleSessionStats}
        distinctCardCount={1}
        options={{}}
        onNextQuestion={() => {}}
      />
    );

    // Verify exclusions
    expect(html).not.toContain('Ghi chú không mong muốn');
    expect(html).not.toContain('The supervisor approved the request.');
    expect(html).not.toContain('vintage-ipa-text');
    expect(html).not.toContain('vintage-pos-tag');
    expect(html).not.toContain('vintage-readonly-input-box');
  });

  it('renders Vietnamese definition alongside English hero term when direction is EN_TO_VI', () => {
    const feedback = {
      result: 'wrong',
      userAnswer: 'giam doc',
      correctAnswer: 'người giám sát',
      card: sampleCard,
      direction: 'EN_TO_VI',
    };

    const html = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'TOEIC' }}
        feedback={feedback}
        sessionStats={sampleSessionStats}
        distinctCardCount={1}
        options={{}}
        onNextQuestion={() => {}}
      />
    );

    // Vietnamese answer is rendered under "Đáp án:"
    expect(html).toContain('vintage-correct-meaning-val');
    expect(html).toContain('người giám sát');
    // English term is rendered under "Từ tiếng Anh:"
    expect(html).toContain('Từ tiếng Anh:');
    expect(html).toContain('vintage-english-term-hero');
    expect(html).toContain('supervisor');
  });

  it('handles skipped answer (Tôi chưa biết) cleanly', () => {
    const feedback = {
      result: 'skipped',
      userAnswer: '',
      correctAnswer: 'supervisor',
      card: sampleCard,
      direction: 'VI_TO_EN',
    };

    const html = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'TOEIC' }}
        feedback={feedback}
        sessionStats={sampleSessionStats}
        distinctCardCount={1}
        options={{}}
        onNextQuestion={() => {}}
      />
    );

    expect(html).toContain('(Tôi chưa biết)');
    expect(html).toContain('vintage-wrong-answer-strikethrough');
    expect(html).toContain('supervisor');
  });

  it('generates standalone html file for visual inspection and screenshot', () => {
    const feedback = {
      result: 'wrong',
      userAnswer: 'người yêu',
      correctAnswer: 'giám sát viên',
      card: {
        ...sampleCard,
        definition: 'giám sát viên',
      },
      direction: 'EN_TO_VI',
      override: false,
    };

    const componentHtml = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'GROUP 1 — BUSINESS, MANAGEMENT & STRATEGY' }}
        feedback={feedback}
        sessionStats={{ totalWords: 48, masteredWords: 15 }}
        distinctCardCount={16}
        options={{ autoSpeak: false }}
        onNextQuestion={() => {}}
      />
    );

    const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');
    let css = '';
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
      if (files.length > 0) {
        css = fs.readFileSync(path.join(distAssetsDir, files[0]), 'utf8');
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Preview Learn Incorrect Answer Redesign</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    ${css}
    body {
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      background: #F3E6C8 url('/assets/flashcard/vintage-map-bg.jpg') no-repeat center top / cover fixed;
      font-family: 'Merriweather', 'Lora', serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${componentHtml}
</body>
</html>`;

    const outDir = path.resolve(process.cwd(), '../screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outDir, 'incorrect_answer_preview.html'), fullHtml, 'utf8');
    expect(fs.existsSync(path.join(outDir, 'incorrect_answer_preview.html'))).toBe(true);

    // Also generate correct answer preview HTML
    const correctFeedback = {
      result: 'correct',
      userAnswer: 'supervisor',
      correctAnswer: 'supervisor',
      card: sampleCard,
      direction: 'VI_TO_EN',
      override: false,
    };
    const correctHtml = renderToStaticMarkup(
      <LearnFeedback
        deck={{ name: 'GROUP 1 — BUSINESS, MANAGEMENT & STRATEGY' }}
        feedback={correctFeedback}
        sessionStats={{ totalWords: 48, masteredWords: 16 }}
        distinctCardCount={16}
        options={{ autoSpeak: false }}
        onNextQuestion={() => {}}
      />
    );
    const fullCorrectHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Preview Learn Correct Answer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    ${css}
    body {
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      background: #F3E6C8 url('/assets/flashcard/vintage-map-bg.jpg') no-repeat center top / cover fixed;
      font-family: 'Merriweather', 'Lora', serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${correctHtml}
</body>
</html>`;
    fs.writeFileSync(path.join(outDir, 'correct_answer_preview.html'), fullCorrectHtml, 'utf8');
    expect(fs.existsSync(path.join(outDir, 'correct_answer_preview.html'))).toBe(true);
  });
});
