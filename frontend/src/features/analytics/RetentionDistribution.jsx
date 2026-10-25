import { Brain, Check, Clock, BookOpen } from 'lucide-react';
import './Analytics.css';

export default function RetentionDistribution({ data }) {
  const total = data?.totalCards || 0;
  const unseen = data?.unseenCount || 0;
  const learning = data?.learningCount || 0;
  const reviewing = data?.reviewingCount || 0;
  const mastered = data?.masteredCount || 0;

  const pct = (val) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return (
    <div className="analytics-section retention-section-card">
      <div className="analytics-section-header">
        <h3 className="analytics-section-title">
          <Brain size={18} style={{ color: '#6366f1' }} />
          <span>Phân bổ mức độ ghi nhớ (SM-2 Retention)</span>
        </h3>
        <span className="retention-header-total">
          Tổng số: <strong>{total} từ vựng</strong> trong thư viện
        </span>
      </div>

      {/* 2-Row Cards Layout: 3 cards in Row 1, 1 wide card in Row 2 */}
      <div className="retention-cards-layout">
        {/* Row 1: 3 cards */}
        <div className="retention-card retention-card-mastered">
          <span className="retention-card-tag tag-mastered">
            <Check size={11} strokeWidth={3} />
            <span>Đã thành thạo</span>
          </span>
          <div className="retention-card-count">
            {mastered} <span className="retention-card-pct">({pct(mastered)}%)</span>
          </div>
          <p className="retention-card-desc">
            Khoảng cách ôn &gt; 21 ngày. Đã ghi nhớ vào bộ nhớ dài hạn.
          </p>
        </div>

        <div className="retention-card retention-card-reviewing">
          <span className="retention-card-tag tag-reviewing">
            <Clock size={11} strokeWidth={2.5} />
            <span>Đang củng cố</span>
          </span>
          <div className="retention-card-count">
            {reviewing} <span className="retention-card-pct">({pct(reviewing)}%)</span>
          </div>
          <p className="retention-card-desc">
            Khoảng cách ôn từ 7 - 21 ngày. Đang ổn định trí nhớ.
          </p>
        </div>

        <div className="retention-card retention-card-learning">
          <span className="retention-card-tag tag-learning">
            <BookOpen size={11} strokeWidth={2.5} />
            <span>Đang tiếp thu</span>
          </span>
          <div className="retention-card-count">
            {learning} <span className="retention-card-pct">({pct(learning)}%)</span>
          </div>
          <p className="retention-card-desc">
            Khoảng cách ôn &lt; 7 ngày. Cần lặp lại đều đặn để tránh quên.
          </p>
        </div>

        {/* Row 2: 1 wide card */}
        <div className="retention-card retention-card-wide retention-card-unseen">
          <div className="retention-wide-left">
            <span className="retention-card-tag tag-unseen">
              <span className="tag-unseen-dot" />
              <span>Chưa bắt đầu</span>
            </span>
            <div className="retention-card-count">
              {unseen} <span className="retention-card-pct">({pct(unseen)}%)</span>
            </div>
          </div>
          <div className="retention-wide-right">
            <p className="retention-card-desc">
              Từ mới chưa từng xuất hiện. Kỳ phiên học nào.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
