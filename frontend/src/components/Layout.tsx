import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLink = (to: string, label: string) => (
    <NavLink
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Navbar ─────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="text-xl font-bold text-primary-700">Surety</span>
              </button>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLink('/search', t('nav.search'))}
              {user?.role === 'CUSTOMER' && navLink('/bookings', t('nav.my_bookings'))}
              {user?.role === 'PROVIDER' && navLink('/provider/dashboard', t('nav.dashboard'))}
              {user?.role === 'ADMIN' && navLink('/admin', t('nav.dashboard'))}
              {user?.role === 'ADMIN' && navLink('/admin/verification', 'Verification')}
              {user?.role === 'ADMIN' && navLink('/admin/disputes', 'Disputes')}
              {navLink('/support', t('nav.support'))}
            </div>

            {/* User menu */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    {user.fullName}{' '}
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{user.role}</span>
                  </span>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {t('nav.login')}
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {t('nav.signup')}
                  </NavLink>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            {navLink('/search', t('nav.search'))}
            {user?.role === 'CUSTOMER' && navLink('/bookings', t('nav.my_bookings'))}
            {user?.role === 'PROVIDER' && navLink('/provider/dashboard', t('nav.dashboard'))}
            {user?.role === 'ADMIN' && navLink('/admin', t('nav.dashboard'))}
            {navLink('/support', t('nav.support'))}
            <div className="border-t border-gray-100 pt-2 mt-2">
              {user ? (
                <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-red-600">
                  {t('nav.logout')} ({user.fullName})
                </button>
              ) : (
                <div className="flex gap-3">
                  <NavLink to="/login" className="text-sm text-primary-600">{t('nav.login')}</NavLink>
                  <NavLink to="/signup" className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded">{t('nav.signup')}</NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Content ───────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Surety — Trusted Service Marketplace. Built for Kenya.
        </div>
      </footer>
    </div>
  );
}
