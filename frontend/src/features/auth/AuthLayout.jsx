import { BookOpen, Sparkles, FolderCheck, Brain } from 'lucide-react';
import './Auth.css';

export default function AuthLayout({
  children,
  badgeText = 'Nền tảng học từ vựng cá nhân',
  brandQuote = 'Phương pháp học thông minh giúp bạn ghi nhớ từ vựng lâu dài và tự tin giao tiếp.',
}) {
  return (
    <div className="auth-viewport">
      {/* Dynamic Background Effects */}
      <div className="auth-bg-ambient-layer" aria-hidden="true" />
      <div className="auth-bg-grid-overlay" aria-hidden="true" />

      {/* Main Dual-Section Container */}
      <div className="auth-shell">
        {/* Left Section: Brand Showcase (Desktop / Tablet) */}
        <section className="auth-brand-showcase">
          <div className="auth-brand-top">
            <div className="auth-brand-identity">
              <div className="auth-brand-icon-box">
                <BookOpen size={26} strokeWidth={2.2} />
              </div>
              <div className="auth-brand-meta">
                <span className="auth-brand-name">Language Learning</span>
                <span className="auth-brand-pill">
                  <Sparkles size={12} />
                  <span>{badgeText}</span>
                </span>
              </div>
            </div>

            <div className="auth-brand-hero">
              <h1 className="auth-hero-title">
                Chinh phục ngôn ngữ mới <br />
                <span className="auth-hero-highlight">từng bước vững chắc.</span>
              </h1>
              <p className="auth-hero-description">
                Hệ thống lưu trữ, tổ chức thư mục và luyện tập từ vựng bằng flashcard tối giản,
                giúp nâng cao hiệu suất ghi nhớ mà không bị phân tâm.
              </p>
            </div>
          </div>

          {/* Authentic Feature Highlights */}
          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon-wrapper">
                <FolderCheck size={18} />
              </div>
              <div className="auth-feature-text">
                <h3>Cấu trúc thư mục ngăn nắp</h3>
                <p>Phân loại bộ thẻ theo chủ đề, cấp độ hoặc ngôn ngữ mục tiêu dễ dàng.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon-wrapper">
                <Brain size={18} />
              </div>
              <div className="auth-feature-text">
                <h3>Lặp lại ngắt quãng khoa học</h3>
                <p>Ôn tập đúng thời điểm vàng của não bộ để biến từ vựng thành phản xạ tự nhiên.</p>
              </div>
            </div>
          </div>

          {/* Subtle Quote / Value Box */}
          <div className="auth-brand-footer-card">
            <p className="auth-quote-text">“{brandQuote}”</p>
            <div className="auth-quote-author">
              <span className="auth-author-bullet" />
              <span>Thiết kế tối giản cho trải nghiệm học tập đỉnh cao</span>
            </div>
          </div>
        </section>

        {/* Right Section: Floating Authentication Card */}
        <section className="auth-form-showcase">
          <div className="auth-floating-card">
            {/* Mobile-only compact brand bar */}
            <div className="auth-mobile-brand">
              <div className="auth-mobile-logo">
                <BookOpen size={20} />
              </div>
              <div>
                <span className="auth-mobile-title">Language Learning</span>
                <span className="auth-mobile-tagline">Học từ vựng – Mở rộng thế giới</span>
              </div>
            </div>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
