import axios from "axios";

const APP_BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
export const appPath = (path = "/") => `${APP_BASE_PATH}${path}`;

// The refresh token is intentionally HttpOnly and is never exposed to app
// code. Credentials are needed during development too, where Vite and Express
// use different localhost ports.
axios.defaults.withCredentials = true;
axios.defaults.baseURL = APP_BASE_PATH || undefined;

const TOKEN_KEY = "ndmu_access_token";
const USER_KEY = "ndmu_user";

export const getAccessToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
export const setAccessToken = (token, persistent = true) => {
  const target = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  other.removeItem(TOKEN_KEY);
  target.setItem(TOKEN_KEY, token);
};
export const setStoredUser = (user, persistent = true) => {
  const target = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  other.removeItem(USER_KEY);
  target.setItem(USER_KEY, JSON.stringify(user));
};
export const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem(USER_KEY) ||
        sessionStorage.getItem(USER_KEY) ||
        "null",
    );
  } catch {
    return null;
  }
};
export const clearAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const api = axios.create({
  baseURL: appPath("/api"),
  withCredentials: true,
});
let refreshRequest = null;

export const refreshAccessToken = async () => {
  if (!refreshRequest) {
    const persistent = Boolean(localStorage.getItem(TOKEN_KEY));
    refreshRequest = axios
      .post("/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => {
        if (!data?.accessToken) throw new Error("No access token returned.");
        setAccessToken(data.accessToken, persistent);
        if (data.user) setStoredUser(data.user, persistent);
        return data;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};
const notify = (type, message) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ndmu:toast", {
      detail: { type, message },
    }),
  );
};
const actionMessage = (method) => {
  const messages = {
    post: "Saved successfully.",
    put: "Changes saved successfully.",
    patch: "Changes saved successfully.",
    delete: "Removed successfully.",
  };
  return messages[method] || "Action completed successfully.";
};
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      notify("success", response.data?.message || actionMessage(method));
    }
    return response;
  },
  async (error) => {
    const request = error.config;
    if (
      error.response?.status === 401 &&
      request &&
      !request._retriedAfterRefresh
    ) {
      request._retriedAfterRefresh = true;
      try {
        const session = await refreshAccessToken();
        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(request);
      } catch {
        clearAccessToken();
      }
    }
    if (
      ["post", "put", "patch", "delete"].includes(
        error.config?.method?.toLowerCase(),
      )
    ) {
      notify(
        "error",
        error.response?.data?.message || "Unable to complete that action.",
      );
    }
    return Promise.reject(error);
  },
);
export default api;
