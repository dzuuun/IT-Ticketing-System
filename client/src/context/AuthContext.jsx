import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { clearAccessToken, getAccessToken, getStoredUser, setAccessToken, setStoredUser } from '../services/api';

const AuthContext = createContext(null);
const persistSession = (data, persistent = true) => { setAccessToken(data.accessToken || data.token, persistent); setStoredUser(data.user, persistent); return data.user; };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(({ data }) => { setUser(data.user); setStoredUser(data.user, Boolean(localStorage.getItem('ndmu_access_token'))); }).catch(() => { clearAccessToken(); setUser(null); }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password, persistent = true) => { const { data } = await axios.post('/auth/login', { email, password }); const loggedInUser = persistSession(data, persistent); setUser(loggedInUser); return loggedInUser; };
  const register = async (form) => { const { data } = await axios.post('/auth/register', form); const registeredUser = persistSession(data); setUser(registeredUser); return registeredUser; };
  const loginWithGoogle = () => window.location.assign('/auth/google');
  const completeGoogleLogin = async (token) => { const { data } = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }); persistSession({ accessToken: token, user: data.user }); setUser(data.user); return data.user; };
  const logout = () => { clearAccessToken(); setUser(null); };
  const isAdmin = user?.role === 'admin'; const isTeamLeader = user?.role === 'team_leader'; const isTechnician = user?.role === 'technician';
  return <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, completeGoogleLogin, logout, isAdmin, isTeamLeader, isTechnician, isStaff: isAdmin || isTeamLeader || isTechnician, isRequestor: user?.role === 'requestor' }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; };
