import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import AppSidebar from "./components/AppSidebar";

import Home from "./home/Home";
import Login from "./account/Login";
import Setup from "./account/Setup";
import UpdatePassword from "./account/UpdatePassword";
import SubmitTicket from "./tickets/SubmitTicket";
import GuestTrack from "./tickets/GuestTrack";
import MyTickets from "./account/MyTickets";
import TicketDetail from "./tickets/TicketDetail";
import KnowledgeBase from "./knowledge-base/KnowledgeBase";
import KbArticle from "./knowledge-base/KbArticle";

// Dedicated Staff Work Queue Pages
import StaffDashboard from "./dashboard/StaffDashboard";
import StaffMyTickets from "./tickets/StaffMyTickets";
import StaffUnassigned from "./tickets/StaffUnassigned";
import StaffAllTickets from "./tickets/StaffAllTickets";
import Reports from "./dashboard/Reports";

// Dedicated Admin Module Pages
import AdminCatalog from "./administration/AdminCatalog";
import AdminUsers from "./administration/AdminUsers";
import AdminTeams from "./administration/AdminTeams";
import AdminLocations from "./administration/AdminLocations";
import AdminSettings from "./administration/AdminSettings";
import AdminAnnouncements from "./administration/AdminAnnouncements";
import AdminAssets from "./administration/AdminAssets";

// Protected Route for Staff
const StaffRoute = ({ children }) => {
  const { user, isStaff, loading } = useAuth();
  if (loading) return null;
  if (!user || !isStaff) return <Navigate to="/login" replace />;
  return children;
};

const AccountRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Protected Route for Admin
const AdminRoute = ({ children }) => {
  const { user, isAdmin, isTeamLeader, loading } = useAuth();
  if (loading) return null;
  if (!user || (!isAdmin && !isTeamLeader))
    return <Navigate to="/staff/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("ndmu_sidebar_open") !== "false",
  );
  const toggleSidebar = () => {
    setSidebarOpen((current) => {
      localStorage.setItem("ndmu_sidebar_open", String(!current));
      return !current;
    });
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-50 text-slate-800">
      <AppSidebar isOpen={sidebarOpen} />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="app-content-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <Routes>
            {/* Public & Requestor Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route
              path="/account/password"
              element={
                <AccountRoute>
                  <UpdatePassword />
                </AccountRoute>
              }
            />
            <Route path="/submit" element={<SubmitTicket />} />
            <Route path="/track" element={<GuestTrack />} />
            <Route path="/guest/ticket/:token" element={<GuestTrack />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/tickets/:identifier" element={<TicketDetail />} />
            <Route path="/kb" element={<KnowledgeBase />} />
            <Route path="/kb/:slug" element={<KbArticle />} />

            {/* Distinct Staff Work Queue Routes */}
            <Route
              path="/staff/dashboard"
              element={
                <StaffRoute>
                  <StaffDashboard />
                </StaffRoute>
              }
            />
            <Route
              path="/staff/my-tickets"
              element={
                <StaffRoute>
                  <StaffMyTickets />
                </StaffRoute>
              }
            />
            <Route
              path="/staff/unassigned"
              element={
                <StaffRoute>
                  <StaffUnassigned />
                </StaffRoute>
              }
            />
            <Route
              path="/staff/all-tickets"
              element={
                <StaffRoute>
                  <StaffAllTickets />
                </StaffRoute>
              }
            />
            <Route
              path="/staff/reports"
              element={
                <StaffRoute>
                  <Reports />
                </StaffRoute>
              }
            />

            {/* Distinct Admin Module Routes */}
            <Route
              path="/admin/catalog"
              element={
                <AdminRoute>
                  <AdminCatalog />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/teams"
              element={
                <AdminRoute>
                  <AdminTeams />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/locations"
              element={
                <AdminRoute>
                  <AdminLocations />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={<Navigate to="/admin/locations" replace />}
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <AdminRoute>
                  <AdminAnnouncements />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/assets"
              element={
                <AdminRoute>
                  <AdminAssets />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
