/**
 * Utility functions for Synonym Challenge evaluation mapping.
 * Unifies evaluation status checks across counters, UI icons, badges, and strikethroughs.
 */

export const isAnswerValid = (item) => {
  if (!item) return false;
  if (item.status === 'EXACT_SYNONYM' || item.status === 'CONTEXTUAL_SYNONYM') {
    return true;
  }
  if (item.status === 'NOT_SYNONYM') {
    return false;
  }
  return item.isValid === true || item.valid === true;
};

export const isAnswerContextual = (item) => {
  return item?.status === 'CONTEXTUAL_SYNONYM';
};

export const calculateEvaluationCounts = (evaluatedWords = []) => {
  const total = evaluatedWords.length;
  const valid = evaluatedWords.filter(isAnswerValid).length;
  const invalid = total - valid;
  return { total, valid, invalid };
};
