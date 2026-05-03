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
let failedQueue: { resolve: (token: string) => void; reject: (err: Error) => void }[] = [];

const buildClientHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      headers['X-Client-Timezone'] = timezone;
    }
  } catch {
    // noop
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    headers['Accept-Language'] = navigator.language;
  }

  return headers;
};

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

// ── Core refresh call (no interceptor – plain fetch to avoid loops) ──────────
const refreshTokens = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildClientHeaders() },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw new Error('Refresh failed');

  const data = await response.json();
  setSessionTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

// ── Error helper ─────────────────────────────────────────────────────────────
interface ErrorResponse {
  message?: string;
  [key: string]: any;
}

class AxiosError extends Error {
  response?: { status: number; data: ErrorResponse | null };
}

const toError = async (response: Response): Promise<AxiosError> => {
  let data: ErrorResponse | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const message = data?.message || `Request failed with status ${response.status}`;
  const error = new AxiosError(message);
  error.response = { status: response.status, data };
  return error;
};

// ── Main request (with automatic 401 → refresh → retry) ─────────────────────
const request = async <T = any>(
  method: string,
  url: string,
  payload?: any,
  _retry: boolean = false,
): Promise<{ data: T }> => {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...buildClientHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });

  // ── Happy path ───────────────────────────────────────────────────────────
  if (response.ok) {
    if (response.status === 204) return { data: null as T };
    const text = await response.text();
    return { data: (text ? JSON.parse(text) : null) as T };
  }

  // ── Not a 401, or already retried, or public request without token → throw
  if (response.status !== 401 || _retry || !token) {
    throw await toError(response);
  }

  // ── 401: try to refresh ──────────────────────────────────────────────────
  if (isRefreshing) {
    // Another refresh is in flight – queue this request and wait
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: () => resolve(request(method, url, payload, true)),
        reject,
      });
    });
  }

  isRefreshing = true;

  try {
    await refreshTokens();
    processQueue(null, null);
    return request(method, url, payload, true); // retry original
  } catch (err) {
    processQueue(err as Error);
    clearSession();
    window.location.href = '/login'; // or your router's redirect
    throw err;
  } finally {
    isRefreshing = false;
  }
};

// ── Public API ───────────────────────────────────────────────────────────────
const axiosInstance = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, payload?: any) => request<T>('POST', url, payload),
  patch: <T = any>(url: string, payload?: any) => request<T>('PATCH', url, payload),
  put: <T = any>(url: string, payload?: any) => request<T>('PUT', url, payload),
  delete: <T = any>(url: string, payload?: any) => request<T>('DELETE', url, payload),
};

export default axiosInstance;
