import type { AuthUser } from './authService';

const USER_KEY = 'authUser';
const PENDING_2FA_KEY = 'pendingTwoFactorSession';

type PendingTwoFactorSession = {
  email: string;
};

export const saveSession = (user: AuthUser) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.removeItem(PENDING_2FA_KEY);
};

export const clearSession = () => {
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

export const isAuthenticated = () => !!getStoredUser();
