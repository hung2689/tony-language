import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LEXICON_ASSETS } from '../lexiconMapData';

const SIDEBAR_ITEMS = [
  {
    id: 'map',
    label: 'Bản đồ',
    icon: LEXICON_ASSETS.navIcons.map,
    path: '/',
  },
  {
    id: 'my_vocabulary',
    label: 'Từ vựng của tôi',
    icon: LEXICON_ASSETS.navIcons.vocabulary,
    path: '/library',
  },
  {
    id: 'learning_history',
    label: 'Lịch sử học tập',
    icon: LEXICON_ASSETS.navIcons.learningHistory,
    path: '/analytics',
  },
  {
    id: 'study_plan',
    label: 'Lộ trình ôn tập',
    icon: LEXICON_ASSETS.decor.mapScroll || LEXICON_ASSETS.navIcons.collections,
    path: '/study-plan',
  },
  {
    id: 'srs_review',
    label: 'Lặp lại ngắt quãng',
    icon: LEXICON_ASSETS.navIcons.recentlyStudied,
    path: '/study-plan/srs',
  },
];

export default function ExplorerSidebar({ activeNav, onSelectNav }) {
  const navigate = useNavigate();
  const location = useLocation();

  const getComputedActive = (item) => {
    if (activeNav) {
      return activeNav === item.id;
    }
    if (item.id === 'map') {
      return location.pathname === '/' || location.pathname === '/map';
    }
    if (item.id === 'my_vocabulary') {
      return location.pathname === '/library' || location.pathname === '/decks';
    }
    if (item.id === 'learning_history') {
      return location.pathname.startsWith('/analytics');
    }
    if (item.id === 'srs_review') {
      return (
        location.pathname.startsWith('/study-plan/srs') ||
        location.pathname.includes('/srs')
      );
    }
    if (item.id === 'study_plan') {
      return (
        location.pathname.startsWith('/study-plan') &&
        !location.pathname.includes('/srs')
      );
    }
    return false;
  };

  const handleItemClick = (item) => {
    if (onSelectNav) {
      onSelectNav(item.id, item.path);
    } else {
      navigate(item.path);
    }
  };

  return (
    <aside
      className="lexicon-explorer-sidebar"
      aria-label="Thanh điều hướng sổ tay phiêu lưu"
    >
      {/* Subtle Left Journal Binding Spine */}
      <div className="lexicon-notebook-spiral" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, idx) => (
          <span key={idx} className="lexicon-spiral-ring" />
        ))}
      </div>

      <div className="lexicon-sidebar-inner">
        <nav className="lexicon-sidebar-nav" aria-label="Menu chính">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = getComputedActive(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`lexicon-sidebar-link ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleItemClick(item)}
              >
                <span className="lexicon-sidebar-icon-wrap" aria-hidden="true">
                  <img
                    src={item.icon}
                    alt=""
                    className="lexicon-sidebar-icon"
                    loading="eager"
                  />
                </span>
                <span className="lexicon-sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Handwritten Note Positioned Naturally Below Navigation */}
        <div className="lexicon-sidebar-note-box" aria-hidden="true">
          <img
            src={LEXICON_ASSETS.textures.noteBetterWords}
            alt="Vốn từ phong phú, mở rộng chân trời."
            title="Vốn từ phong phú, mở rộng chân trời."
            className="lexicon-sidebar-note-img"
          />
        </div>

        {/* Quiet Decorative Mountain & Botanical Footer at Bottom */}
        <div className="lexicon-sidebar-footer" aria-hidden="true">
          <div className="lexicon-sidebar-footer-art">
            <img
              src={LEXICON_ASSETS.decor.mountainRange}
              alt=""
              className="lexicon-sidebar-mountain-img"
            />
            <div className="lexicon-sidebar-trees-row">
              <img
                src={LEXICON_ASSETS.decor.evergreenTrees}
                alt=""
                className="lexicon-sidebar-trees-img"
              />
              <img
                src={LEXICON_ASSETS.decor.leafSprig}
                alt=""
                className="lexicon-sidebar-sprig-img"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
