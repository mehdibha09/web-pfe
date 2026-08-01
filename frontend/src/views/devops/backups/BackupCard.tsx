import { Box, Card, CardActions, CardContent, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import BackupIcon from '@mui/icons-material/Backup';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreAltIcon from '@mui/icons-material/Restore';
import StorageIcon from '@mui/icons-material/Storage';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ComputerIcon from '@mui/icons-material/Computer';
import type { Backup } from '../../../services/interfaces/backup';
import { C, BACKUP_STATUS_COLORS, BACKUP_TYPE_COLORS } from '../../../theme/tokens';
import { fmtDateTime } from '../../../utils/format';

interface BackupCardProps {
    backup: Backup;
    vmNameById: Record<string, string>;
    seDisplayNameById: Record<string, string>;
    allowManage: boolean;
    onRestore: (id: string) => void;
    onDelete: (backup: Backup) => void;
}

const getBannerGrad = (status: string) => {
    switch (status) {
        case 'COMPLETED':
            return 'linear-gradient(90deg, #5FB985, #3F9B66)';
        case 'RESTORED':
            return 'linear-gradient(90deg, #38BDF8, #0EA5E9)';
        case 'FAILED':
            return 'linear-gradient(90deg, #F87171, #EF4444)';
        default:
            return 'linear-gradient(90deg, #E4477D, #BE185D)';
    }
};

const formatSize = (sizeMb: number | null | undefined): string => {
    if (sizeMb == null || sizeMb <= 0) return '\u2014';
    if (sizeMb >= 1024) return `${(sizeMb / 1024).toFixed(2)} GB`;
    return `${sizeMb} MB`;
};

const BackupCard = ({ backup, vmNameById, seDisplayNameById, allowManage, onRestore, onDelete }: BackupCardProps) => {
    const { t } = useTranslation();
    const statusColors = BACKUP_STATUS_COLORS[backup.status] ?? { bg: '#F3F4F6', color: '#374151' };
    const typeColors = BACKUP_TYPE_COLORS[backup.type] ?? { bg: '#F3F4F6', color: '#374151' };
    const bannerGrad = getBannerGrad(backup.status);

    return (
        <Card
            sx={{
                borderRadius: 3,
                position: 'relative',
                overflow: 'visible',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(228,71,125,0.1)' }
            }}
        >
            <Box
                sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: bannerGrad,
                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                }}
            />
            <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BackupIcon sx={{ color: C.brand, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                                {t('backups.backup')}
                            </Typography>
                            <Typography sx={{ color: C.muted, fontSize: 12, fontFamily: 'monospace' }}>
                                {vmNameById[backup.vmId] ?? backup.vmId}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <Chip
                            label={backup.type}
                            size="small"
                            sx={{ backgroundColor: typeColors.bg, color: typeColors.color, fontWeight: 700, height: 20, fontSize: 10 }}
                        />
                        <Chip
                            label={backup.status}
                            size="small"
                            sx={{ backgroundColor: statusColors.bg, color: statusColors.color, fontWeight: 700, height: 20, fontSize: 10 }}
                        />
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StorageIcon sx={{ fontSize: 13 }} /> {t('backups.size')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{formatSize(backup.sizeMb)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarTodayIcon sx={{ fontSize: 13 }} /> {t('backups.created')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>{fmtDateTime(backup.createdAt) ?? '\u2014'}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ComputerIcon sx={{ fontSize: 13 }} /> {t('backups.serviceEnvironment')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>
                            {seDisplayNameById[backup.serviceEnvironmentId] ?? '\u2014 / \u2014'}
                        </Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {t('backups.file')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {backup.filePath}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
                {backup.status === 'COMPLETED' && (
                    <Box component="button" onClick={() => onRestore(backup.id)} sx={{ fontSize: 12, fontWeight: 700, color: C.brandDark, border: `1px solid ${C.border}`, borderRadius: 2, px: 1.5, py: 0.5, backgroundColor: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { backgroundColor: C.brandLight, borderColor: C.brandDark } }}>
                        <RestoreAltIcon sx={{ fontSize: 14 }} />
                        {t('backups.restore')}
                    </Box>
                )}
                {allowManage && (
                    <Box component="button" onClick={() => onDelete(backup)} sx={{ fontSize: 12, fontWeight: 700, color: C.danger, border: `1px solid ${C.border}`, borderRadius: 2, px: 1.5, py: 0.5, backgroundColor: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { backgroundColor: C.dangerLight, borderColor: C.danger } }}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                        {t('common.delete')}
                    </Box>
                )}
            </CardActions>
        </Card>
    );
};

export default BackupCard;
