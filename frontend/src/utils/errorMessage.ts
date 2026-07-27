type ApiErrorBody = {
    message?: string;
    error?: string;
    code?: string;
    requestId?: string;
    path?: string;
};

type ApiErrorLike = {
    response?: {
        data?: ApiErrorBody | string | null;
        status?: number;
    };
    message?: string;
};

const STATUS_MESSAGES: Record<number, string> = {
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

const TECHNICAL_PATTERNS = [
    /sql/i, /jdbc/i, /hibernate/i, /driver/i, /column/i,
    /database/i, /select .+ from/i, /insert into/i, /update .+ set/i,
    /delete from/i, /exception/i, /traceback/i, /stacktrace/i,
    /at\s+\S+\.\S+\(/i, /\s+\.\s+java:/i
];

const looksTechnical = (msg: string): boolean =>
    TECHNICAL_PATTERNS.some((p) => p.test(msg));

export const getErrorMessage = (error: unknown, fallback: string): string => {
    const apiError = error as ApiErrorLike;
    const data = apiError?.response?.data;
    const status = apiError?.response?.status;

    const knownStatusMsg = status && STATUS_MESSAGES[status] ? STATUS_MESSAGES[status] : null;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const candidate = data.message || data.error || data.code || '';
        if (candidate && !looksTechnical(candidate)) {
            return candidate;
        }
    }

    if (knownStatusMsg) {
        return knownStatusMsg;
    }

    const rawMessage = apiError?.message;
    if (rawMessage && !rawMessage.includes('undefined') && !rawMessage.includes('null') && !looksTechnical(rawMessage)) {
        return rawMessage;
    }

    return knownStatusMsg || fallback;
};
