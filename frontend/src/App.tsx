import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import HomePage from './pages/customer/HomePage';
import SearchPage from './pages/customer/SearchPage';
import ProviderProfilePage from './pages/customer/ProviderProfilePage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import BookingDetailPage from './pages/customer/BookingDetailPage';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderOnboarding from './pages/provider/ProviderOnboarding';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerification from './pages/admin/AdminVerification';
import AdminDisputes from './pages/admin/AdminDisputes';
import SupportPage from './pages/customer/SupportPage';
import PaymentHistoryPage from './pages/customer/PaymentHistoryPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (user) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/provider/:id" element={<ProviderProfilePage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Customer */}
        <Route path="/book/:providerId" element={<ProtectedRoute roles={['CUSTOMER']}><BookingPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute roles={['CUSTOMER']}><MyBookingsPage /></ProtectedRoute>} />
        <Route path="/bookings/:id" element={<ProtectedRoute roles={['CUSTOMER', 'PROVIDER']}><BookingDetailPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PaymentHistoryPage /></ProtectedRoute>} />

        {/* Provider */}
        <Route path="/provider/dashboard" element={<ProtectedRoute roles={['PROVIDER']}><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/provider/onboarding" element={<ProtectedRoute roles={['PROVIDER']}><ProviderOnboarding /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/verification" element={<ProtectedRoute roles={['ADMIN']}><AdminVerification /></ProtectedRoute>} />
        <Route path="/admin/disputes" element={<ProtectedRoute roles={['ADMIN']}><AdminDisputes /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
