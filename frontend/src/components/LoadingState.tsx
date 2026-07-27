import { Box, Typography } from '@mui/material';
import SkeletonCard from './SkeletonCard';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStateProps {
    message?: string;
    variant?: 'card' | 'centered';
}

const LoadingState = ({ message = 'Loading…', variant = 'card' }: LoadingStateProps) => {
    if (variant === 'centered') {
        return <LoadingSpinner size={28} message={message} variant="block" />;
    }

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
            ))}
        </Box>
    );
};

export default LoadingState;
