import { Box, Card, Skeleton } from '@mui/material';

const SkeletonCard = () => (
    <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2.5 }} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                </Box>
            </Box>
            <Skeleton variant="text" width="80%" height={16} />
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="30%" height={16} sx={{ mt: 1 }} />
        </Box>
    </Card>
);

export default SkeletonCard;
