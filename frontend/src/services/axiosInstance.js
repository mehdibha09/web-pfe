import { clearSession, getAccessToken, getRefreshToken, setSessionTokens } from './authStorage';

const API_BASE_URL = (() => {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const apiHost = import.meta.env.VITE_API_HOST || 'localhost';
  const apiPort = import.meta.env.VITE_API_PORT || '7070';
  const apiPath = (import.meta.env.VITE_API_PATH || '/api/v1').replace(/^\/+/, '/');

  return `http://${apiHost}:${apiPort}${apiPath}`.replace(/\/$/, '');
})();

// ── Refresh state ────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = []; // { resolve, reject }[]

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// ── Core refresh call (no interceptor – plain fetch to avoid loops) ──────────
const refreshTokens = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw new Error('Refresh failed');

  const data = await response.json();
  setSessionTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

// ── Error helper ─────────────────────────────────────────────────────────────
const toError = async (response) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const message = data?.message || `Request failed with status ${response.status}`;
  const error = new Error(message);
  error.response = { status: response.status, data };
  return error;
};

// ── Main request (with automatic 401 → refresh → retry) ─────────────────────
const request = async (method, url, payload, _retry = false) => {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });

  // ── Happy path ───────────────────────────────────────────────────────────
  if (response.ok) {
    if (response.status === 204) return { data: null };
    const text = await response.text();
    return { data: text ? JSON.parse(text) : null };
  }

  // ── Not a 401, or already retried → throw ───────────────────────────────
  if (response.status !== 401 || _retry) {
    throw await toError(response);
  }

  // ── 401: try to refresh ──────────────────────────────────────────────────
  if (isRefreshing) {
    // Another refresh is in flight – queue this request and wait
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (newToken) => resolve(request(method, url, payload, true)),
        reject,
      });
    });
  }

  isRefreshing = true;

  try {
    const newAccessToken = await refreshTokens();
    processQueue(null, newAccessToken);
    return request(method, url, payload, true); // retry original
  } catch (err) {
    processQueue(err);
    clearSession();
    window.location.href = '/login'; // or your router's redirect
    throw err;
  } finally {
    isRefreshing = false;
  }
};

// ── Public API ───────────────────────────────────────────────────────────────
const axiosInstance = {
  get: (url) => request('GET', url),
  post: (url, payload) => request('POST', url, payload),
  put: (url, payload) => request('PUT', url, payload),
  delete: (url, payload) => request('DELETE', url, payload),
};

export default axiosInstance;
