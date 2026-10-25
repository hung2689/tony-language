import { AlertCircle, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';
import './Analytics.css';

export default function WeakWordsList({ weakWords = [], onPractice }) {
  return (
    <div className="analytics-section">
      <div className="analytics-section-header">
        <h3 className="analytics-section-title">
          <Flame size={18} style={{ color: '#ef4444' }} />
          <span>Top từ hay trả lời sai nhất ({weakWords.length})</span>
        </h3>

        {weakWords.length > 0 && (
          <button
            type="button"
            className="btn-practice-weak"
            onClick={onPractice}
          >
            <span>Ôn tập ngay các từ này</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      {weakWords.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280' }}>
          <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
            Không có từ yếu cần củng cố!
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Bạn đang trả lời rất tốt trong các phiên học gần đây.
          </div>
        </div>
      ) : (
        <table className="weak-words-table">
          <thead>
            <tr>
              <th>Thuật ngữ</th>
              <th>Định nghĩa</th>
              <th>Số lần sai</th>
              <th>Tỷ lệ chính xác</th>
            </tr>
          </thead>
          <tbody>
            {weakWords.map((item) => (
              <tr key={item.vocabularyId}>
                <td style={{ fontWeight: 600, color: '#111827' }}>{item.word}</td>
                <td style={{ color: '#4b5563' }}>{item.meaning}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#dc2626',
                      fontWeight: 600,
                      backgroundColor: '#fef2f2',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <AlertCircle size={12} />
                    <span>{item.wrongCount} lần</span>
                  </span>
                </td>
                <td style={{ width: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 9999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.accuracy}%`,
                          backgroundColor: item.accuracy >= 70 ? '#10b981' : item.accuracy >= 40 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '38px', textAlign: 'right' }}>
                      {item.accuracy}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
