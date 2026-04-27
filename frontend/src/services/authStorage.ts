import type { AuthUser } from './authService';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';
const PENDING_2FA_KEY = 'pendingTwoFactorSession';

type PendingTwoFactorSession = {
  email: string;
};

export const saveSession = (accessToken: string, refreshToken: string, user: AuthUser) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.removeItem(PENDING_2FA_KEY);
  window.dispatchEvent(new Event('authUserUpdated'));
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(PENDING_2FA_KEY);
  window.dispatchEvent(new Event('authUserUpdated'));
};

export const setPendingTwoFactorSession = (session: PendingTwoFactorSession) => {
  sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(session));
};

export const getPendingTwoFactorSession = (): PendingTwoFactorSession | null => {
  const raw = sessionStorage.getItem(PENDING_2FA_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingTwoFactorSession;
  } catch (_error) {
    return null;
  }
};

export const clearPendingTwoFactorSession = () => {
  sessionStorage.removeItem(PENDING_2FA_KEY);
};

export const setStoredUser = (user: AuthUser) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('authUserUpdated'));
};

export const setSessionTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const isAuthenticated = () => Boolean(getAccessToken());

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch (_error) {
    return null;
  }
};
