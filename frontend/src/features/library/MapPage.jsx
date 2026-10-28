import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { profileService } from '../profile/profileService';
import { analyticsService } from '../../services/analyticsService';
import ExplorerSidebar from './components/ExplorerSidebar';
import ExplorerSummary from './components/ExplorerSummary';
import WorldMap from './components/WorldMap';
import { MAP_DESTINATIONS } from './lexiconMapData';
import './RpgLibraryWorkspace.css';

export default function MapPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};

  const [fetchedOverview, setFetchedOverview] = useState(null);
  const overview = outletContext.overview || fetchedOverview;
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState('mountains-of-discovery');

  // Toggle scoped vintage theme class on document.body
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
    };
  }, []);

  // Fetch live user profile
  useEffect(() => {
    let ignore = false;
    profileService
      .getProfile()
      .then((data) => {
        if (!ignore && data) {
          setUserProfile(data);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch analytics overview if not provided by parent layout
  useEffect(() => {
    if (!outletContext.overview) {
      let ignore = false;
      analyticsService
        .getOverview()
        .then((data) => {
          if (!ignore && data) {
            setFetchedOverview(data);
          }
        })
        .catch(() => {});
      return () => {
        ignore = true;
      };
    }
  }, [outletContext.overview]);

  const activeDestination =
    MAP_DESTINATIONS.find((dest) => dest.id === selectedDestinationId) ||
    MAP_DESTINATIONS[2];

  const playerLevel =
    userProfile?.levelInfo?.level ?? userProfile?.level ?? 1;
  const xpIntoLevel =
    userProfile?.levelInfo?.xpIntoLevel ?? userProfile?.xpIntoLevel ?? 0;
  const xpForNext =
    userProfile?.levelInfo?.xpNeededForNextLevel ??
    userProfile?.levelInfo?.xpForNextLevel ??
    userProfile?.xpForNext ??
    80;
  const expPercent = Math.min(
    100,
    Math.max(8, Math.round((xpIntoLevel / Math.max(1, xpForNext)) * 100))
  );
  const wordsLearnedCount =
    overview?.masteredWords ?? overview?.learnedWords ?? 248;
  const playerStreak = overview?.currentStreak ?? 7;

  const handleSelectMapDestination = (destination) => {
    setSelectedDestinationId(destination.id);
  };

  const handleGoToDestinationVocabulary = () => {
    navigate(`/library?destination=${activeDestination.id}`);
  };

  const handleSidebarNavigation = (navId, path) => {
    if (navId === 'map') return;
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="lexicon-journal-shell rpg-library-container map-page-layout">
      {/* Region B: Dedicated 5-item Parchment Sidebar */}
      <ExplorerSidebar
        activeNav="map"
        onSelectNav={handleSidebarNavigation}
      />

      {/* Main Map Region: Header Summary & Fantasy Illustrated World Map */}
      <div className="lexicon-journal-main map-page-main">
        <ExplorerSummary
          level={playerLevel}
          rankTitle={userProfile?.levelInfo?.tierName || userProfile?.tierName}
          expPercent={expPercent}
          wordsLearned={wordsLearnedCount}
          wordsGoal={1000}
          streakDays={playerStreak}
          currentDestination={activeDestination}
          onClickLevel={() => navigate('/profile/levels')}
          onClickWords={() => navigate('/library')}
          onClickStreak={() => navigate('/analytics')}
          onClickDestination={handleGoToDestinationVocabulary}
        />

        <WorldMap
          destinations={MAP_DESTINATIONS}
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={handleSelectMapDestination}
        />
      </div>
    </div>
  );
}
