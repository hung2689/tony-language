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
import LibraryWorkspace from './features/library/LibraryWorkspace';
import DeckDetailPage from './features/decks/DeckDetailPage';
import LearnPage from './features/learn/LearnPage';
import StudyPlanPage from './features/studyplan/StudyPlanPage';
import TodayLearnPage from './features/studyplan/TodayLearnPage';
import SrsSessionPage from './features/studyplan/SrsSessionPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import WeakWordsPracticePage from './features/analytics/WeakWordsPracticePage';
import CreateStudyPlanModal from './features/studyplan/CreateStudyPlanModal';
import AddDecksPreviewModal from './features/studyplan/AddDecksPreviewModal';
import DailyGateReminder from './features/studyplan/DailyGateReminder';
import ErrorBoundary from './components/common/ErrorBoundary';
import './App.css';

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
      <CreateStudyPlanModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        initialDeckId={createModalInitialDeckId}
      />
      <AddDecksPreviewModal
        isOpen={isAddDecksModalOpen}
        onClose={closeAddDecksModal}
        targetDeckIds={addDecksTargetDeckIds}
      />
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
                    <Route index element={<LibraryWorkspace />} />
                    <Route path="decks/:deckId/*" element={<DeckDetailPage />} />
                    <Route path="study-plan" element={<StudyPlanPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </StudyPlanProvider>
            </WallpaperProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
