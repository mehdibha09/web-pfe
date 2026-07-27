export const C = {
    bg: '#FFF3F8',
    surface: '#FFFFFF',
    border: '#F6DDE7',
    brand: '#E4477D',
    brandLight: '#FCE7F3',
    brandDark: '#BE185D',
    danger: '#C95B6E',
    dangerLight: '#FBEEF1',
    text: '#27323F',
    muted: '#5E6E7E',
    subtle: '#90A0AE'
};

export const PAGE_BG = 'linear-gradient(180deg, #FFFDFE 0%, #FFF5F9 100%)';

export type ColorEntry = { bg: string; color: string };

// ── Button gradients ─────────────────────────────────────────────────────────
export const BTN = {
    primary: {
        gradient: 'linear-gradient(135deg, #E4477D, #BE185D)',
        gradientHover: 'linear-gradient(135deg, #BE185D, #9D174D)'
    },
    danger: {
        gradient: 'linear-gradient(135deg, #DE8295, #C95B6E)',
        gradientHover: 'linear-gradient(135deg, #C95B6E, #B14A5C)'
    },
    success: {
        gradient: 'linear-gradient(135deg, #5FB985, #3F9B66)',
        gradientHover: 'linear-gradient(135deg, #3F9B66, #2F8553)'
    },
    warning: {
        gradient: 'linear-gradient(135deg, #E2A965, #C98A3E)',
        gradientHover: 'linear-gradient(135deg, #C98A3E, #B3772F)'
    }
};

export const SEVERITY_COLORS: Record<string, ColorEntry> = {
    INFO: { bg: '#E4EEF7', color: '#2E5C8A' },
    WARN: { bg: '#F7ECD6', color: '#8A6A2E' },
    CRITICAL: { bg: '#F7DEE3', color: '#A23B4E' }
};

export const ALERT_STATUS_COLORS: Record<string, ColorEntry> = {
    OPEN: { bg: '#F7DEE3', color: '#A23B4E' },
    ACK: { bg: '#F7ECD6', color: '#8A6A2E' },
    RESOLVED: { bg: '#E0F1E6', color: '#2E7A4F' }
};

export const DEPLOYMENT_STATUS_COLORS: Record<string, ColorEntry> = {
    PENDING: { bg: '#F7ECD6', color: '#8A6A2E' },
    IN_PROGRESS: { bg: '#E4EEF7', color: '#2E5C8A' },
    COMPLETED: { bg: '#E0F1E6', color: '#2E7A4F' },
    FAILED: { bg: '#F7DEE3', color: '#A23B4E' },
    ROLLED_BACK: { bg: '#E4E7F4', color: '#3E468A' }
};

export const BACKUP_STATUS_COLORS: Record<string, ColorEntry> = {
    COMPLETED: { bg: '#E0F1E6', color: '#2E7A4F' },
    RESTORED: { bg: '#E4EEF7', color: '#2E5C8A' },
    FAILED: { bg: '#F7DEE3', color: '#A23B4E' }
};

export const BACKUP_TYPE_COLORS: Record<string, ColorEntry> = {
    MANUAL: { bg: '#FCE7F3', color: '#E4477D' },
    AUTOMATIC: { bg: '#E4E7F4', color: '#3E468A' }
};

export const NOTIFICATION_TYPE_COLORS: Record<string, ColorEntry> = {
    DEPLOYMENT: { bg: '#E4EEF7', color: '#2E5C8A' },
    ALERT: { bg: '#F7DEE3', color: '#A23B4E' },
    SYSTEM: { bg: '#E4E7F4', color: '#3E468A' },
    QUOTA: { bg: '#F7ECD6', color: '#8A6A2E' },
    BACKUP: { bg: '#E0F1E6', color: '#2E7A4F' },
    VM: { bg: '#E9E6F6', color: '#5E4B9E' },
    K8S: { bg: '#FCE7F3', color: '#E4477D' }
};

export const MODE_COLORS: Record<string, ColorEntry> = {
    VM: { bg: '#E9E6F6', color: '#5E4B9E' },
    SERVICE: { bg: '#E4EEF7', color: '#2E5C8A' }
};
