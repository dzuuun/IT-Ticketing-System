import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { user, logout, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const inStaffPortal = location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin') || (isStaff && location.pathname.startsWith('/tickets/'));

  return (
    <header className="sticky top-0 z-40 bg-ndmu-green-900 text-white shadow-md border-b border-ndmu-green-800">
      <div className={`${onToggleSidebar ? 'max-w-none' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                aria-expanded={sidebarOpen}
                className="hidden h-11 w-11 place-items-center rounded-xl border border-emerald-100/60 bg-ndmu-green-800 text-white shadow-sm transition-colors hover:bg-ndmu-green-700 lg:grid"
              >
                <span className="relative block h-4 w-5" aria-hidden="true">
                  <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
                  <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${sidebarOpen ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'}`} />
                  <span className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${sidebarOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
                </span>
              </button>
            )}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/images/ndmu-logo.png" alt="NDMU seal" className="h-11 w-11 object-contain transition-transform group-hover:scale-105" />
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                NDMU <span className="text-ndmu-gold-400 font-medium">ICT-MIS Service Desk</span>
              </div>
              <div className="text-[11px] text-emerald-100/70 font-medium">
                Excellence through service
              </div>
            </div>
          </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/') ? 'bg-ndmu-green-800 text-white' : 'text-emerald-100 hover:bg-ndmu-green-800/60'
              }`}
            >
              Home
            </Link>
            <Link
              to="/submit"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/submit') ? 'bg-ndmu-green-800 text-white' : 'text-emerald-100 hover:bg-ndmu-green-800/60'
              }`}
            >
              Submit Request
            </Link>
            <Link
              to="/track"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/track') ? 'bg-ndmu-green-800 text-white' : 'text-emerald-100 hover:bg-ndmu-green-800/60'
              }`}
            >
              Track Guest Ticket
            </Link>
            {user && (
              <Link
                to="/my-tickets"
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive('/my-tickets') ? 'bg-ndmu-green-800 text-white' : 'text-emerald-100 hover:bg-ndmu-green-800/60'
                }`}
              >
                My Requests
              </Link>
            )}
            <Link
              to="/kb"
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/kb') ? 'bg-ndmu-green-800 text-white' : 'text-emerald-100 hover:bg-ndmu-green-800/60'
              }`}
            >
              Knowledge Base
            </Link>
          </nav>

          {/* User Controls & Staff Badges */}
          <div className="hidden md:flex items-center gap-3">
            {isStaff && !inStaffPortal && (
              <Link
                to="/staff/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ndmu-gold-500 hover:bg-ndmu-gold-400 text-slate-900 font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard_customize</span>
                ICT-MIS Staff Portal
              </Link>
            )}

            {user ? (
              <div className={`flex min-w-0 items-center gap-3 ${inStaffPortal ? '' : 'border-l border-ndmu-green-800 pl-2'}`}>
                <div className="min-w-0 text-right">
                  <div className="max-w-[220px] truncate text-xs font-bold text-white">{user.full_name}</div>
                  <div className="text-[10px] text-ndmu-gold-300 capitalize font-medium">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Sign Out"
                  className="p-1.5 rounded-lg bg-ndmu-green-800 hover:bg-rose-600 text-emerald-100 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg border border-white/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-emerald-100 hover:bg-ndmu-green-800"
            >
              <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-ndmu-green-950 border-t border-ndmu-green-800 px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-emerald-100 hover:bg-ndmu-green-800"
          >
            Home
          </Link>
          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-emerald-100 hover:bg-ndmu-green-800"
          >
            Submit Request
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-emerald-100 hover:bg-ndmu-green-800"
          >
            Track Guest Ticket
          </Link>
          {user && (
            <Link
              to="/my-tickets"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-emerald-100 hover:bg-ndmu-green-800"
            >
              My Requests
            </Link>
          )}
          <Link
            to="/kb"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-emerald-100 hover:bg-ndmu-green-800"
          >
            Knowledge Base
          </Link>
          {isStaff && !inStaffPortal && (
            <Link
              to="/staff/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-bold text-ndmu-gold-300 bg-ndmu-green-900"
            >
              ICT-MIS Staff Portal
            </Link>
          )}
          <div className="pt-3 border-t border-ndmu-green-800">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{user.full_name}</div>
                  <div className="text-xs text-ndmu-gold-300 capitalize">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="px-3 py-1 bg-rose-600 text-white rounded text-xs"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 bg-ndmu-gold-500 text-slate-900 font-bold rounded-lg text-sm"
              >
                Sign In with NDMU Account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
