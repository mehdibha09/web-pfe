import { C } from '../../../theme/tokens';

export const statusColors: Record<string, { bg: string; color: string; border?: string; gradient?: string }> = {
    QUEUED: { bg: '#E4EEF7', color: '#2E5C8A', border: '#B0C4DE' },
    PENDING: { bg: '#F7ECD6', color: '#8A6A2E', border: '#F7ECD6' },
    SUCCESS: { bg: '#D1FAE5', color: '#065F46', border: '#D1FAE5' },
    FAILED: { bg: '#FCE7F3', color: '#E4477D', border: '#FCE7F3' },
    ROLLED_BACK: { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' }
};

export const STATUSES = ['QUEUED', 'PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK'] as const;
