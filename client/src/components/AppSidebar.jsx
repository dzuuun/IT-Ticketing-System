import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const requestorItems = [
  { to: '/submit', icon: 'add_task', label: 'Submit Request' },
  { to: '/track', icon: 'search', label: 'Track Guest Ticket', guestOnly: true },
  { to: '/my-tickets', icon: 'confirmation_number', label: 'My Requests', authenticated: true },
  { to: '/kb', icon: 'menu_book', label: 'Knowledge Base', matchPrefix: true },
];

const workQueueItems = [
  { to: '/staff/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/staff/my-tickets', icon: 'person', label: 'My Tickets', badgeKey: 'myActive' },
  { to: '/staff/unassigned', icon: 'inbox', label: 'Unassigned Queue', badgeKey: 'new' },
  { to: '/staff/all-tickets', icon: 'list_alt', label: 'All Tickets' },
  { to: '/staff/reports', icon: 'monitoring', label: 'Reports & SLAs' },
];

const administrationItems = [
  { to: '/admin/catalog', icon: 'category', label: 'Service Catalog', roles: ['admin'] },
  { to: '/admin/users', icon: 'group', label: 'Users', roles: ['admin'] },
  { to: '/admin/teams', icon: 'groups_2', label: 'Teams', roles: ['admin', 'team_leader'] },
  { to: '/admin/departments', icon: 'apartment', label: 'Departments', roles: ['admin'] },
  { to: '/admin/settings', icon: 'tune', label: 'System Settings & SLA', roles: ['admin'] },
];

function SidebarSection({ title, items, counts, user }) {
  const location = useLocation();

  return (
    <section>
      <h2 className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-100/45">
        {title}
      </h2>
      <nav className="space-y-1" aria-label={title}>
        {items
          .filter((item) => (!item.authenticated || user) && (!item.guestOnly || !user) && (!item.roles || item.roles.includes(user?.role)))
          .map((item) => {
            const badge = item.badgeKey ? counts[item.badgeKey] : undefined;
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || (item.matchPrefix && location.pathname.startsWith(`${item.to}/`));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-h-10 items-center justify-between rounded-lg border-l-[3px] px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'border-ndmu-gold-400 bg-ndmu-green-700 text-white shadow-sm'
                    : 'border-transparent text-emerald-100/85 hover:bg-ndmu-green-800 hover:text-white'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[18px] transition-colors ${active ? 'text-ndmu-gold-300' : 'text-emerald-100/80'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {Number(badge) > 0 && (
                  <span className="ml-2 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white">
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
      </nav>
    </section>
  );
}

export default function AppSidebar({ isOpen }) {
  const { user, loading, isStaff, isAdmin, isTeamLeader } = useAuth();
  const [counts, setCounts] = useState({});
  const verifiedUser = loading ? null : user;
  const canUseStaffPortal = !loading && Boolean(user) && isStaff;
  const canAdminister = canUseStaffPortal && (isAdmin || isTeamLeader);

  useEffect(() => {
    if (!canUseStaffPortal) {
      setCounts({});
      return undefined;
    }

    let active = true;
    api.get('/stats/dashboard')
      .then((response) => {
        if (active && response.data?.success) setCounts(response.data.statusCounts || {});
      })
      .catch(() => {});

    return () => { active = false; };
  }, [canUseStaffPortal]);

  const sections = useMemo(() => {
    if (!canUseStaffPortal) return [{ title: 'Requestor Portal', items: requestorItems }];

    return [
      { title: 'Work Queues', items: workQueueItems },
      { title: 'Requestor Portal', items: requestorItems },
      ...(canAdminister ? [{ title: 'Administration Modules', items: administrationItems }] : []),
    ];
  }, [canUseStaffPortal, canAdminister]);

  return (
    <aside
      aria-label="Primary navigation"
      aria-hidden={!isOpen}
      className={`hidden shrink-0 overflow-hidden bg-ndmu-green-950 text-emerald-100 transition-[width] duration-300 ease-in-out lg:block ${isOpen ? 'w-72' : 'w-0'}`}
    >
      <div className={`flex h-screen min-h-0 w-72 flex-col border-r border-ndmu-green-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex min-h-20 items-center border-b border-ndmu-green-800 px-5 py-4">
          <img src="/images/ndmu-logo.png" alt="NDMU seal" className="h-11 w-11 rounded-full bg-white object-contain p-0.5" />
          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-extrabold uppercase tracking-wide text-white">
              {canUseStaffPortal ? 'ICT-MIS Operations' : 'ICT-MIS Service Desk'}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100/55">
              {canUseStaffPortal ? `${canAdminister ? 'Admin' : user?.role?.replaceAll('_', ' ') || 'Staff'} Portal` : 'Requestor Portal'}
            </p>
          </div>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5">
          {sections.map((section) => (
            <SidebarSection
              key={section.title}
              title={section.title}
              items={section.items}
              counts={counts}
              user={verifiedUser}
            />
          ))}
        </div>

        <div className="border-t border-ndmu-green-800 p-4">
          {loading ? (
            <div className="rounded-lg bg-ndmu-green-900 px-3 py-3 text-xs text-emerald-100/65">
              Verifying session...
            </div>
          ) : user ? (
            <div className="rounded-lg border border-ndmu-green-800 bg-ndmu-green-900 px-3 py-3">
              <p className="truncate text-xs font-bold text-white">{user.full_name}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-ndmu-gold-300">
                {user.role?.replaceAll('_', ' ')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-ndmu-green-900 px-3 py-3 text-xs leading-5 text-emerald-100/75">
              Sign in to view and manage your submitted requests.
            </div>
          )}
          <p className="mt-3 text-center text-[10px] text-emerald-100/35">NDMU ICT-MIS Helpdesk v1.0</p>
        </div>
      </div>
    </aside>
  );
}
