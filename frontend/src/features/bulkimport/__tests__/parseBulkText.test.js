import { describe, it, expect } from 'vitest';
import {
  parseBulkText,
  parseSynonyms,
  detectDelimiter,
  SAMPLE_BULK_LINES,
} from '../parseBulkText';

describe('parseBulkText Unit Test Suite', () => {
  it('parses the standard 6 sample lines accurately', () => {
    const result = parseBulkText(SAMPLE_BULK_LINES);

    expect(result.delimiter).toBe('|');
    expect(result.summary.total).toBe(6);
    expect(result.summary.valid).toBe(5); // 5 unique valid
    expect(result.summary.duplicates).toBe(1); // line 6 is duplicate of 'hello'
    expect(result.summary.warnings).toBe(0);
    expect(result.summary.errors).toBe(0);

    const first = result.rows[0];
    expect(first.lineNumber).toBe(1);
    expect(first.fields.term).toBe('hello');
    expect(first.fields.definition).toBe('xin chào');
    expect(first.fields.pronunciation).toBe('/həˈloʊ/');
    expect(first.fields.partOfSpeech).toBe('interjection');
    expect(first.fields.example).toBe('Hello, how are you?');
    expect(first.fields.synonyms).toEqual(['hi', 'hey']);
  });

  it('handles missing optional fields with preserved pipe positions', () => {
    const input = 'hello|xin chào|||Hello!|';
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.errors).toBe(0);

    const row = result.rows[0];
    expect(row.fields.term).toBe('hello');
    expect(row.fields.definition).toBe('xin chào');
    expect(row.fields.pronunciation).toBe('');
    expect(row.fields.partOfSpeech).toBe('');
    expect(row.fields.example).toBe('Hello!');
    expect(row.fields.synonyms).toEqual([]);
  });

  it('rejects lines with fewer than 6 fields', () => {
    const input = 'book|quyển sách|/bʊk/|noun';
    const result = parseBulkText(input);

    expect(result.summary.errors).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors[0]).toContain('Thiếu trường dữ liệu');
  });

  it('rejects lines with more than 6 fields', () => {
    const input = 'run|chạy|/rʌn/|verb|I run|jog|extra|another';
    const result = parseBulkText(input);

    expect(result.summary.errors).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors[0]).toContain('Thừa trường dữ liệu');
  });

  it('flags missing term as error', () => {
    const input = '|định nghĩa|/test/|noun|example|syn';
    const result = parseBulkText(input);

    expect(result.summary.errors).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors[0]).toContain('Thuật ngữ (cột 1) không được để trống');
  });

  it('flags missing definition as error', () => {
    const input = 'term||/test/|noun|example|syn';
    const result = parseBulkText(input);

    expect(result.summary.errors).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors[0]).toContain('Định nghĩa (cột 2) không được để trống');
  });

  it('skips blank lines while preserving original 1-based line numbers', () => {
    const input = `\n\n\n\nbook|quyển sách|/bʊk/|noun|A book|volume\n\ncat|con mèo|/kæt/|noun|A cat|feline`;
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(2);
    expect(result.rows[0].lineNumber).toBe(5);
    expect(result.rows[1].lineNumber).toBe(7);
  });

  it('handles both Windows CRLF and Unix LF line breaks', () => {
    const input = 'apple|quả táo||noun||\r\nbanana|quả chuối||noun||';
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(2);
    expect(result.rows[0].fields.term).toBe('apple');
    expect(result.rows[1].fields.term).toBe('banana');
  });

  it('supports Tab-delimited pasting from Excel and Google Sheets', () => {
    const input = 'laptop\tmáy tính xách tay\t/ˈlæptɑːp/\tnoun\tMy laptop is fast.\tnotebook; computer';
    const result = parseBulkText(input);

    expect(result.delimiter).toBe('\t');
    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.rows[0].fields.term).toBe('laptop');
    expect(result.rows[0].fields.definition).toBe('máy tính xách tay');
    expect(result.rows[0].fields.synonyms).toEqual(['notebook', 'computer']);
  });

  it('enforces delimiter priority rule: pipe takes priority if present anywhere', () => {
    const lines = [
      'table\tbàn\t/ˈteɪbl/\tnoun\tA wooden table\tdesk',
      'chair|ghế|/tʃer/|noun|Sit on the chair|seat',
    ];
    const detected = detectDelimiter(lines);
    expect(detected).toBe('|');

    const result = parseBulkText(lines.join('\n'));
    expect(result.delimiter).toBe('|');
    // Line 1 uses tab but delimiter is pipe -> line 1 fails field count, line 2 passes
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[1].status).toBe('valid');
  });

  it('trims outer whitespace from all fields while keeping internal spaces', () => {
    const input = '   coffee   |   cà phê   |  /ˈkɔːfi/  |  noun  |  I drink hot coffee.  |  java ; espresso  ';
    const result = parseBulkText(input);

    const f = result.rows[0].fields;
    expect(f.term).toBe('coffee');
    expect(f.definition).toBe('cà phê');
    expect(f.pronunciation).toBe('/ˈkɔːfi/');
    expect(f.partOfSpeech).toBe('noun');
    expect(f.example).toBe('I drink hot coffee.');
    expect(f.synonyms).toEqual(['java', 'espresso']);
  });

  it('normalizes Unicode from NFD to NFC for Vietnamese text', () => {
    // 'tiếng' in NFD (decomposed) vs NFC (composed)
    const nfdTerm = 'tiê' + '\u0301' + 'ng'; // decomposed
    const input = `${nfdTerm}|ngôn ngữ||noun||`;
    const result = parseBulkText(input);

    expect(result.rows[0].fields.term).toBe('tiếng'.normalize('NFC'));
  });

  it('preserves complex IPA characters without corruption', () => {
    const ipa = '/ˌɪn.təˈnæʃ.ən.əl/';
    const input = `international|quốc tế|${ipa}|adjective|international trade|global; worldwide`;
    const result = parseBulkText(input);

    expect(result.rows[0].fields.pronunciation).toBe(ipa);
  });

  it('splits synonyms by semicolon, trims, drops empty items, and deduplicates case-insensitively', () => {
    const syns = parseSynonyms(' hi ; HEY ; hi ; ; Hello ; HELLO ; howdy ');
    expect(syns).toEqual(['hi', 'HEY', 'Hello', 'howdy']);
  });

  it('ensures semicolons do not split cards', () => {
    const input = 'start|bắt đầu|/stɑːrt/|verb|Let us start; we are ready.|begin; initiate; commence';
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(1);
    expect(result.rows[0].fields.example).toBe('Let us start; we are ready.');
    expect(result.rows[0].fields.synonyms).toEqual(['begin', 'initiate', 'commence']);
  });

  it('marks duplicate terms within the same paste with DUPLICATE status', () => {
    const input = `cat|con mèo||noun||\ndog|con chó||noun||\nCAT|mèo nhỏ||noun||`;
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(3);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[1].status).toBe('valid');
    expect(result.rows[2].status).toBe('duplicate');
    expect(result.rows[2].duplicateReason).toContain('bị trùng lặp với dòng 1');
  });

  it('marks terms that already exist in the deck with DUPLICATE status', () => {
    const input = 'existingWord|định nghĩa||noun||';
    const result = parseBulkText(input, { existingTerms: ['EXISTINGWORD', 'otherWord'] });

    expect(result.summary.total).toBe(1);
    expect(result.rows[0].status).toBe('duplicate');
    expect(result.rows[0].duplicateReason).toContain('đã tồn tại trong bộ từ vựng này');
  });

  it('gives non-blocking warning for non-standard part of speech', () => {
    const input = 'look at|nhìn vào||phrasal verb|Look at this|';
    const result = parseBulkText(input);

    expect(result.summary.total).toBe(1);
    expect(result.rows[0].status).toBe('warning');
    expect(result.rows[0].warnings[0]).toContain("không thuộc danh mục chuẩn");
    expect(result.rows[0].errors).toHaveLength(0);
  });

  it('enforces schema length limits from V1__init_schema.sql', () => {
    const longTerm = 'a'.repeat(256); // max 255
    const input = `${longTerm}|định nghĩa||noun||`;
    const result = parseBulkText(input);

    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors[0]).toContain('vượt quá độ dài tối đa');
  });

  it('enforces hard 500-line limit per paste', () => {
    const lines = [];
    for (let i = 1; i <= 501; i++) {
      lines.push(`term${i}|def${i}||noun||`);
    }
    const result = parseBulkText(lines.join('\n'));

    expect(result.isExceededLimit).toBe(true);
    expect(result.globalError).toContain('Vượt quá giới hạn 500 thẻ');
    expect(result.rows).toHaveLength(0);
  });
});
