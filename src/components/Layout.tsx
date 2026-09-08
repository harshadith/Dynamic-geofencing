import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { Map, ShieldAlert, Navigation, FileSearch, Shield, LayoutDashboard, LogOut, Menu, User, LogIn, Radio } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { AuthModal } from './auth/AuthModal';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Live Map', icon: Map },
  { path: '/route', label: 'Safe Route', icon: Navigation },
  { path: '/destinations', label: 'Destinations', icon: FileSearch },
  { path: '/admin', label: 'Admin Dashboard', icon: Shield },
];

export const Layout = () => {
  const { user, setUser, toggleUserRole, isDemoLocation, isAuthModalOpen, setIsAuthModalOpen, travellers } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    setUser(null);
  };

  const allowedNavItems = NAV_ITEMS;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-xs z-20">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              G
            </div>
            <div>
              <span className="text-base font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600 block leading-tight">
                GeoSafeAI
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Real-Time Travel Safety</span>
            </div>
          </div>
        </div>

        {/* Live Active Telemetry Status */}
        <div className="px-4 pt-3 pb-1">
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px]">Live Grid: {travellers.length} Active</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600">Sync</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                location.pathname === item.path
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Account & Role Controls */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
          {user ? (
            <div className="space-y-2">
              <div
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                title="Manage Account"
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-blue-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {user.role}
                </span>

                <button
                  onClick={toggleUserRole}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                  Switch Role
                </button>

                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                >
                  Account
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In / Register
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-3.5 bg-white border-b border-slate-200 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              G
            </div>
            <span className="text-base font-bold text-slate-800">GeoSafeAI</span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="truncate max-w-[90px]">{user.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                Sign In
              </button>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-slate-600">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-slate-200 z-30 shadow-lg animate-in slide-in-from-top-2">
            <nav className="flex flex-col p-2 space-y-1">
              {allowedNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold",
                    location.pathname === item.path ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-2">
                <button
                  onClick={() => {
                    toggleUserRole();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-blue-600 font-semibold"
                >
                  Mode: {user?.role} (Switch)
                </button>
                <button
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-slate-600 font-medium"
                >
                  Account / Sign In
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 h-full min-h-0 overflow-y-auto bg-slate-50 flex flex-col relative">
          <Outlet />
        </div>

        {/* Global SOS Button - Floating */}
        <button
          onClick={() => navigate('/sos')}
          title="Emergency SOS Dispatch"
          className="absolute bottom-5 right-5 md:bottom-6 md:right-6 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95 animate-pulse"
        >
          <ShieldAlert className="w-7 h-7" />
        </button>
      </main>
    </div>
  );
};
