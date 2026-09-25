import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  appPath,
  clearAccessToken,
  getAccessToken,
  getStoredUser,
  refreshAccessToken,
  setAccessToken,
  setStoredUser,
} from "../services/api";

const AuthContext = createContext(null);
const persistSession = (data, persistent = true) => {
  setAccessToken(data.accessToken || data.token, persistent);
  setStoredUser(data.user, persistent);
  return data.user;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const loadCurrentUser = async () => {
      try {
        let currentToken = token;
        let response;
        try {
          response = await axios.get("/auth/me", {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
        } catch (error) {
          if (error.response?.status !== 401) throw error;
          const refreshedSession = await refreshAccessToken();
          currentToken = refreshedSession.accessToken;
          response = await axios.get("/auth/me", {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
        }
        const { data } = response;
        setUser(data.user);
        setStoredUser(
          data.user,
          Boolean(localStorage.getItem("ndmu_access_token")),
        );
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentUser();
  }, []);

  const login = async (email, password, persistent = true) => {
    const { data } = await axios.post("/auth/login", { email, password });
    const loggedInUser = persistSession(data, persistent);
    setUser(loggedInUser);
    return loggedInUser;
  };
  const register = async (form) => {
    const { data } = await axios.post("/auth/register", form);
    const registeredUser = persistSession(data);
    setUser(registeredUser);
    return registeredUser;
  };
  const completeSetup = async (form) => {
    const { data } = await axios.post("/auth/setup", form);
    const setupUser = persistSession(data);
    setUser(setupUser);
    return setupUser;
  };
  const loginWithGoogle = () => window.location.assign(appPath("/auth/google"));
  const completeGoogleLogin = async (token) => {
    const { data } = await axios.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    persistSession({ accessToken: token, user: data.user });
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    // Clear this device immediately, while also invalidating its server-side
    // refresh token when the network is available.
    void axios.post("/auth/logout").catch(() => {});
    clearAccessToken();
    setUser(null);
  };
  const isAdmin = user?.role === "admin";
  const isTeamLeader = user?.role === "team_leader";
  const isTechnician = user?.role === "technician";
  const isEncoder = user?.role === "encoder";
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        completeSetup,
        loginWithGoogle,
        completeGoogleLogin,
        logout,
        isAdmin,
        isTeamLeader,
        isTechnician,
        isEncoder,
        isStaff: isAdmin || isTeamLeader || isTechnician,
        isRequestor: user?.role === "requestor",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
