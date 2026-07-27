import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { C} from '../../../theme/tokens';

type NotificationStatsProps = {
    totalCount: number;
    unreadCount: number;
    filter: 'all' | 'unread';
    onFilterChange: (filter: 'all' | 'unread') => void;
};

const NotificationStats = ({ totalCount, unreadCount, filter, onFilterChange }: NotificationStatsProps) => {
    const { t } = useTranslation();
    return (
        <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
            <Card
                sx={{
                    flex: 1,
                    cursor: 'pointer',
                    border: filter === 'all' ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                    backgroundColor: filter === 'all' ? '#F8F5FA' : '#FFFFFF',
                    borderRadius: 3,
                    '&:hover': { boxShadow: '0 4px 20px rgba(228,71,125,0.12)' },
                    transition: 'all 0.2s'
                }}
                onClick={() => onFilterChange('all')}
            >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            backgroundColor: '#E4EEF7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <NotificationsNoneIcon sx={{ color: '#2E5C8A' }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: C.text }}>
                            {totalCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('notifications.total')}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            <Card
                sx={{
                    flex: 1,
                    cursor: 'pointer',
                    border: filter === 'unread' ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                    backgroundColor: filter === 'unread' ? '#F8F5FA' : '#FFFFFF',
                    borderRadius: 3,
                    '&:hover': { boxShadow: '0 4px 20px rgba(228,71,125,0.12)' },
                    transition: 'all 0.2s'
                }}
                onClick={() => onFilterChange('unread')}
            >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            backgroundColor: '#F7DEE3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <WarningAmberIcon sx={{ color: '#C95B6E' }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: C.text }}>
                            {unreadCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: C.muted }}>
                            {t('notifications.unread')}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default NotificationStats;
