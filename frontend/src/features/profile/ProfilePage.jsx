import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  User,
  Shield,
  Award,
  Camera,
  Mail,
  Calendar,
  Settings,
  Check,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { profileService } from './profileService';
import { useAuth } from '../auth/AuthContext';
import ExplorerSidebar from '../library/components/ExplorerSidebar';
import WantedPoster from './components/WantedPoster';
import AvatarUploader from './components/AvatarUploader';
import ChangePasswordForm from './components/ChangePasswordForm';
import TierList from './components/TierList';
import RankBadge from '../../components/common/RankBadge';
import { getRankFromLevel } from '../../utils/ranks';
import Toast from '../../components/common/Toast';
import '../library/RpgLibraryWorkspace.css';
import './Profile.css';

const TABS = [
  { id: 'settings', path: '/profile/settings', label: 'Thông tin', icon: User },
  { id: 'security', path: '/profile/security', label: 'Bảo mật', icon: Shield },
  { id: 'levels', path: '/profile/levels', label: 'Cấp bậc', icon: Award },
];

const DEFAULT_AVATAR = '/assets/profile/wanted-default-avatar.png';
const DEFAULT_BIO = 'Small steps every day, big dreams one day.';

function validateDisplayName(name) {
  const trimmed = (name || '').trim().normalize('NFC');
  if (!trimmed) {
    return 'Họ và tên không được để trống.';
  }
  if (trimmed.length > 50) {
    return 'Họ và tên tối đa 50 ký tự.';
  }
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code < 32 || (code >= 127 && code <= 159)) {
      return 'Họ và tên không được chứa ký tự điều khiển.';
    }
  }
  return null;
}

