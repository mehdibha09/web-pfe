import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export const statusColor = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'ACTIVE':
        case 'SUCCESS':
        case 'OK':
        case 'RUNNING':
            return { bg: '#E0F1E6', fg: '#2E7A4F', icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#2E7A4F' }} /> };
        case 'INACTIVE':
        case 'FAILED':
        case 'DOWN':
        case 'ERROR':
            return { bg: '#F7DEE3', fg: '#A23B4E', icon: <ErrorIcon sx={{ fontSize: 16, color: '#C95B6E' }} /> };
        case 'DEPLOYING':
        case 'PENDING':
        case 'PROVISIONING':
            return { bg: '#F7ECD6', fg: '#8A6A2E', icon: <WarningAmberIcon sx={{ fontSize: 16, color: '#8A6A2E' }} /> };
        default:
            return { bg: '#F3F4F6', fg: '#6B7280', icon: <CloudQueueIcon sx={{ fontSize: 16, color: '#6B7280' }} /> };
    }
};

export const resourceColor = (pct: number) => {
    if (pct >= 90) return '#C95B6E';
    if (pct >= 75) return '#8A6A2E';
    return '#2E7A4F';
};
