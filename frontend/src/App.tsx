import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FloatingLawAgentWidget } from './components/FloatingLawAgentWidget';
import { ProtectedRoute } from './components/ProtectedRoute';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LawAgentProvider, useLawAgent } from './context/LawAgentContext';

import { SignInPage } from './pages/SignInPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { CitationAuditPage } from './pages/CitationAuditPage';
import { LawAgentPage } from './pages/LawAgentPage';
import { LawLibraryPage } from './pages/LawLibraryPage';
import { IpcBnsConverterPage } from './pages/IpcBnsConverterPage';
import { SettingsPage } from './pages/SettingsPage';

interface MainAppLayoutProps {
  privacyMode: boolean;
  setPrivacyMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const MainAppLayout: React.FC<MainAppLayoutProps> = ({
  privacyMode,
  setPrivacyMode,
}) => {
  return (
    <div className="min-h-screen bg-nyaya-ivory flex flex-col text-nyaya-text font-sans antialiased">
      <Navbar
        privacyMode={privacyMode}
        onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
      />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>

      <Footer />

      {/* Floating Global Law Agent Widget */}
      <FloatingLawAgentWidget />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const { openFloatingAgent } = useLawAgent();
  const [privacyMode, setPrivacyMode] = useState(false);

  return (
    <Routes>
      {/* Public Auth Route */}
      <Route
        path="/signin"
        element={user ? <Navigate to="/" replace /> : <SignInPage />}
      />

      {/* Root Route: Shows LandingPage for authenticated users, SignInPage for guests/unauthenticated */}
      <Route
        path="/"
        element={
          user ? (
            <MainAppLayout
              privacyMode={privacyMode}
              setPrivacyMode={setPrivacyMode}
            />
          ) : (
            <SignInPage />
          )
        }
      >
        <Route index element={<LandingPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainAppLayout
              privacyMode={privacyMode}
              setPrivacyMode={setPrivacyMode}
            />
          </ProtectedRoute>
        }
      >
        <Route
          path="/workspace"
          element={
            <WorkspacePage
              onOpenLawAgent={openFloatingAgent}
              privacyMode={privacyMode}
            />
          }
        />
        <Route path="/audit" element={<CitationAuditPage />} />
        <Route path="/agent" element={<LawAgentPage />} />
        <Route
          path="/library"
          element={<LawLibraryPage onOpenLawAgent={openFloatingAgent} />}
        />
        <Route path="/converter" element={<IpcBnsConverterPage />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              privacyMode={privacyMode}
              onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
            />
          }
        />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={user ? '/' : '/signin'} replace />}
      />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LawAgentProvider>
          <AppRoutes />
        </LawAgentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
