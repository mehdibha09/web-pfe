import { clearSession, getStoredUser } from './authStorage';

const API_BASE_URL = (() => {
    const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (explicitBaseUrl) {
        return explicitBaseUrl.replace(/\/$/, '');
    }

    const apiHost = import.meta.env.VITE_API_HOST || 'localhost';
    const apiPort = import.meta.env.VITE_API_PORT || '6060';
    const apiPath = (import.meta.env.VITE_API_PATH || '/api/v1').replace(/^\/+/, '/');

    return `http://${apiHost}:${apiPort}${apiPath}`.replace(/\/$/, '');
})();

// ── Refresh state ────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: () => void; reject: (err: Error) => void }[] = [];

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

const processQueue = (error: Error | null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    failedQueue = [];
};

// ── Core refresh call (no interceptor – plain fetch to avoid loops) ──────────
const refreshTokens = async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...buildClientHeaders() }
    });

    if (!response.ok) throw new Error('Refresh failed');
    await response.json();
};

// ── Pagination meta ──────────────────────────────────────────────────────────
interface PaginationMeta {
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

// ── Error helper ─────────────────────────────────────────────────────────────
interface ErrorResponse {
    message?: string;
    error?: string;
    code?: string;
    requestId?: string;
    [key: string]: any;
}

class AxiosError extends Error {
    response?: { status: number; data: ErrorResponse | null };
}

const STATUS_FALLBACKS: Record<number, string> = {
    400: 'Requête invalide',
    401: 'Non authentifié — veuillez vous reconnecter',
    403: 'Accès refusé — vous n\'avez pas les permissions nécessaires',
    404: 'Ressource introuvable',
    409: 'Conflit — la ressource existe déjà',
    422: 'Données invalides',
    429: 'Trop de requêtes — veuillez réessayer plus tard',
    500: 'Erreur serveur interne',
    502: 'Service temporairement indisponible',
    503: 'Service indisponible',
};

const toError = async (response: Response): Promise<AxiosError> => {
    let data: ErrorResponse | null = null;
    let rawText: string | null = null;

    try {
        rawText = await response.text();
        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            data = null;
        }
    } catch {
        data = null;
        rawText = null;
    }

    const statusFallback = STATUS_FALLBACKS[response.status] || `Request failed with status ${response.status}`;
    const message = data?.message || data?.error || rawText || statusFallback;
    const error = new AxiosError(message);
    error.response = { status: response.status, data };
    return error;
};

// ── Main request (with automatic 401 → refresh → retry) ─────────────────────
const REQUEST_TIMEOUT_MS = 30_000;

const request = async <T = any>(
    method: string,
    url: string,
    payload?: any,
    _retry: boolean = false
): Promise<{ data: T; pagination?: PaginationMeta }> => {
    const hasSession = !!getStoredUser();
    const fullUrl = `${API_BASE_URL}${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(fullUrl, {
            method,
            signal: controller.signal,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...buildClientHeaders()
            },
            ...(payload !== undefined ? { body: JSON.stringify(payload) } : {})
        });
    } catch (networkError) {
        clearTimeout(timeoutId);
        const isNetworkError = networkError instanceof TypeError
            && (networkError.message?.includes('fetch') || networkError.message?.includes('network'));
        const isTimeout = networkError instanceof DOMException && networkError.name === 'AbortError';
        const error = new AxiosError(
            isTimeout
                ? 'La requête a expiré — veuillez réessayer'
                : isNetworkError
                    ? 'Impossible de contacter le serveur — vérifiez votre connexion'
                    : `Erreur réseau : ${(networkError as Error).message}`
        );
        error.response = { status: 0, data: null };
        throw error;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
        console.debug('[axiosInstance] request failed', {
            method,
            url,
            fullUrl,
            status: response.status,
            hasSession,
            retryAttempt: _retry
        });
    }

    // ── Happy path ───────────────────────────────────────────────────────────
    if (response.ok) {
        if (response.status === 204) return { data: null as T };
        const text = await response.text();
        let parsed: unknown = text || null;
        if (text) {
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = text;
            }
        }
        const isPage = parsed && typeof parsed === 'object' && 'content' in (parsed as Record<string, unknown>) && Array.isArray((parsed as Record<string, unknown>).content);
        if (isPage) {
            const page = parsed as Record<string, unknown>;
            return {
                data: page.content as T,
                pagination: {
                    totalElements: page.totalElements as number,
                    totalPages: page.totalPages as number,
                    page: page.number as number,
                    size: page.size as number
                }
            };
        }
        return { data: parsed as T };
    }

    // ── Not a 401, or already retried, or no signed-in user → throw ──────────
    if (response.status !== 401 || _retry || !hasSession) {
        throw await toError(response);
    }

    // ── 401: try to refresh via HttpOnly cookie ──────────────────────────────
    if (isRefreshing) {
        // Another refresh is in flight – queue this request and wait
        return new Promise((resolve, reject) => {
            failedQueue.push({
                resolve: () => resolve(request(method, url, payload, true)),
                reject
            });
        });
    }

    isRefreshing = true;

    try {
        await refreshTokens();
        processQueue(null);
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
    delete: <T = any>(url: string, payload?: any) => request<T>('DELETE', url, payload)
};

export default axiosInstance;
export type { PaginationMeta };
