import axios from 'axios';

const TOKEN_KEY = 'ndmu_access_token';
const USER_KEY = 'ndmu_user';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
export const setAccessToken = (token, persistent = true) => (persistent ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
export const setStoredUser = (user, persistent = true) => (persistent ? localStorage : sessionStorage).setItem(USER_KEY, JSON.stringify(user));
export const getStoredUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'null'); } catch { return null; } };
export const clearAccessToken = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); };

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => { const token = getAccessToken(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, (error) => { if (error.response?.status === 401) clearAccessToken(); return Promise.reject(error); });
export default api;
