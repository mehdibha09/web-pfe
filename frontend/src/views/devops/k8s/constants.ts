export const POLL_INTERVAL_MS = 5000;
export const MAX_REPLICAS = 50;
export const CPU_REGEX = /^(\d+m|\d+(\.\d+)?)$/;
export const MEMORY_REGEX = /^(\d+Mi|\d+Gi)$/;

export const STATUS_FILTERS = ['All', 'RUNNING', 'PENDING', 'FAILED', 'SUCCEEDED', 'UNKNOWN'] as const;
export type StatusFilter = typeof STATUS_FILTERS[number];

export const PROTOCOLS = ['TCP', 'UDP', 'HTTP'] as const;
export const IMAGE_PULL_POLICIES = ['IfNotPresent', 'Always', 'Never'] as const;
export const SERVICE_TYPES = ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'] as const;
export const RESTART_POLICIES = ['Always', 'OnFailure', 'Never'] as const;

import { BTN, C } from '../../../theme/tokens';
export { BTN, C };

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    CREATED: { bg: '#FCE7F3', fg: '#BE185D' },
    RUNNING: { bg: '#E0F1E6', fg: '#2E7A4F' },
    PENDING: { bg: '#F7ECD6', fg: '#8A6A2E' },
    SCALED: { bg: '#F7ECD6', fg: '#8A6A2E' },
    RESTARTED: { bg: '#E4E7F4', fg: '#3E468A' },
    FAILED: { bg: '#F7DEE3', fg: '#A23B4E' },
    SUCCEEDED: { bg: '#E0F1E6', fg: '#2E7A4F' },
    UNKNOWN: { bg: '#F3F4F6', fg: '#374151' }
};

export const POD_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    Running: { bg: '#E0F1E6', fg: '#2E7A4F' },
    Pending: { bg: '#F7ECD6', fg: '#8A6A2E' },
    Succeeded: { bg: '#FCE7F3', fg: '#BE185D' },
    Failed: { bg: '#F7DEE3', fg: '#A23B4E' },
    Unknown: { bg: '#F3F4F6', fg: '#374151' }
};

export const IMAGE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(:[a-z0-9._-]+)?$/;

export const fmtDate = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export interface EnvVar {
    key: string;
    value: string;
}
