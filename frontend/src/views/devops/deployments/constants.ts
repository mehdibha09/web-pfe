export const statusColors: Record<string, { bg: string; color: string; border?: string; gradient?: string }> = {
    PENDING: { bg: '#F7ECD6', color: '#8A6A2E', border: '#F7ECD6' },
    SUCCESS: { bg: '#D1FAE5', color: '#065F46', border: '#D1FAE5' },
    FAILED: { bg: '#FCE7F3', color: '#E4477D', border: '#FCE7F3' }
};

export const STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;
