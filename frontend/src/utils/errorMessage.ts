type ApiFieldError = {
    field?: string;
    message?: string;
};

type ApiErrorBody = {
    message?: string;
    error?: string;
    code?: string;
    requestId?: string;
    path?: string;
    fields?: ApiFieldError[];
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
    /at\s+\S+\.\S+\(/i, /\s+\.\s+java:/i,
    /vagrant/i, /vboxmanage/i, /virtualbox/i, /bringing machine/i,
    /remote command failed/i, /progress:/i, /ns_error/i, /verr_/i,
    /exit=\d/i, /ssh connection/i, /default provider/i
];

const looksTechnical = (msg: string): boolean =>
    TECHNICAL_PATTERNS.some((p) => p.test(msg));

const MISSING_PERMISSION_PATTERN = /^missing required permission:\s*([A-Za-z0-9_]+)\s*$/i;

const QUOTA_EXCEEDED_PREFIX = 'Quota exceeded for this service environment:';

const CODE_MESSAGES: Record<string, string> = {
    ENVIRONMENT_NAME_ALREADY_EXISTS: 'Un environnement avec ce nom existe déjà',
    SERVICE_ENVIRONMENT_ALREADY_LINKED: 'Ce service est déjà lié à cet environnement',
};

const MESSAGE_MESSAGES: Record<string, string> = {
    'An environment with this name already exists': 'Un environnement avec ce nom existe déjà',
    'This service is already linked to this environment': 'Ce service est déjà lié à cet environnement',
};

const translateMessage = (msg: string): string => {
    const match = msg.match(MISSING_PERMISSION_PATTERN);
    if (match) {
        return `Permission requise manquante : ${match[1]}`;
    }
    if (msg.startsWith(QUOTA_EXCEEDED_PREFIX)) {
        const details = msg.slice(QUOTA_EXCEEDED_PREFIX.length).trim();
        return details ? `Quota dépassé pour cet environnement de service : ${details}` : 'Quota dépassé pour cet environnement de service';
    }
    return CODE_MESSAGES[msg] ?? MESSAGE_MESSAGES[msg] ?? msg;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
    const apiError = error as ApiErrorLike;
    const data = apiError?.response?.data;
    const status = apiError?.response?.status;

    const knownStatusMsg = status && STATUS_MESSAGES[status] ? STATUS_MESSAGES[status] : null;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const candidate = data.message || data.error || data.code || '';
        if (candidate && !looksTechnical(candidate)) {
            const fields = Array.isArray(data.fields) ? data.fields : [];
            const fieldDetails = fields
                .filter((f) => f && f.field && f.message)
                .map((f) => `• ${f.field} : ${f.message}`)
                .join('\n');
            const translated = translateMessage(candidate);
            if (fieldDetails) {
                return `${translated}\n${fieldDetails}`;
            }
            return translated;
        }
    }

    if (knownStatusMsg) {
        return knownStatusMsg;
    }

    const rawMessage = apiError?.message;
    if (rawMessage && !rawMessage.includes('undefined') && !rawMessage.includes('null') && !looksTechnical(rawMessage)) {
        return translateMessage(rawMessage);
    }

    return knownStatusMsg || fallback;
};
