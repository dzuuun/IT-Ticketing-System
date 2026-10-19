import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const requestorItems = [
  { to: "/submit", icon: "add_task", label: "Submit Request" },
  {
    to: "/track",
    icon: "search",
    label: "Track Guest Ticket",
    guestOnly: true,
  },
  {
    to: "/my-tickets",
    icon: "confirmation_number",
    label: "My Requests",
    authenticated: true,
  },
  { to: "/kb", icon: "menu_book", label: "Knowledge Base", matchPrefix: true },
];

const workQueueItems = [
  { to: "/staff/dashboard", icon: "dashboard", label: "Dashboard" },
  {
    to: "/staff/my-tickets",
    icon: "person",
    label: "My Tickets",
    badgeKey: "myActive",
  },
  {
    to: "/staff/unassigned",
    icon: "inbox",
    label: "Unassigned Queue",
    badgeKey: "new",
  },
  { to: "/staff/all-tickets", icon: "list_alt", label: "All Tickets" },
  { to: "/staff/reports", icon: "monitoring", label: "Reports & SLAs" },
];

const administrationItems = [
  {
    to: "/admin/catalog",
    icon: "category",
    label: "Service Catalog",
    roles: ["admin"],
  },
  { to: "/admin/users", icon: "group", label: "Users", roles: ["admin"] },
  { to: "/admin/knowledge-base", icon: "edit_document", label: "Knowledge Base", roles: ["admin"] },
  {
    to: "/admin/teams",
    icon: "groups_2",
    label: "Teams",
    roles: ["admin", "team_leader"],
  },
  {
    to: "/admin/locations",
    icon: "location_on",
    label: "Locations",
    roles: ["admin"],
  },
  {
    to: "/admin/settings",
    icon: "tune",
    label: "System Settings & SLA",
    roles: ["admin"],
  },
  {
    to: "/admin/announcements",
    icon: "campaign",
    label: "Announcements",
    roles: ["admin"],
  },
  {
    to: "/admin/assets",
    icon: "inventory_2",
    label: "Asset Inventory",
    roles: ["admin"],
  },
];

