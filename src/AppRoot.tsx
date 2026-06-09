// ============================================
// CLUB 90 — App Shell (All Modals Connected)
// ============================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MatchDetailPage from './pages/MatchDetailPage';
import MyBetsPage from './pages/MyBetsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import StorePage from './pages/StorePage';
import AdminTeamsPage from './pages/AdminTeamsPage';
import CashierPage from './pages/CashierPage';

import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import BetSlip from './components/BetSlip';
import RedeemCodeModal from './components/RedeemCodeModal';
import ToastContainer from './components/ToastContainer';
import SideDrawer from './components/SideDrawer';
import RewardsModal from './components/RewardsModal';
import RulesModal from './components/RulesModal';
import PrizesModal from './components/PrizesModal';

// ─── Protected Route Wrapper ────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#031522]">
        <div className="spinner" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ─── App Layout ─────────────────────────────

function AppLayout({ children, showBack = false, title }: { children: React.ReactNode; showBack?: boolean; title?: string }) {
  return (
    <div className="bg-[#031522] min-h-screen flex flex-col">
      <TopAppBar showBack={showBack} title={title} />
      <main className="flex-1">{children}</main>
      <BottomNavBar />

      {/* Global Overlays */}
      <BetSlip />
      <RedeemCodeModal />
      <SideDrawer />
      <RewardsModal />
      <RulesModal />
      <PrizesModal />
      <ToastContainer />
    </div>
  );
}

// ─── Main App ───────────────────────────────

function AppRoot() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><HomePage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/match/:id" element={
        <ProtectedRoute>
          <AppLayout showBack title="Detalle del Partido"><MatchDetailPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/bets" element={
        <ProtectedRoute>
          <AppLayout title="Mis Pron\u00f3sticos"><MyBetsPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <AppLayout><LeaderboardPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout title="Perfil"><ProfilePage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/store" element={
        <ProtectedRoute>
          <AppLayout title="Kiosco VIP"><StorePage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin/teams" element={
        <ProtectedRoute>
          <AppLayout showBack title="Admin — Equipos"><AdminTeamsPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Cajero */}
      <Route path="/cashier" element={
        <ProtectedRoute>
          <AppLayout showBack title="Caja"><CashierPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Fallback — MUST BE LAST */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoot;
