import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { C} from '../../../theme/tokens';

type NotificationHeaderProps = {
    unreadCount: number;
    onMarkAllAsRead: () => void;
};

const NotificationHeader = ({ unreadCount, onMarkAllAsRead }: NotificationHeaderProps) => {
    const { t } = useTranslation();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <NotificationsActiveIcon sx={{ color: C.brand, fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {t('notifications.title')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: C.muted }}>
                        {t('notifications.subtitle')}
                    </Typography>
                </Box>
            </Box>
            {unreadCount > 0 && (
                <Button
                    variant="contained"
                    startIcon={<MarkEmailReadIcon />}
                    onClick={onMarkAllAsRead}
                    sx={{
                        backgroundColor: C.brand,
                        '&:hover': { backgroundColor: '#C95B6E' },
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2
                    }}
                >
                    {t('notifications.markAllRead', { count: unreadCount })}
                </Button>
            )}
        </Box>
    );
};

export default NotificationHeader;