function SidebarSection({ title, items, counts, user, collapsed = false }) {
  const location = useLocation();

  return (
    <section>
      <h2
        className={`${collapsed ? "sr-only" : "mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-100/45"}`}
      >
        {title}
      </h2>
      <nav className={collapsed ? "space-y-2" : "space-y-1"} aria-label={title}>
        {items
          .filter(
            (item) =>
              (!item.authenticated || user) &&
              (!item.guestOnly || !user) &&
              (!item.roles || item.roles.includes(user?.role)),
          )
          .map((item) => {
            const badge = item.badgeKey ? counts[item.badgeKey] : undefined;
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to ||
                (item.matchPrefix &&
                  location.pathname.startsWith(`${item.to}/`));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`group relative flex min-h-10 items-center rounded-lg border-l-[3px] text-xs font-semibold transition-all duration-200 ease-out ${
                  active
                    ? "border-ndmu-gold-400 bg-ndmu-green-700 text-white shadow-sm"
                    : "border-transparent text-emerald-100/85 hover:bg-ndmu-green-800 hover:text-white"
                } ${
                  collapsed
                    ? "h-12 justify-center border-l-0 px-0 hover:translate-x-0"
                    : "justify-between px-3 py-2 hover:translate-x-0.5"
                }`}
              >
                <span
                  className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-2.5"}`}
                >
                  <span
                    className={`material-symbols-outlined transition-colors ${collapsed ? "text-[21px]" : "text-[18px]"} ${active ? "text-ndmu-gold-300" : "text-emerald-100/80"}`}
                  >
                    {item.icon}
                  </span>
                  <span className={collapsed ? "sr-only" : "truncate"}>
                    {item.label === "My Requests" && user?.role === "encoder"
                      ? "Encoded Requests"
                      : item.label}
                  </span>
                </span>
                {Number(badge) > 0 && (
                  <span
                    className={`${collapsed ? "absolute right-1 top-1 min-w-4 px-1 text-[8px]" : "ml-2 min-w-5 px-1.5 text-[10px]"} rounded-full bg-rose-500 py-0.5 text-center font-bold leading-4 text-white`}
                  >
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

export default function AppSidebar({ isOpen, onPreviewChange }) {
  const { user, loading, isStaff, isAdmin, isTeamLeader, logout } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const previewCloseTimer = useRef(null);
  const expanded = isOpen || isHoverExpanded;
  const verifiedUser = loading ? null : user;
  const canUseStaffPortal = !loading && Boolean(user) && isStaff;
  const canAdminister = canUseStaffPortal && (isAdmin || isTeamLeader);
  const userInitials = user?.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const preview = (open) => {
    if (previewCloseTimer.current) {
      window.clearTimeout(previewCloseTimer.current);
      previewCloseTimer.current = null;
    }
    setIsHoverExpanded(open);
    onPreviewChange?.(open);
  };

  const deferPreviewClose = () => {
    // Allow a pointer-down in main to dismiss the hover preview before its
    // target can receive the click.
    previewCloseTimer.current = window.setTimeout(() => preview(false), 250);
  };

  useEffect(() => {
    if (!canUseStaffPortal) {
      setCounts({});
      return undefined;
    }

    let active = true;
    api
      .get("/stats/dashboard")
      .then((response) => {
        if (active && response.data?.success)
          setCounts(response.data.statusCounts || {});
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [canUseStaffPortal]);

  const sections = useMemo(() => {
    if (!canUseStaffPortal)
      return [{ title: "Requestor Portal", items: requestorItems }];

    return [
      { title: "Work Queues", items: workQueueItems },
      { title: "Requestor Portal", items: requestorItems },
      ...(canAdminister
        ? [{ title: "Administration Modules", items: administrationItems }]
        : []),
    ];
  }, [canUseStaffPortal, canAdminister]);

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary navigation"
      onMouseEnter={() => !isOpen && preview(true)}
      onMouseLeave={deferPreviewClose}
      className={`app-sidebar ${expanded ? "app-sidebar--expanded" : ""}`}
    >
      <div className="flex h-full min-h-0 w-full flex-col border-r border-ndmu-green-800">
        <div
          className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain py-5 ${expanded ? "space-y-6 px-3" : "space-y-5 px-2"}`}
        >
          {sections.map((section) => (
            <SidebarSection
              key={section.title}
              title={section.title}
              items={section.items}
              counts={counts}
              user={verifiedUser}
              collapsed={!expanded}
            />
          ))}
        </div>

        <div
          className={`shrink-0 border-t border-ndmu-green-800 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${expanded ? "px-4" : "px-2"}`}
        >
          {loading ? (
            <div
              className={`${expanded ? "rounded-lg bg-ndmu-green-900 px-3 py-3 text-xs text-emerald-100/65" : "grid h-12 place-items-center text-emerald-100/65"}`}
              title={!expanded ? "Verifying session" : undefined}
            >
              <span
                className={
                  expanded ? "" : "material-symbols-outlined animate-spin"
                }
              >
                {expanded ? "Verifying session..." : "progress_activity"}
              </span>
            </div>
          ) : user ? (
            <div
              className={`${expanded ? "rounded-lg border border-ndmu-green-800 bg-ndmu-green-900 px-3 py-3" : "flex flex-col items-center gap-2"}`}
            >
              <p
                className={
                  expanded
                    ? "truncate text-xs font-bold text-white"
                    : "grid h-10 w-10 place-items-center rounded-full bg-ndmu-green-700 text-xs font-black text-white"
                }
              >
                {expanded ? user.full_name : userInitials || "?"}
              </p>
              <p
                className={
                  expanded
                    ? "mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-ndmu-gold-300"
                    : "sr-only"
                }
              >
                {user.role?.replaceAll("_", " ")}
              </p>
              <NavLink
                to="/account/password"
                aria-label="Update password"
                title={!expanded ? "Update password" : undefined}
                className={`${expanded ? "mt-3 w-full gap-1.5 rounded-md border border-emerald-100/15 bg-white/5 px-2 py-2 text-[10px]" : "h-10 w-10 rounded-lg text-sm"} inline-flex items-center justify-center font-bold uppercase tracking-wide text-emerald-50 transition hover:bg-white/10`}
              >
                <span className="material-symbols-outlined text-sm">key</span>
                <span className={expanded ? "" : "sr-only"}>
                  Update password
                </span>
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                aria-label="Sign out"
                title={!expanded ? "Sign out" : undefined}
                className={`${expanded ? "mt-2 w-full gap-1.5 rounded-md border border-rose-300/20 bg-rose-500/10 px-2 py-2 text-[10px]" : "h-10 w-10 rounded-lg text-sm text-rose-100 hover:bg-rose-500/20"} inline-flex items-center justify-center font-bold uppercase tracking-wide transition`}
              >
                <span className="material-symbols-outlined text-sm">
                  logout
                </span>
                <span className={expanded ? "" : "sr-only"}>Sign out</span>
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              aria-label="Sign in"
              title={!expanded ? "Sign in" : undefined}
              className={`${expanded ? "block rounded-lg bg-ndmu-green-900 px-3 py-3 text-xs leading-5 text-emerald-100/75" : "grid h-12 place-items-center rounded-lg text-emerald-100/75 hover:bg-ndmu-green-800"}`}
            >
              <span
                className={expanded ? "" : "material-symbols-outlined text-xl"}
              >
                {expanded
                  ? "Sign in to view and manage your submitted requests."
                  : "login"}
              </span>
            </NavLink>
          )}
          <p
            className={`${expanded ? "mt-3 text-center text-[10px] text-emerald-100/35" : "sr-only"}`}
          >
            NDMU ICT-MIS Helpdesk v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
