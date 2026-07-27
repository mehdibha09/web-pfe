import { C } from '../../../theme/tokens';
export { C };

export const ENV_COLORS: Record<string, { bg: string; fg: string }> = {
    production: { bg: '#F7ECD6', fg: '#8A6A2E' },
    prod: { bg: '#F7ECD6', fg: '#8A6A2E' },
    staging: { bg: '#E0F1E6', fg: '#2E7A4F' },
    stage: { bg: '#E0F1E6', fg: '#2E7A4F' },
    dev: { bg: '#E4EEF7', fg: '#2E5C8A' },
    development: { bg: '#E4EEF7', fg: '#2E5C8A' },
    test: { bg: '#F3E8FF', fg: '#6B21A8' }
};

export const envChipColor = (name: string) =>
    ENV_COLORS[name.toLowerCase()] ?? { bg: C.brandLight, fg: C.brand };

export const fmtDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
