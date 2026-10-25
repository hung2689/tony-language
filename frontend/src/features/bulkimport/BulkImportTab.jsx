import { useState, useId, useEffect } from 'react';
import {
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Info,
  Plus,
} from 'lucide-react';
import {
  parseBulkText,
  SAMPLE_BULK_LINES,
} from './parseBulkText';
import Button from '../../components/common/Button';

export default function BulkImportTab({
  existingCards = [],
  onImportCards,
  onToast,
}) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [parsedResult, setParsedResult] = useState(() =>
    parseBulkText('', { existingTerms: existingCards })
  );

  // Debounced parsing when input text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const existingTerms = existingCards.map((c) => c.term);
      const res = parseBulkText(inputText, { existingTerms });
      setParsedResult(res);
    }, 250);

    return () => clearTimeout(timer);
  }, [inputText, existingCards]);

  const handleCopySample = () => {
    navigator.clipboard?.writeText(SAMPLE_BULK_LINES).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onToast?.('Đã sao chép 6 dòng mẫu vào clipboard', 'info');
      },
      () => {
        // Fallback: insert directly into textarea
        setInputText(SAMPLE_BULK_LINES);
        onToast?.('Đã nạp 6 dòng mẫu vào khung nhập', 'info');
      }
    );
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_BULK_LINES);
    onToast?.('Đã nạp 6 dòng mẫu vào khung nhập', 'info');
  };

  const handleClearAll = () => {
    setInputText('');
    setParsedResult(parseBulkText('', { existingTerms: existingCards }));
  };

  // Inline editing in preview table
  const handleCellEdit = (rowIndex, fieldKey, newValue) => {
    setParsedResult((prev) => {
      if (!prev || !prev.rows[rowIndex]) return prev;

      const nextRows = [...prev.rows];
      const targetRow = { ...nextRows[rowIndex] };
      const nextFields = { ...targetRow.fields, [fieldKey]: newValue };

      // If editing rawSynonyms, re-parse synonyms array
      if (fieldKey === 'rawSynonyms') {
        nextFields.synonyms = newValue
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // Re-validate this row
      const errors = [];
      const warnings = [];

      if (!nextFields.term?.trim()) {
        errors.push(`Dòng ${targetRow.lineNumber}: Thuật ngữ không được để trống.`);
      }
      if (!nextFields.definition?.trim()) {
        errors.push(`Dòng ${targetRow.lineNumber}: Định nghĩa không được để trống.`);
      }

      let status = 'valid';
      if (errors.length > 0) {
        status = 'error';
      } else if (warnings.length > 0 || targetRow.warnings.length > 0) {
        status = 'warning';
      }

      targetRow.fields = nextFields;
      targetRow.errors = errors;
      targetRow.status = status;
      nextRows[rowIndex] = targetRow;

      // Recalculate summary and duplication across all rows
      const seen = new Map();
      const existingTermSet = new Set(
        existingCards.map((c) => (c.term || '').trim().toLowerCase()).filter(Boolean)
      );

      let valid = 0;
      let dups = 0;
      let warn = 0;
      let err = 0;

      const recheckedRows = nextRows.map((r, i) => {
        const term = (r.fields.term || '').trim();
        const termLower = term.toLowerCase();

        let duplicateReason = null;
        if (term) {
          if (seen.has(termLower)) {
            duplicateReason = `Dòng ${r.lineNumber}: Thuật ngữ '${term}' bị trùng lặp với dòng ${seen.get(termLower)}.`;
          } else {
            seen.set(termLower, r.lineNumber || (i + 1));
          }

          if (!duplicateReason && existingTermSet.has(termLower)) {
            duplicateReason = `Dòng ${r.lineNumber}: Thuật ngữ '${term}' đã tồn tại trong bộ từ vựng này.`;
          }
        }

        let st = 'valid';
        if (r.errors?.length > 0) {
          st = 'error';
          err++;
        } else if (duplicateReason) {
          st = 'duplicate';
          dups++;
        } else if (r.warnings?.length > 0) {
          st = 'warning';
          warn++;
        } else {
          st = 'valid';
          valid++;
        }

        return {
          ...r,
          status: st,
          duplicateReason,
        };
      });

      return {
        ...prev,
        rows: recheckedRows,
        summary: {
          total: recheckedRows.length,
          valid,
          duplicates: dups,
          warnings: warn,
          errors: err,
        },
      };
    });
  };

  // Delete row from preview table
  const handleDeleteRow = (rowIndex) => {
    setParsedResult((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.filter((_, idx) => idx !== rowIndex);

      const seen = new Map();
      const existingTermSet = new Set(
        existingCards.map((c) => (c.term || '').trim().toLowerCase()).filter(Boolean)
      );

      let valid = 0;
      let dups = 0;
      let warn = 0;
      let err = 0;

      const recheckedRows = nextRows.map((r, i) => {
        const term = (r.fields.term || '').trim();
        const termLower = term.toLowerCase();

        let duplicateReason = null;
        if (term) {
          if (seen.has(termLower)) {
            duplicateReason = `Dòng ${r.lineNumber}: Thuật ngữ '${term}' bị trùng lặp với dòng ${seen.get(termLower)}.`;
          } else {
            seen.set(termLower, r.lineNumber || (i + 1));
          }

          if (!duplicateReason && existingTermSet.has(termLower)) {
            duplicateReason = `Dòng ${r.lineNumber}: Thuật ngữ '${term}' đã tồn tại trong bộ từ vựng này.`;
          }
        }

        let st = 'valid';
        if (r.errors?.length > 0) {
          st = 'error';
          err++;
        } else if (duplicateReason) {
          st = 'duplicate';
          dups++;
        } else if (r.warnings?.length > 0) {
          st = 'warning';
          warn++;
        } else {
          st = 'valid';
          valid++;
        }

        return {
          ...r,
          status: st,
          duplicateReason,
        };
      });

      return {
        ...prev,
        rows: recheckedRows,
        summary: {
          total: recheckedRows.length,
          valid,
          duplicates: dups,
          warnings: warn,
          errors: err,
        },
      };
    });
  };

  // Import valid cards into the deck form without saving to backend
  // Duplicate rows must NOT be imported until edited
  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    // Filter out rows with errors or duplicates
    const importableRows = parsedResult.rows.filter(
      (r) => r.status === 'valid' || r.status === 'warning'
    );
    if (importableRows.length === 0) {
      alert('Không có thẻ hợp lệ nào để thêm. Vui lòng sửa các dòng bị lỗi hoặc trùng lặp trước.');
      return;
    }

    const cardsToImport = importableRows.map((r) => ({
      id: null,
      term: r.fields.term.trim(),
      definition: r.fields.definition.trim(),
      pronunciation: r.fields.pronunciation ? r.fields.pronunciation.trim() : '',
      partOfSpeech: r.fields.partOfSpeech ? r.fields.partOfSpeech.trim() : '',
      example: r.fields.example ? r.fields.example.trim() : '',
      synonymsText: Array.isArray(r.fields.synonyms)
        ? r.fields.synonyms.join('; ')
        : (r.fields.rawSynonyms || ''),
    }));

    onImportCards?.(cardsToImport);
    onToast?.(`Đã thêm ${cardsToImport.length} thẻ từ vào danh sách`, 'success');
  };

  const { rows, summary, delimiter, isExceededLimit, globalError } = parsedResult;
  const importableCardsCount = rows.filter((r) => r.status === 'valid' || r.status === 'warning').length;
  const formatNoticeId = useId();

  return (
    <div className="bulk-import-container">
      {/* 1. Header & Format Guide */}
      <div className="bulk-guide-card">
        <div className="bulk-guide-header">
          <div className="bulk-guide-title">
            <Info size={16} />
            <span>Định dạng chuẩn 6 trường (phân cách bởi dấu gạch đứng <code>|</code> hoặc <code>Tab</code>)</span>
          </div>
          <div className="bulk-guide-actions">
            <button
              type="button"
              className="bulk-sample-btn"
              onClick={handleLoadSample}
              title="Điền 6 dòng mẫu vào khung nhập"
            >
              <Download size={14} />
              <span>Nạp dữ liệu mẫu</span>
            </button>
            <button
              type="button"
              className="bulk-sample-btn"
              onClick={handleCopySample}
              title="Sao chép các dòng mẫu vào clipboard"
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép mẫu'}</span>
            </button>
          </div>
        </div>

        <div className="bulk-format-spec">
          <code>Thuật ngữ | Định nghĩa | Phát âm (IPA) | Loại từ | Ví dụ | Từ đồng nghĩa</code>
        </div>
        <p className="bulk-format-note">
          * Chỉ bắt buộc <strong>Thuật ngữ</strong> và <strong>Định nghĩa</strong>. Các trường tùy chọn có thể để trống nhưng cần giữ nguyên vị trí dấu <code>|</code> (ví dụ: <code>hello|xin chào|||Hello!|</code>). Từ đồng nghĩa cách nhau bằng dấu chấm phẩy <code>;</code>.
        </p>
      </div>

      {/* 2. Text Input Area */}
      <div className="bulk-input-section">
        <div className="bulk-input-header">
          <label htmlFor="bulk-import-textarea" className="bulk-input-label">Dán danh sách từ vựng vào đây</label>
          {inputText && (
            <button
              type="button"
              className="bulk-clear-btn"
              onClick={handleClearAll}
            >
              Xóa nội dung
            </button>
          )}
        </div>
        <textarea
          id="bulk-import-textarea"
          className="bulk-textarea"
          rows={6}
          aria-describedby={formatNoticeId}
          placeholder={`Dán các dòng từ vựng vào đây... Ví dụ:\nhello|xin chào|/həˈloʊ/|interjection|Hello, how are you?|hi; hey\nbeautiful|xinh đẹp|/ˈbjuːtɪfəl/|adjective|She is beautiful.|pretty; lovely; attractive`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <div id={formatNoticeId} className="bulk-delimiter-indicator">
          <span>Ký tự phân tách tự động nhận diện: <strong>{delimiter === '\t' ? 'Tab (Excel/Google Sheets)' : 'Dấu gạch đứng (|)'}</strong></span>
          <span>Tối đa: 500 thẻ / lần</span>
        </div>
      </div>

      {/* 3. Global Errors */}
      {isExceededLimit && globalError && (
        <div className="bulk-error-alert" role="alert">
          <AlertCircle size={18} />
          <span>{globalError}</span>
        </div>
      )}

      {/* 4. Parse Summary Counters */}
      {rows.length > 0 && !isExceededLimit && (
        <div className="bulk-summary-bar">
          <div className="bulk-summary-group">
            <span className="bulk-pill pill-total">Tổng dòng: {summary.total}</span>
            <span className="bulk-pill pill-valid">
              <CheckCircle2 size={13} /> {summary.valid} hợp lệ
            </span>
            {summary.duplicates > 0 && (
              <span className="bulk-pill pill-duplicate" style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}>
                <Copy size={13} /> {summary.duplicates} trùng lặp
              </span>
            )}
            {summary.warnings > 0 && (
              <span className="bulk-pill pill-warning">
                <AlertTriangle size={13} /> {summary.warnings} cảnh báo
              </span>
            )}
            {summary.errors > 0 && (
              <span className="bulk-pill pill-error">
                <AlertCircle size={13} /> {summary.errors} lỗi
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmImport}
            disabled={importableCardsCount === 0}
            icon={Plus}
          >
            Thêm {importableCardsCount} thẻ vào bộ từ
          </Button>
        </div>
      )}

      {/* 5. Live Preview & Inline Edit Table */}
      {rows.length > 0 && !isExceededLimit && (
        <div className="bulk-preview-wrapper">
          <div className="bulk-table-container">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th style={{ width: '105px' }}>Trạng thái</th>
                  <th style={{ width: '130px' }}>Thuật ngữ *</th>
                  <th style={{ width: '150px' }}>Định nghĩa *</th>
                  <th style={{ width: '100px' }}>Phát âm</th>
                  <th style={{ width: '95px' }}>Loại từ</th>
                  <th style={{ width: '160px' }}>Câu ví dụ</th>
                  <th style={{ width: '130px' }}>Từ đồng nghĩa</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isErr = row.status === 'error';
                  const isDup = row.status === 'duplicate';
                  const isWarn = row.status === 'warning';
                  const rowClass = isErr ? 'row-error' : isDup ? 'row-duplicate' : isWarn ? 'row-warning' : 'row-valid';

                  return (
                    <tr key={row.id || idx} className={rowClass}>
                      <td className="cell-linenumber">{row.lineNumber}</td>
                      <td className="cell-status">
                        {isErr && (
                          <span className="status-badge badge-error" title={row.errors.join('\n')}>
                            <AlertCircle size={12} style={{ marginRight: '3px' }} />
                            Lỗi
                          </span>
                        )}
                        {isDup && (
                          <span className="status-badge badge-duplicate" title={row.duplicateReason || 'Thuật ngữ bị trùng lặp'}>
                            <Copy size={12} style={{ marginRight: '3px' }} />
                            Trùng lặp
                          </span>
                        )}
                        {isWarn && (
                          <span className="status-badge badge-warning" title={row.warnings.join('\n')}>
                            <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                            Cảnh báo
                          </span>
                        )}
                        {!isErr && !isDup && !isWarn && (
                          <span className="status-badge badge-valid">
                            <Check size={12} style={{ marginRight: '3px' }} />
                            Chuẩn
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input"
                          value={row.fields.term}
                          onChange={(e) => handleCellEdit(idx, 'term', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input"
                          value={row.fields.definition}
                          onChange={(e) => handleCellEdit(idx, 'definition', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input text-ipa"
                          value={row.fields.pronunciation}
                          onChange={(e) => handleCellEdit(idx, 'pronunciation', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input"
                          value={row.fields.partOfSpeech}
                          onChange={(e) => handleCellEdit(idx, 'partOfSpeech', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input"
                          value={row.fields.example}
                          onChange={(e) => handleCellEdit(idx, 'example', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-inline-input"
                          placeholder="từ 1; từ 2"
                          value={row.fields.rawSynonyms}
                          onChange={(e) => handleCellEdit(idx, 'rawSynonyms', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-delete-btn"
                          onClick={() => handleDeleteRow(idx)}
                          title="Xóa dòng này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show issues list below table if any */}
          {(summary.errors > 0 || summary.warnings > 0) && (
            <div className="bulk-issues-summary">
              {rows
                .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
                .map((r) => (
                  <div key={`issue-${r.lineNumber}`} className="bulk-issue-item">
                    {r.errors.map((err, eIdx) => (
                      <div key={`err-${eIdx}`} className="issue-msg error-msg">
                        <AlertCircle size={13} />
                        <span>{err}</span>
                      </div>
                    ))}
                    {r.warnings.map((warn, wIdx) => (
                      <div key={`warn-${wIdx}`} className="issue-msg warning-msg">
                        <AlertTriangle size={13} />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
