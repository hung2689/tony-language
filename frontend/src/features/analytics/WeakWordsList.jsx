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
        <div className="weak-words-empty-state">
          <CheckCircle2 size={36} className="weak-words-empty-icon" />
          <div className="weak-words-empty-title">
            Không có từ yếu cần củng cố!
          </div>
          <div className="weak-words-empty-desc">
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
                <td className="weak-word-term">{item.word}</td>
                <td className="weak-word-meaning">{item.meaning}</td>
                <td>
                  <span className="weak-word-miss-pill">
                    <AlertCircle size={12} />
                    <span>{item.wrongCount} lần</span>
                  </span>
                </td>
                <td style={{ width: '180px' }}>
                  <div className="weak-accuracy-wrap">
                    <div className="weak-accuracy-track">
                      <div
                        className="weak-accuracy-fill"
                        style={{
                          width: `${item.accuracy}%`,
                          backgroundColor: item.accuracy >= 70 ? '#46583A' : item.accuracy >= 40 ? '#C49856' : '#992B2B',
                        }}
                      />
                    </div>
                    <span className="weak-accuracy-num">
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
