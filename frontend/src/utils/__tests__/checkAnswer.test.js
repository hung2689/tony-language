import { describe, it, expect } from 'vitest';
import {
  checkAnswer,
  normalizeAnswer,
  stripVietnameseDiacritics,
  stripVnFunctionWords,
  stripEnPrefix,
  expandParentheses,
  parseCardSynonyms,
} from '../checkAnswer';

describe('checkAnswer (Section 6 - Meaning-based Answer Checking)', () => {
  const surpriseCard = {
    id: 1,
    term: 'surprise',
    definition: 'sự bất ngờ',
  };

  const simpleSurpriseCard = {
    id: 2,
    term: 'surprise',
    definition: 'bất ngờ',
  };

  const multiSenseCard = {
    id: 3,
    term: 'run',
    definition: 'chạy, đi nhanh; vận hành / hoạt động',
    synonyms: 'sprint; jog',
  };

  const infinitiveCard = {
    id: 4,
    term: 'to run',
    definition: 'chạy',
    synonyms: 'to sprint',
  };

  const articleCard = {
    id: 5,
    term: 'an apple',
    definition: 'quả táo',
  };

  const parensCardEn = {
    id: 6,
    term: 'take (a) look',
    definition: 'nhìn, xem qua',
  };

  const parensCardVi = {
    id: 7,
    term: 'cat',
    definition: '(con) mèo',
  };

  const slashTermCard = {
    id: 8,
    term: 'hi / hello; hey',
    definition: 'xin chào',
  };

  const synonymCard = {
    id: 9,
    term: 'observe',
    definition: 'quan sát',
    synonyms: 'watch; witness; look at',
  };

  const typoShortCard = {
    id: 10,
    term: 'cat',
    definition: 'con mèo',
  };

  const typoMidCard = {
    id: 11,
    term: 'friend',
    definition: 'người bạn',
  };

  const typoLongCard = {
    id: 12,
    term: 'extraordinary',
    definition: 'phi thường',
  };

  const deckCards = [
    surpriseCard,
    simpleSurpriseCard,
    multiSenseCard,
    infinitiveCard,
    articleCard,
    parensCardEn,
    parensCardVi,
    slashTermCard,
    synonymCard,
    typoShortCard,
    typoMidCard,
    typoLongCard,
    {
      id: 99,
      term: 'glance',
      definition: 'nhìn, xem qua', // same meaning as parensCardEn
    },
  ];

  // =========================================================================
  // Helper functions tests
  // =========================================================================
  describe('Helper functions normalization', () => {
    it('1. normalizeAnswer: trims and collapses inner whitespace', () => {
      expect(normalizeAnswer('   xin    chào    bạn   ')).toBe('xin chào bạn');
    });

    it('2. normalizeAnswer: converts uppercase to lowercase', () => {
      expect(normalizeAnswer('HELLO WORLD')).toBe('hello world');
    });

    it('3. normalizeAnswer: converts curly quotes and apostrophes', () => {
      expect(normalizeAnswer("it’s great")).toBe("it's great");
      expect(normalizeAnswer("‘hello’")).toBe("hello");
      expect(normalizeAnswer('“world”')).toBe('world');
    });

    it('4. normalizeAnswer: unifies dash variants', () => {
      expect(normalizeAnswer('state—of–the-art')).toBe('state-of-the-art');
    });

    it('5. normalizeAnswer: strips leading and trailing edge punctuation', () => {
      expect(normalizeAnswer('...“Hello, world!”???')).toBe('hello, world');
      expect(normalizeAnswer('["essential"]')).toBe('essential');
    });

    it('6. stripVietnameseDiacritics: removes tones and maps đ/Đ to d', () => {
      expect(stripVietnameseDiacritics('Đường đời')).toBe('duong doi');
      expect(stripVietnameseDiacritics('sự bất ngờ')).toBe('su bat ngo');
    });

    it('7. stripVnFunctionWords: removes leading function words correctly', () => {
      expect(stripVnFunctionWords('sự bất ngờ')).toBe('bất ngờ');
      expect(stripVnFunctionWords('con mèo')).toBe('mèo');
      expect(stripVnFunctionWords('chiếc xe')).toBe('xe');
      expect(stripVnFunctionWords('bất ngờ')).toBe('bất ngờ');
    });

    it('8. stripEnPrefix: removes leading articles and infinitive markers', () => {
      expect(stripEnPrefix('to run')).toBe('run');
      expect(stripEnPrefix('a car')).toBe('car');
      expect(stripEnPrefix('an apple')).toBe('apple');
      expect(stripEnPrefix('the end')).toBe('end');
      expect(stripEnPrefix('run')).toBe('run');
    });

    it('9. expandParentheses: expands optional parenthetical content', () => {
      const exp = expandParentheses('take (a) look');
      expect(exp).toContain('take a look');
      expect(exp).toContain('take look');
    });

    it('10. parseCardSynonyms: parses array or delimited string', () => {
      expect(parseCardSynonyms('hi; hello, hey')).toEqual(['hi', 'hello', 'hey']);
      expect(parseCardSynonyms(['one', 'two'])).toEqual(['one', 'two']);
    });
  });

  // =========================================================================
  // Empty, null and invalid input
  // =========================================================================
  describe('Empty and invalid input handling', () => {
    it('11. rejects empty string input', () => {
      const res = checkAnswer('', surpriseCard, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
      expect(res.via).toBeNull();
      expect(res.note).toBe('Chưa nhập câu trả lời');
    });

    it('12. rejects whitespace-only string', () => {
      const res = checkAnswer('   ', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('wrong');
      expect(res.via).toBeNull();
    });

    it('13. rejects null or undefined card gracefully', () => {
      const res = checkAnswer('hello', null, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
      expect(res.note).toBe('Không tìm thấy thẻ từ vựng');
    });
  });

  // =========================================================================
  // Vietnamese answers (Anh → Việt, target = card.definition)
  // =========================================================================
  describe('Vietnamese answers (Anh → Việt)', () => {
    it('14. exact match on definition returns correct via exact', () => {
      const res = checkAnswer('sự bất ngờ', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('correct');
      expect(res.via).toBe('exact');
    });

    it('15. core-phrase rule: definition "sự bất ngờ" accepts "bất ngờ" via core', () => {
      const res = checkAnswer('bất ngờ', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('core');
      expect(res.note).toContain('Chấp nhận');
    });

    it('16. core-phrase rule: definition "bất ngờ" accepts "sự bất ngờ" via core', () => {
      const res = checkAnswer('sự bất ngờ', simpleSurpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('core');
      expect(res.note).toContain('Chấp nhận');
    });

    it('17. core-phrase rule: strictly rejects fragment "bất" alone', () => {
      const res = checkAnswer('bất', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('wrong');
    });

    it('18. core-phrase rule: strictly rejects extra content words "bất ngờ lớn"', () => {
      const res = checkAnswer('bất ngờ lớn', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('wrong');
    });

    it('19. accepts any single sense from comma/semicolon/slash split', () => {
      expect(checkAnswer('chạy', multiSenseCard, 'EN_TO_VI').result).toBe('correct');
      expect(checkAnswer('đi nhanh', multiSenseCard, 'EN_TO_VI').result).toBe('correct');
      expect(checkAnswer('vận hành', multiSenseCard, 'EN_TO_VI').result).toBe('correct');
      expect(checkAnswer('hoạt động', multiSenseCard, 'EN_TO_VI').result).toBe('correct');
    });

    it('20. accepts multiple senses if all listed parts match valid senses', () => {
      const res = checkAnswer('chạy, vận hành', multiSenseCard, 'EN_TO_VI');
      expect(res.result).toBe('correct');
      expect(res.via).toBe('sense');
    });

    it('21. rejects multiple senses if any part is incorrect', () => {
      const res = checkAnswer('chạy, ngủ nghỉ', multiSenseCard, 'EN_TO_VI');
      expect(res.result).toBe('wrong');
    });

    it('22. parenthetical definitions: accepts with and without parens ("(con) mèo")', () => {
      expect(checkAnswer('con mèo', parensCardVi, 'EN_TO_VI').result).toBe('correct');
      expect(checkAnswer('mèo', parensCardVi, 'EN_TO_VI').result).toBe('correct');
    });

    it('23. diacritics-only difference gives almost when ignoreDiacritics is OFF', () => {
      const res = checkAnswer('su bat ngo', surpriseCard, 'EN_TO_VI', { ignoreDiacritics: false });
      expect(res.result).toBe('almost');
      expect(res.note).toBe('Đúng chữ nhưng chưa đúng dấu');
    });

    it('24. diacritics-only difference gives accepted via diacritics-ignored when ignoreDiacritics is ON', () => {
      const res = checkAnswer('su bat ngo', surpriseCard, 'EN_TO_VI', { ignoreDiacritics: true });
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('diacritics-ignored');
      expect(res.note).toContain('Chấp nhận');
    });

    it('25. diacritics-only difference with core-phrase stripped when ignoreDiacritics is ON', () => {
      // definition "sự bất ngờ", user types "bat ngo"
      const res = checkAnswer('bat ngo', surpriseCard, 'EN_TO_VI', { ignoreDiacritics: true });
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('diacritics-ignored');
    });

    it('26. NFC vs NFD Vietnamese input matches seamlessly', () => {
      // 'bất ngờ' typed in NFD (decomposed)
      const nfd = 'b' + 'a\u0302\u0301' + 't ng' + 'o\u031b\u0300';
      const res = checkAnswer(nfd, simpleSurpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('correct');
    });
  });

  // =========================================================================
  // English answers (Việt → Anh, target = card.term)
  // =========================================================================
  describe('English answers (Việt → Anh)', () => {
    it('27. accepts exact term match', () => {
      const res = checkAnswer('surprise', surpriseCard, 'VI_TO_EN');
      expect(res.result).toBe('correct');
      expect(res.via).toBe('exact');
    });

    it('28. accepts alternatives split on "/" or ";"', () => {
      expect(checkAnswer('hi', slashTermCard, 'VI_TO_EN').result).toBe('correct');
      expect(checkAnswer('hello', slashTermCard, 'VI_TO_EN').result).toBe('correct');
      expect(checkAnswer('hey', slashTermCard, 'VI_TO_EN').result).toBe('correct');
    });

    it('29. "to run" vs "run": term "to run" accepts "run" via core', () => {
      const res = checkAnswer('run', infinitiveCard, 'VI_TO_EN');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('core');
      expect(res.note).toContain('to run');
    });

    it('30. "run" vs "to run": term "run" accepts "to run" via core', () => {
      const res = checkAnswer('to run', multiSenseCard, 'VI_TO_EN');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('core');
      expect(res.note).toContain('run');
    });

    it('31. "an apple" vs "apple": term "an apple" accepts "apple" via core', () => {
      const res = checkAnswer('apple', articleCard, 'VI_TO_EN');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('core');
      expect(res.note).toContain('an apple');
    });

    it('32. parenthetical English term: accepts "take a look" and "take look"', () => {
      expect(checkAnswer('take a look', parensCardEn, 'VI_TO_EN').result).toBe('correct');
      expect(checkAnswer('take look', parensCardEn, 'VI_TO_EN').result).toBe('correct');
    });

    it('33. synonyms ON (default): accepts synonym via synonym', () => {
      const res = checkAnswer('watch', synonymCard, 'VI_TO_EN');
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('synonym');
      expect(res.note).toContain('observe');
    });

    it('34. synonyms ON: accepts synonym with leading "to" stripped', () => {
      const res = checkAnswer('sprint', infinitiveCard, 'VI_TO_EN'); // synonyms: "to sprint"
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('synonym');
    });

    it('35. synonyms OFF: rejects synonym if acceptSynonyms is false', () => {
      const res = checkAnswer('watch', synonymCard, 'VI_TO_EN', { acceptSynonyms: false });
      expect(res.result).toBe('wrong');
    });

    it('36. synonym with a typo: length 6 distance 1 gives almost when synonyms ON', () => {
      // synonym "witness" (len 7), user types "witnes" (dist 1)
      const res = checkAnswer('witnes', synonymCard, 'VI_TO_EN', { acceptSynonyms: true });
      expect(res.result).toBe('almost');
      expect(res.note).toBe('Gần đúng! Hãy kiểm tra chính tả.');
    });

    it('37. synonym with a typo: rejected if synonyms OFF', () => {
      const res = checkAnswer('witnes', synonymCard, 'VI_TO_EN', { acceptSynonyms: false });
      expect(res.result).toBe('wrong');
    });

    it('38. same-meaning card in deck is accepted via same-meaning', () => {
      // parensCardEn has definition 'nhìn, xem qua', id 99 has term 'glance' with exact same definition
      const res = checkAnswer('glance', parensCardEn, 'VI_TO_EN', {}, deckCards);
      expect(res.result).toBe('accepted');
      expect(res.via).toBe('same-meaning');
      expect(res.note).toContain('take (a) look');
    });

    it('39. typo tolerance by length: len <= 3 allows NO typo (distance 1 is wrong)', () => {
      // "cat" (len 3) typed as "cot" (dist 1) -> wrong
      const res = checkAnswer('cot', typoShortCard, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
    });

    it('40. typo tolerance by length: len 4-8 allows distance 1 as almost', () => {
      // "friend" (len 6) typed as "frieng" (dist 1) -> almost
      const res = checkAnswer('frieng', typoMidCard, 'VI_TO_EN');
      expect(res.result).toBe('almost');
      expect(res.note).toBe('Gần đúng! Hãy kiểm tra chính tả.');
    });

    it('41. typo tolerance by length: len 4-8 rejects distance 2 as wrong', () => {
      // "friend" typed as "frxxd" (dist 2) -> wrong
      const res = checkAnswer('frxxd', typoMidCard, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
    });

    it('42. typo tolerance by length: len >= 9 allows distance 1 and distance 2 as almost', () => {
      // "extraordinary" (len 13)
      const res1 = checkAnswer('extraordinery', typoLongCard, 'VI_TO_EN'); // dist 1
      expect(res1.result).toBe('almost');

      const res2 = checkAnswer('axtraordinery', typoLongCard, 'VI_TO_EN'); // dist 2
      expect(res2.result).toBe('almost');
    });

    it('43. typo tolerance by length: len >= 9 rejects distance 3 as wrong', () => {
      // 3 typos in "extraordinary"
      const res = checkAnswer('axtraordznxry', typoLongCard, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
    });

    it('44. NFC vs NFD input in English terms matches correctly', () => {
      const card = { id: 13, term: 'café', definition: 'quán cà phê' };
      const nfd = 'cafe\u0301';
      const res = checkAnswer(nfd, card, 'VI_TO_EN');
      expect(res.result).toBe('correct');
      expect(res.via).toBe('exact');
    });

    it('45. completely unrelated answer is wrong', () => {
      const res = checkAnswer('spaceship', surpriseCard, 'VI_TO_EN');
      expect(res.result).toBe('wrong');
    });

    it('46. input only "sự" (core becomes empty) is always evaluated as wrong', () => {
      const res = checkAnswer('sự', surpriseCard, 'EN_TO_VI');
      expect(res.result).toBe('wrong');
      expect(res.via).toBeNull();
    });

    it('47. empty or whitespace-only input is never accepted', () => {
      const resEmpty = checkAnswer('', surpriseCard, 'EN_TO_VI');
      expect(resEmpty.result).toBe('wrong');

      const resSpaces = checkAnswer('     \t \n  ', surpriseCard, 'EN_TO_VI');
      expect(resSpaces.result).toBe('wrong');
    });

    it('48. a sense that reduces to nothing after removing function words is not matchable', () => {
      const cardWithEmptySenses = {
        id: 77,
        term: 'phenomenon',
        definition: 'sự, việc, hiện tượng',
      };

      // Entering "sự" or "việc" must NOT match even though they appear as raw senses
      const resSu = checkAnswer('sự', cardWithEmptySenses, 'EN_TO_VI');
      expect(resSu.result).toBe('wrong');

      const resViec = checkAnswer('việc', cardWithEmptySenses, 'EN_TO_VI');
      expect(resViec.result).toBe('wrong');

      // Entering the meaningful sense "hiện tượng" or "sự hiện tượng" is accepted
      const resHienTuong = checkAnswer('hiện tượng', cardWithEmptySenses, 'EN_TO_VI');
      expect(resHienTuong.result).toBe('correct');
      expect(resHienTuong.via).toBe('sense');
    });
  });
});
