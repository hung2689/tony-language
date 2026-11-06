import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ThemeProvider } from './features/theme/ThemeContext';
import { WallpaperProvider } from './features/wallpapers/WallpaperContext';
import { StudyPlanProvider, useStudyPlan } from './features/studyplan/StudyPlanContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PublicOnlyRoute from './features/auth/PublicOnlyRoute';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageSkeleton from './components/common/PageSkeleton';
import DailyGateReminder from './features/studyplan/DailyGateReminder';
import StudyPlanUndoToast from './features/studyplan/StudyPlanUndoToast';
import { routeLoaders } from './utils/preloadRoute';
import './App.css';

// Code-split dynamic routes via shared routeLoaders
const MapPage = lazy(routeLoaders.map);
const LibraryWorkspace = lazy(routeLoaders.library);
const DeckDetailPage = lazy(routeLoaders.deckDetail);
const LearnPage = lazy(routeLoaders.learn);
const SynonymPage = lazy(routeLoaders.synonym);
const StudyPlanPage = lazy(routeLoaders.studyPlan);
const TodayLearnPage = lazy(routeLoaders.todayLearn);
const SrsSessionPage = lazy(routeLoaders.srs);
const AnalyticsPage = lazy(routeLoaders.analytics);
const WeakWordsPracticePage = lazy(routeLoaders.weakWordsPractice);
const ProfilePage = lazy(routeLoaders.profile);

// Code-split global modals: only loaded when user triggers their opening
const CreateStudyPlanModal = lazy(routeLoaders.createStudyPlanModal);
const AddDecksPreviewModal = lazy(routeLoaders.addDecksPreviewModal);

function StudyPlanModals() {
  const {
    isCreateModalOpen,
    closeCreateModal,
    createModalInitialDeckId,
    isAddDecksModalOpen,
    closeAddDecksModal,
    addDecksTargetDeckIds,
  } = useStudyPlan();

  return (
    <>
      <DailyGateReminder />
      {isCreateModalOpen && (
        <Suspense fallback={null}>
          <CreateStudyPlanModal
            isOpen={isCreateModalOpen}
            onClose={closeCreateModal}
            initialDeckId={createModalInitialDeckId}
          />
        </Suspense>
      )}
      {isAddDecksModalOpen && (
        <Suspense fallback={null}>
          <AddDecksPreviewModal
            isOpen={isAddDecksModalOpen}
            onClose={closeAddDecksModal}
            targetDeckIds={addDecksTargetDeckIds}
          />
        </Suspense>
      )}
      <StudyPlanUndoToast />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <WallpaperProvider>
              <StudyPlanProvider>
                <StudyPlanModals />
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    <Route
                      path="/login"
                      element={
                        <PublicOnlyRoute>
                          <LoginPage />
                        </PublicOnlyRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicOnlyRoute>
                          <RegisterPage />
                        </PublicOnlyRoute>
                      }
                    />

                    {/* Distraction-free Study Routes (without Sidebar and Header) */}
                    <Route
                      path="/decks/:deckId/learn"
                      element={
                        <ProtectedRoute>
                          <LearnPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/decks/:deckId/synonym"
                      element={
                        <ProtectedRoute>
                          <SynonymPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study-plan/learn"
                      element={
                        <ProtectedRoute>
                          <TodayLearnPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study-plan/srs"
                      element={
                        <ProtectedRoute>
                          <SrsSessionPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/decks/:deckId/srs"
                      element={
                        <ProtectedRoute>
                          <SrsSessionPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics/practice"
                      element={
                        <ProtectedRoute>
                          <WeakWordsPracticePage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Application Routes sharing MainLayout (Sidebar + Header) */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<MapPage />} />
                      <Route path="map" element={<MapPage />} />
                      <Route path="library" element={<LibraryWorkspace />} />
                      <Route path="decks" element={<LibraryWorkspace />} />
                      <Route path="decks/:deckId/*" element={<DeckDetailPage />} />
                      <Route path="study-plan" element={<StudyPlanPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route path="profile/settings" element={<ProfilePage />} />
                      <Route path="profile/security" element={<ProfilePage />} />
                      <Route path="profile/levels" element={<ProfilePage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </StudyPlanProvider>
            </WallpaperProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
