import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PublicOnlyRoute from './features/auth/PublicOnlyRoute';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import MainLayout from './components/layout/MainLayout';
import LibraryWorkspace from './features/library/LibraryWorkspace';
import DeckDetailPage from './features/decks/DeckDetailPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
