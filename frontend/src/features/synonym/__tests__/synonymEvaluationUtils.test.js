import { describe, it, expect } from 'vitest';
import {
  isAnswerValid,
  isAnswerContextual,
  calculateEvaluationCounts,
} from '../synonymEvaluationUtils';

describe('Synonym Evaluation Utils Unit Tests', () => {
  it('correctly identifies EXACT_SYNONYM as valid and not contextual', () => {
    const item = {
      word: 'product',
      status: 'EXACT_SYNONYM',
      isValid: true,
      valid: true,
    };
    expect(isAnswerValid(item)).toBe(true);
    expect(isAnswerContextual(item)).toBe(false);
  });

  it('correctly identifies CONTEXTUAL_SYNONYM as valid AND contextual', () => {
    const item = {
      word: 'object',
      status: 'CONTEXTUAL_SYNONYM',
      isValid: true,
      valid: true,
    };
    expect(isAnswerValid(item)).toBe(true);
    expect(isAnswerContextual(item)).toBe(true);
  });

  it('correctly identifies NOT_SYNONYM as invalid and not contextual', () => {
    const item = {
      word: 'employee',
      status: 'NOT_SYNONYM',
      isValid: false,
      valid: false,
    };
    expect(isAnswerValid(item)).toBe(false);
    expect(isAnswerContextual(item)).toBe(false);
  });

  it('handles Jackson boolean key differences gracefully', () => {
    // Only "valid" key from Jackson default bean serializer
    const itemOnlyValid = { word: 'client', valid: true };
    expect(isAnswerValid(itemOnlyValid)).toBe(true);

    // Only "isValid" key
    const itemOnlyIsValid = { word: 'client', isValid: true };
    expect(isAnswerValid(itemOnlyIsValid)).toBe(true);

    // Falsy values
    const itemInvalid = { word: 'employee', valid: false, isValid: false };
    expect(isAnswerValid(itemInvalid)).toBe(false);
  });

  it('unifies counts accurately across all 8 Task 4 test cases', () => {
    const evaluatedWords = [
      { word: 'Product', status: 'EXACT_SYNONYM' },
      { word: 'Object', status: 'CONTEXTUAL_SYNONYM' },
      { word: 'Client', status: 'EXACT_SYNONYM' },
      { word: 'Consumer', status: 'CONTEXTUAL_SYNONYM' },
      { word: 'Significant', status: 'EXACT_SYNONYM' },
      { word: 'Crucial', status: 'EXACT_SYNONYM' },
      { word: 'Employee', status: 'NOT_SYNONYM' },
      { word: 'Employee', status: 'NOT_SYNONYM' },
    ];

    const counts = calculateEvaluationCounts(evaluatedWords);
    expect(counts.total).toBe(8);
    expect(counts.valid).toBe(6); // 4 EXACT + 2 CONTEXTUAL
    expect(counts.invalid).toBe(2); // 2 NOT_SYNONYM
  });
});
