import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import {
    Alert,
    Box,
    Chip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { type NotificationResponse } from '../../../services/notificationService';
import { C, NOTIFICATION_TYPE_COLORS } from '../../../theme/tokens';

type NotificationTableProps = {
    displayed: NotificationResponse[];
    filter: 'all' | 'unread';
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
};

const NotificationTable = ({ displayed, filter, onMarkAsRead, onDelete }: NotificationTableProps) => {
    const { t } = useTranslation();
    if (displayed.length === 0) {
        return (
            <Alert
                severity="info"
                sx={{
                    borderRadius: 3,
                    border: '1px solid #E4EEF7',
                    backgroundColor: '#E4EEF7'
                }}
            >
                {filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}
            </Alert>
        );
    }

    return (
        <TableContainer
            sx={{
                borderRadius: 3,
                border: `1px solid ${C.border}`,
                boxShadow: '0 4px 20px rgba(228,71,125,0.06)'
            }}
        >
            <Table sx={{ minWidth: 760 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t('common.status')}</TableCell>
                        <TableCell>{t('notifications.type')}</TableCell>
                        <TableCell>{t('notifications.title')}</TableCell>
                        <TableCell>{t('notifications.message')}</TableCell>
                        <TableCell>{t('common.date')}</TableCell>
                        <TableCell align="right">
                            {t('common.actions')}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {displayed.map((n) => {
                        const tc = NOTIFICATION_TYPE_COLORS[n.type] || NOTIFICATION_TYPE_COLORS.SYSTEM;
                        return (
                            <TableRow
                                key={n.id}
                                sx={{
                                    backgroundColor: n.read ? '#FFFFFF' : C.unread,
                                    '&:hover': { backgroundColor: C.rowHover }
                                }}
                            >
                                <TableCell>
                                    {n.read ? (
                                        <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 20 }} />
                                    ) : (
                                        <NotificationsActiveIcon sx={{ color: C.brand, fontSize: 20 }} />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={n.type}
                                        size="small"
                                        sx={{
                                            backgroundColor: tc.bg,
                                            color: tc.color,
                                            fontWeight: 700,
                                            fontSize: 11
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 700 }}>
                                        {n.title}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: C.muted,
                                            maxWidth: 300,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {n.message}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" sx={{ color: C.muted }}>
                                        {new Date(n.createdAt).toLocaleString()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    {!n.read && (
                                        <Tooltip title={t('notifications.markAsRead')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onMarkAsRead(n.id)}
                                                sx={{ color: C.brand }}
                                            >
                                                <MarkEmailReadIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title={t('common.delete')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => onDelete(n.id)}
                                            sx={{ color: '#C95B6E' }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default NotificationTable;
