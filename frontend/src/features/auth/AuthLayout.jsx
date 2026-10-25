import { BookOpen, FolderCheck, Brain, Sparkles } from 'lucide-react';
import './Auth.css';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-viewport">
      {/* Dynamic Background Effects */}
      <div className="auth-bg-ambient-layer" aria-hidden="true" />
      <div className="auth-bg-grid-overlay" aria-hidden="true" />

      {/* Main Container */}
      <div className="auth-shell">
        {/* Left Section: Brand Showcase & Glass Cards */}
        <section className="auth-brand-showcase">
          <div className="auth-brand-top">
            <div className="auth-brand-identity">
              <div className="auth-brand-icon-box">
                <BookOpen size={24} strokeWidth={2.2} />
              </div>
              <span className="auth-brand-name">Language Learning</span>
            </div>

            <div className="auth-brand-hero">
              <h1 className="auth-hero-title">
                Học từ vựng <br />
                <span className="auth-hero-highlight">thông minh & hiệu quả.</span>
              </h1>
            </div>
          </div>

          {/* Glass Feature Cards */}
          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon-wrapper">
                <FolderCheck size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Cấu trúc thư mục ngăn nắp</h3>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon-wrapper">
                <Brain size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Lặp lại ngắt quãng khoa học</h3>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon-wrapper">
                <Sparkles size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Phản xạ từ vựng tự nhiên</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section: Form Card */}
        <section className="auth-form-showcase">
          <div className="auth-floating-card">
            {/* Mobile-only compact brand bar */}
            <div className="auth-mobile-brand">
              <div className="auth-mobile-logo">
                <BookOpen size={20} />
              </div>
              <span className="auth-mobile-title">Language Learning</span>
            </div>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