function formatStudyDurationVi(stats) {
  if (!stats) return '0h 00p';
  const totalMinutes =
    stats.studyTimeMinutes !== undefined && stats.studyTimeMinutes !== null
      ? Number(stats.studyTimeMinutes)
      : stats.totalStudyTimeSeconds
      ? Math.floor(Number(stats.totalStudyTimeSeconds) / 60)
      : 0;
  if (!totalMinutes || totalMinutes <= 0) return '0h 00p';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}p`;
  }
  return `0h ${String(mins).padStart(2, '0')}p`;
}

function formatJoinDateSlash(isoDate) {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

export function computeExplorerBounty(profileData, customBounty) {
  if (customBounty !== undefined && customBounty !== null && customBounty !== '') {
    const parsed = Number(customBounty);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  if (profileData?.bounty !== undefined && profileData?.bounty !== null) {
    const apiBounty = Number(profileData.bounty);
    if (!Number.isNaN(apiBounty) && apiBounty >= 0) {
      return apiBounty;
    }
  }
  const lvl = Number(
    profileData?.levelInfo?.level ?? profileData?.level ?? 1
  );
  const currentXp = Number(
    profileData?.levelInfo?.currentXp ??
      profileData?.totalXp ??
      profileData?.currentXp ??
      profileData?.levelInfo?.xpIntoLevel ??
      profileData?.xpIntoLevel ??
      0
  );
  const words = Number(
    profileData?.stats?.wordsStudied ?? profileData?.wordsStudied ?? 0
  );
  const answers = Number(
    profileData?.stats?.totalAnswers ?? profileData?.totalAnswers ?? 0
  );
  return (
    lvl * 100_000_000 +
    currentXp * 1_000_000 +
    words * 5_000_000 +
    answers * 500_000
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { user, updateUser, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // User-configurable client preferences (bio & custom bounty if not provided by backend)
  const userStorageKey = profile?.id || profile?.email || user?.email || 'default';
  const [customBio, setCustomBio] = useState('');
  const [customBounty, setCustomBounty] = useState('');

  // Inline profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [editBioVal, setEditBioVal] = useState('');
  const [editBountyVal, setEditBountyVal] = useState('');
  const [editNameError, setEditNameError] = useState(null);
  const [isSavingName, setIsSavingName] = useState(false);

  // Headless AvatarUploader trigger refs
  const avatarTriggerRef = useRef(null);
  const avatarDeleteRef = useRef(null);

  // Activate full-bleed journal shell on body (matching Map dashboard)
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
    };
  }, []);

  useEffect(() => {
    try {
      const savedBio = localStorage.getItem(`lexicon_profile_bio_${userStorageKey}`);
      const savedBounty = localStorage.getItem(`lexicon_profile_bounty_${userStorageKey}`);
      setCustomBio(savedBio || '');
      setCustomBounty(savedBounty !== null ? savedBounty : '');
    } catch {
      // ignore storage errors
    }
  }, [userStorageKey]);

  const getActiveTabFromPath = (pathname) => {
    if (pathname.includes('/security')) return 'security';
    if (pathname.includes('/levels')) return 'levels';
    return 'settings';
  };

  const activeTab = getActiveTabFromPath(location.pathname);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, tiersRes] = await Promise.all([
        profileService.getProfile(),
        profileService.getTiers().catch(() => []),
      ]);
      setProfile(profileRes);
      setTiers(tiersRes || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin hồ sơ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabClick = (tab) => {
    navigate(tab.path);
  };

  const handleSidebarNav = (navId) => {
    if (navId === 'learning_history') {
      navigate('/analytics');
    } else if (navId === 'achievements') {
      navigate('/profile/levels');
    } else if (navId === 'settings') {
      navigate('/profile/settings');
    } else {
      navigate('/');
    }
  };

  const handleAvatarUpdated = (newAvatarUrl) => {
    setProfile((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : prev));
  };

  const handleNameUpdated = (newDisplayName) => {
    setProfile((prev) => (prev ? { ...prev, displayName: newDisplayName } : prev));
  };

  // Derived user & stats values from real profile data
  const rawDisplayName = profile?.displayName || user?.displayName || user?.username || 'Học viên';
  const email = profile?.email || user?.email || '—';
  const usernameHandle =
    profile?.username ||
    user?.username ||
    (email !== '—' ? email.split('@')[0] : rawDisplayName.toLowerCase().replace(/\s+/g, ''));
  const avatarSrc = profile?.avatarUrl || user?.avatarUrl || DEFAULT_AVATAR;
  const bioText = profile?.bio || customBio || DEFAULT_BIO;
  const bountyValue = computeExplorerBounty(profile, customBounty);

  const levelInfo = profile?.levelInfo || profile || {};
  const level = levelInfo.level ?? profile?.level ?? user?.level ?? 1;
  const userRank = getRankFromLevel(level);
  const xpIntoLevel = levelInfo.xpIntoLevel ?? profile?.xpIntoLevel ?? 0;
  const xpNeededForNext =
    levelInfo.xpNeededForNextLevel ??
    levelInfo.xpNeededForNext ??
    levelInfo.xpForNext ??
    levelInfo.xpForNextLevel ??
    profile?.xpForNext ??
    profile?.xpNeededForNextLevel ??
    80;
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      levelInfo.progressPercent ??
        profile?.progressPercent ??
        (xpNeededForNext > 0 ? Math.round((xpIntoLevel / xpNeededForNext) * 100) : 0)
    )
  );

  const stats = profile?.stats || profile || {};
  const wordsStudied = stats.wordsStudied ?? 0;
  const accuracyPercent =
    stats.accuracyPercent !== undefined && stats.accuracyPercent !== null
      ? Number(stats.accuracyPercent).toFixed(1)
      : '0.0';
  const totalAnswers = stats.totalAnswers ?? 0;
  const studyTimeText = formatStudyDurationVi(stats);
  const totalDecksDisplay =
    stats.deckCount !== undefined && stats.deckCount !== null
      ? stats.deckCount
      : stats.totalDecks !== undefined && stats.totalDecks !== null
      ? stats.totalDecks
      : outletContext.overview?.totalDecks ?? 0;

  const joinedDateText = formatJoinDateSlash(
    profile?.createdAt || profile?.joinedAt || user?.createdAt || user?.joinedAt
  );

  const handleStartEditName = () => {
    setEditNameVal(rawDisplayName);
    setEditBioVal(bioText);
    setEditBountyVal(String(bountyValue));
    setEditNameError(null);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditNameError(null);
  };

  const handleSaveName = async (e) => {
    if (e) e.preventDefault();
    const err = validateDisplayName(editNameVal);
    if (err) {
      setEditNameError(err);
      return;
    }

    const normalized = editNameVal.trim().normalize('NFC');
    const trimmedBio = (editBioVal || '').trim() || DEFAULT_BIO;
    const cleanedBounty = String(editBountyVal || '').replace(/[^0-9]/g, '');

    try {
      setIsSavingName(true);
      setEditNameError(null);

      // Save bio & custom bounty configuration locally so UI updates immediately
      try {
        localStorage.setItem(`lexicon_profile_bio_${userStorageKey}`, trimmedBio);
        setCustomBio(trimmedBio);
        if (cleanedBounty !== '') {
          localStorage.setItem(`lexicon_profile_bounty_${userStorageKey}`, cleanedBounty);
          setCustomBounty(cleanedBounty);
        } else {
          localStorage.removeItem(`lexicon_profile_bounty_${userStorageKey}`);
          setCustomBounty('');
        }
      } catch {
        // ignore storage errors
      }

      if (normalized !== (profile?.displayName || '')) {
        const res = await profileService.updateName(normalized);
        const updated = res.displayName || normalized;
        if (updateUser) updateUser({ displayName: updated });
        if (refreshUser) await refreshUser();
        handleNameUpdated(updated);
      }

      setIsEditingName(false);
      showToast('Đã cập nhật thông tin hồ sơ thành công');
    } catch (apiErr) {
      showToast(apiErr.message || 'Lỗi khi cập nhật thông tin hồ sơ', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="lexicon-journal-shell lexicon-profile-shell">
      {/* Region B: Left Explorer Journal Sidebar */}
      <ExplorerSidebar
        activeNav="map"
        onSelectNav={handleSidebarNav}
      />

      {/* Region C: Main Two-Column Profile Workspace */}
      <main className="lexicon-profile-main" aria-label="Hồ sơ nhà thám hiểm">
        {loading && !profile ? (
          <div className="lexicon-profile-loading">
            <Loader2 size={28} className="animate-spin" />
            <span>Đang mở nhật ký hồ sơ...</span>
          </div>
        ) : (
          <div className="lexicon-profile-two-col">
            {/* LEFT BLOCK: Classic Pirate WANTED Poster */}
            <WantedPoster
              avatarUrl={profile?.avatarUrl || user?.avatarUrl}
              displayName={rawDisplayName}
              bounty={bountyValue}
              onTriggerAvatarUpload={() => avatarTriggerRef.current?.()}
            />

            {/* RIGHT BLOCK: Profile Information & Learning Ledger */}
            <section
              className="lexicon-profile-ledger profile-paper"
              aria-label="Thông tin chi tiết và thống kê học tập"
            >
              <div className="lexicon-profile-ledger-inner">
                {/* 4.A User Identity Header + Ship Cartography Illustration */}
                <header className="lexicon-profile-identity-header">
                  <div className="lexicon-profile-identity-left">
                    <img
                      src="/assets/profile/profile-compass-stamp.png"
                      alt=""
                      className="lexicon-profile-compass-stamp"
                      aria-hidden="true"
                      draggable="false"
                    />
                    <div className="lexicon-profile-identity-text">
                      <h1 className="lexicon-profile-display-name">
                        {rawDisplayName}
                      </h1>
                      <p className="lexicon-profile-handle">@{usernameHandle}</p>
                      <p className="lexicon-profile-motto">“{bioText}”</p>
                    </div>
                  </div>

                  <div className="lexicon-profile-ship-art" aria-hidden="true">
                    <img
                      src="/assets/profile/profile-ship-illustration.png"
                      alt=""
                      className="lexicon-profile-ship-img"
                      draggable="false"
                    />
                  </div>
                </header>

                {/* 4.B Explorer Level Box */}
                <div className="lexicon-profile-level-box">
                  <div className="lexicon-profile-level-badge-wrap">
                    <RankBadge
                      level={level}
                      size="lg"
                      className="lexicon-profile-level-badge"
                    />
                  </div>
                  <div className="lexicon-profile-level-body">
                    <div className="lexicon-profile-level-top">
                      <div className="lexicon-profile-level-titles">
                        <span className="lexicon-profile-level-eyebrow">
                          Explorer Level • {userRank.name}
                        </span>
                        <strong className="lexicon-profile-level-rank">
                          Lv. {level} {userRank.name}
                        </strong>
                      </div>
                      <span className="lexicon-profile-level-xp">
                        {xpIntoLevel} / {xpNeededForNext} XP
                      </span>
                    </div>

                    <div
                      className="lexicon-profile-xp-track"
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Tiến độ cấp độ Explorer"
                    >
                      <div
                        className="lexicon-profile-xp-fill"
                        style={{ width: `${Math.max(6, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4.C Learning Stats Section */}
                <section
                  className="lexicon-profile-stats-section"
                  aria-label="Learning Stats"
                >
                  <div className="lexicon-profile-stats-heading-row">
                    <h2 className="lexicon-profile-stats-title">Learning Stats</h2>
                    <div className="lexicon-profile-ornamental-rule" aria-hidden="true">
                      <span className="rule-flourish-left">❧</span>
                      <span className="rule-line" />
                      <span className="rule-flourish-right">❧</span>
                    </div>
                  </div>

                  <div className="lexicon-profile-stats-row">
                    {/* 1. Words Studied */}
                    <div className="lexicon-profile-stat-item">
                      <svg
                        className="lexicon-stat-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                      <div className="lexicon-stat-copy">
                        <span className="lexicon-stat-num">{wordsStudied}</span>
                        <span className="lexicon-stat-label">TỪ ĐÃ HỌC</span>
                      </div>
                    </div>

                    {/* 2. Accuracy */}
                    <div className="lexicon-profile-stat-item">
                      <svg
                        className="lexicon-stat-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        <path d="M16 8l5-5" />
                        <path d="M18 3h3v3" />
                      </svg>
                      <div className="lexicon-stat-copy">
                        <span className="lexicon-stat-num">{accuracyPercent}%</span>
                        <span className="lexicon-stat-label">CHÍNH XÁC</span>
                      </div>
                    </div>

                    {/* 3. Total Answers */}
                    <div className="lexicon-profile-stat-item">
                      <svg
                        className="lexicon-stat-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <div className="lexicon-stat-copy">
                        <span className="lexicon-stat-num">{totalAnswers}</span>
                        <span className="lexicon-stat-label">CÂU TRẢ LỜI</span>
                      </div>
                    </div>

                    {/* 4. Study Time */}
                    <div className="lexicon-profile-stat-item">
                      <svg
                        className="lexicon-stat-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9.5" />
                        <polyline points="12 7 12 12 15.5 14" />
                      </svg>
                      <div className="lexicon-stat-copy">
                        <span className="lexicon-stat-num">{studyTimeText}</span>
                        <span className="lexicon-stat-label">THỜI GIAN HỌC</span>
                      </div>
                    </div>

                    {/* 5. Vocabulary Decks */}
                    <div className="lexicon-profile-stat-item">
                      <svg
                        className="lexicon-stat-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 12 12 17 22 12" />
                        <polyline points="2 17 12 22 22 17" />
                      </svg>
                      <div className="lexicon-stat-copy">
                        <span className="lexicon-stat-num">{totalDecksDisplay}</span>
                        <span className="lexicon-stat-label">BỘ TỪ VỰNG</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4.D Profile Tabs Bar */}
                <nav
                  className="lexicon-profile-tabs-bar"
                  aria-label="Điều hướng cài đặt hồ sơ"
                >
                  {TABS.map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <React.Fragment key={tab.id}>
                        {idx > 0 && (
                          <span
                            className="lexicon-profile-tab-divider"
                            aria-hidden="true"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleTabClick(tab)}
                          className={`lexicon-profile-tab-btn ${
                            isActive ? 'is-active' : ''
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon size={17} strokeWidth={2} />
                          <span>{tab.label}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </nav>

                {/* 4.E Tab Content Panel */}
                <div className="lexicon-profile-tab-panel">
                  {activeTab === 'settings' && (
                    <div className="lexicon-personal-info-panel">
                      <h3 className="lexicon-personal-info-heading">
                        Thông tin cá nhân
                      </h3>

                      <div className="lexicon-personal-info-body">
                        {/* Circular Botanical Wreath Avatar + Moss-Green Camera Button */}
                        <div className="lexicon-personal-avatar-wrap">
                          <div className="lexicon-personal-avatar-circle">
                            <img
                              src={avatarSrc}
                              alt={rawDisplayName}
                              className="lexicon-personal-avatar-img"
                              onError={(e) => {
                                if (
                                  e.currentTarget.src !==
                                  window.location.origin + DEFAULT_AVATAR
                                ) {
                                  e.currentTarget.src = DEFAULT_AVATAR;
                                }
                              }}
                            />
                          </div>
                          <img
                            src="/assets/profile/profile-avatar-wreath.png"
                            alt=""
                            className="lexicon-personal-avatar-wreath"
                            aria-hidden="true"
                            draggable="false"
                          />
                          <button
                            type="button"
                            className="lexicon-personal-camera-btn"
                            onClick={() => avatarTriggerRef.current?.()}
                            title="Đổi ảnh đại diện"
                            aria-label="Đổi ảnh đại diện"
                          >
                            <Camera size={16} strokeWidth={2.1} />
                          </button>
                        </div>

                        {/* Personal Information Rows */}
                        <div className="lexicon-personal-rows">
                          {/* Row 1: Display Name */}
                          <div className="lexicon-personal-row">
                            <span className="lexicon-personal-row-label">
                              <User size={16} strokeWidth={2} />
                              <span>Tên người dùng</span>
                            </span>
                            <div className="lexicon-personal-row-value">
                              {isEditingName ? (
                                <form
                                  className="lexicon-inline-name-form"
                                  onSubmit={handleSaveName}
                                >
                                  <input
                                    type="text"
                                    className={`lexicon-inline-name-input ${
                                      editNameError ? 'has-error' : ''
                                    }`}
                                    value={editNameVal}
                                    onChange={(e) => {
                                      setEditNameVal(e.target.value);
                                      if (editNameError) setEditNameError(null);
                                    }}
                                    maxLength={50}
                                    autoFocus
                                    aria-label="Tên người dùng"
                                  />
                                  <button
                                    type="submit"
                                    className="lexicon-inline-btn save"
                                    disabled={isSavingName}
                                    title="Lưu"
                                  >
                                    {isSavingName ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                    <span>Lưu</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="lexicon-inline-btn cancel"
                                    onClick={handleCancelEditName}
                                    disabled={isSavingName}
                                    title="Hủy"
                                  >
                                    <X size={14} />
                                  </button>
                                  {profile?.avatarUrl && (
                                    <button
                                      type="button"
                                      className="lexicon-inline-btn delete-avatar"
                                      onClick={() => avatarDeleteRef.current?.()}
                                      title="Xóa ảnh đại diện hiện tại"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  {editNameError && (
                                    <span className="lexicon-inline-error">
                                      {editNameError}
                                    </span>
                                  )}
                                </form>
                              ) : (
                                <strong>{rawDisplayName}</strong>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Email */}
                          <div className="lexicon-personal-row">
                            <span className="lexicon-personal-row-label">
                              <Mail size={16} strokeWidth={2} />
                              <span>Email</span>
                            </span>
                            <span className="lexicon-personal-row-value">
                              {email}
                            </span>
                          </div>

                          {/* Row 3: Join Date */}
                          <div className="lexicon-personal-row">
                            <span className="lexicon-personal-row-label">
                              <Calendar size={16} strokeWidth={2} />
                              <span>Gia nhập</span>
                            </span>
                            <span className="lexicon-personal-row-value">
                              {joinedDateText}
                            </span>
                          </div>

                          {/* Row 4: Bio / Motto */}
                          <div className="lexicon-personal-row">
                            <span className="lexicon-personal-row-label">
                              <Settings size={16} strokeWidth={2} />
                              <span>Giới thiệu</span>
                            </span>
                            <div className="lexicon-personal-row-value lexicon-bio-value">
                              {isEditingName ? (
                                <input
                                  type="text"
                                  className="lexicon-inline-name-input lexicon-inline-bio-input"
                                  value={editBioVal}
                                  onChange={(e) => setEditBioVal(e.target.value)}
                                  maxLength={120}
                                  aria-label="Giới thiệu"
                                />
                              ) : (
                                bioText
                              )}
                            </div>
                          </div>

                          {/* Optional Row 5 in Edit Mode: Bounty customization */}
                          {isEditingName && (
                            <div className="lexicon-personal-row">
                              <span className="lexicon-personal-row-label">
                                <Award size={16} strokeWidth={2} />
                                <span>Tiền thưởng</span>
                              </span>
                              <div className="lexicon-personal-row-value">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="lexicon-inline-name-input"
                                  value={editBountyVal}
                                  onChange={(e) =>
                                    setEditBountyVal(e.target.value.replace(/[^0-9]/g, ''))
                                  }
                                  placeholder="Tự động theo XP"
                                  aria-label="Tiền thưởng truy nã"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Top-Right Tilted Stamp Button CHỈNH SỬA */}
                        {!isEditingName && (
                          <button
                            type="button"
                            className="lexicon-edit-stamp-btn"
                            onClick={handleStartEditName}
                            aria-label="Chỉnh sửa thông tin cá nhân"
                          >
                            <span className="lexicon-edit-stamp-inner">
                              <svg
                                className="lexicon-edit-quill-icon"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M20.7 3.3c-2.4-2.4-7.2-.8-11.2 3.2-2.7 2.7-4.5 6.1-5.1 9.1L3 20l1.4 1.4 4.4-1.4c3-.6 6.4-2.4 9.1-5.1 4-4 5.6-8.8 3.2-11.2-.2-.2-.2-.2-.4-.4zM6.8 17.2c.6-2.2 2-4.8 4.1-6.9l4.2 4.2c-2.1 2.1-4.7 3.5-6.9 4.1l-1.4-1.4z" />
                              </svg>
                              <span>CHỈNH SỬA</span>
                            </span>
                          </button>
                        )}

                        {/* Bottom-Right Decorative Mountain + Botanical + Keep Exploring Ribbon */}
                        <div
                          className="lexicon-keep-exploring-art"
                          aria-hidden="true"
                        >
                          <img
                            src="/assets/profile/profile-keep-exploring.png"
                            alt=""
                            className="lexicon-keep-exploring-img"
                            draggable="false"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="lexicon-profile-subpage-scroll">
                      <ChangePasswordForm
                        username={rawDisplayName}
                        email={email}
                        onSuccess={(msg) => showToast(msg, 'success')}
                        onError={(msg) => showToast(msg, 'error')}
                      />
                    </div>
                  )}

                  {activeTab === 'levels' && (
                    <div className="lexicon-profile-subpage-scroll">
                      <TierList
                        tiers={tiers}
                        currentLevel={level}
                        currentTierId={userRank.tierId}
                        avatarUrl={profile?.avatarUrl}
                        displayName={rawDisplayName}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Headless AvatarUploader for File Picker & Interactive Crop Modal */}
      <AvatarUploader
        headless
        triggerRef={avatarTriggerRef}
        deleteRef={avatarDeleteRef}
        avatarUrl={profile?.avatarUrl}
        tierId={levelInfo.tierId || 'WOOD'}
        displayName={rawDisplayName}
        onAvatarUpdated={handleAvatarUpdated}
        onSuccess={(msg) => showToast(msg, 'success')}
        onError={(msg) => showToast(msg, 'error')}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
