import type { ServiceResponse } from '../../../services/devopsService';
import { C} from '../../../theme/tokens';

export const statusColors: Record<string, { bg: string; color: string; border?: string }> = {
    ACTIVE: { bg: '#E0F1E6', color: '#2E7A4F', border: '#B7DCC4' },
    DISABLED: { bg: '#F7DEE3', color: '#A23B4E', border: '#E6C2C9' },
    PENDING: { bg: '#F7ECD6', color: '#8A6A2E', border: '#F7ECD6' }
};

export const pageBg = {
    minHeight: '100%',
    p: { xs: 2, md: 4 },
    background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)'
} as const;

export const cardSx = {
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
} as const;

export const getStatusColor = (status: string) =>
    statusColors[status] || { bg: C.brandLight, color: C.brand };
