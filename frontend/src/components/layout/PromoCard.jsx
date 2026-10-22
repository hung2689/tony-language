import { Rocket } from 'lucide-react';

export default function PromoCard() {
  return (
    <div className="promo-card">
      <div className="promo-icon-box">
        <Rocket size={18} className="promo-icon" />
      </div>
      <h4 className="promo-title">Học mỗi ngày là tiến bộ mỗi ngày!</h4>
      <p className="promo-subtext">Cùng bạn chinh phục mọi mục tiêu ngôn ngữ.</p>
      
      <div className="promo-illustration-wrapper">
        <svg
          viewBox="0 0 200 65"
          className="promo-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Sun */}
          <circle cx="145" cy="22" r="10" fill="#e5e7eb" />
          {/* Back Mountain */}
          <path d="M85 62L135 18L185 62H85Z" fill="#e5e7eb" />
          {/* Front Mountain */}
          <path d="M25 62L75 28L120 62H25Z" fill="#d1d5db" />
          {/* Ground line */}
          <path d="M10 63H190" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
