import { Box, Chip, Divider, Fade, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import BackupIcon from '@mui/icons-material/Backup';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreAltIcon from '@mui/icons-material/RestartAlt';
import StorageIcon from '@mui/icons-material/Storage';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ComputerIcon from '@mui/icons-material/Computer';
import type { Backup } from '../../../services/interfaces/backup';
import { C, BACKUP_STATUS_COLORS, BACKUP_TYPE_COLORS } from '../../../theme/tokens';
import MetaRow from '../../../components/MetaRow';
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
            return 'linear-gradient(135deg, #8FCBA4 0%, #3F9B66 100%)';
        case 'RESTORED':
            return 'linear-gradient(135deg, #B9CFE6 0%, #3E6E9E 100%)';
        case 'FAILED':
            return 'linear-gradient(135deg, #E6C2C9 0%, #DE8295 100%)';
        default:
            return `linear-gradient(135deg, ${C.brandLight} 0%, #FFF 100%)`;
    }
};

const BackupCard = ({ backup, vmNameById, seDisplayNameById, allowManage, onRestore, onDelete }: BackupCardProps) => {
    const { t } = useTranslation();
    const statusColors = BACKUP_STATUS_COLORS[backup.status] ?? { bg: '#F3F4F6', color: '#374151' };
    const typeColors = BACKUP_TYPE_COLORS[backup.type] ?? { bg: '#F3F4F6', color: '#374151' };
    const bannerGrad = getBannerGrad(backup.status);

    return (
        <Fade in>
            <Box
                sx={{
                    borderRadius: 4,
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 2px 8px rgba(228,71,125,0.06)',
                    transition: 'all 0.22s ease',
                    overflow: 'hidden',
                    backgroundColor: C.surface,
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                        boxShadow: '0 8px 28px rgba(228,71,125,0.14)',
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                <Box sx={{ height: 6, background: bannerGrad }} />

                <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2.5,
                                flexShrink: 0,
                                background: bannerGrad,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
                            }}
                        >
                            <BackupIcon sx={{ color: '#fff', fontSize: 22 }} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2, mr: 'auto', fontSize: 15 }}>
                                    {t('backups.backup')}
                                </Typography>
                                <Chip
                                    label={backup.status}
                                    size="small"
                                    sx={{ backgroundColor: statusColors.bg, color: statusColors.color, fontWeight: 800, fontSize: 10, letterSpacing: '0.06em', border: `1px solid ${statusColors.color}22` }}
                                />
                                <Chip
                                    label={backup.type}
                                    size="small"
                                    sx={{ backgroundColor: typeColors.bg, color: typeColors.color, fontWeight: 800, fontSize: 10, letterSpacing: '0.06em', border: `1px solid ${typeColors.color}22` }}
                                />
                            </Box>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            mt: 2,
                            display: 'flex',
                            gap: 2,
                            '& > *': { flex: 1 }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#F9FAFB', borderRadius: 2, px: 1.5, py: 1 }}>
                            <StorageIcon sx={{ fontSize: 16, color: C.subtle }} />
                            <Box>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', lineHeight: 1 }}>{t('backups.size')}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{backup.sizeMb != null ? `${backup.sizeMb} MB` : '\u2014'}</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#F9FAFB', borderRadius: 2, px: 1.5, py: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 16, color: C.subtle }} />
                            <Box>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', lineHeight: 1 }}>{t('backups.created')}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtDateTime(backup.createdAt) ?? '\u2014'}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        mx: 2.5,
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: 2.5,
                        backgroundColor: '#F8F5FA',
                        border: `1px solid ${C.brandLight}`
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <ComputerIcon sx={{ fontSize: 15, color: C.brand }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.brand, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('backups.vmAndEnvironment')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.3 }}>{t('backups.vmId')}</Typography>
                        <Typography sx={{ fontSize: 12, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.3 }}>
                            {vmNameById[backup.vmId] ?? backup.vmId}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.3 }}>{t('backups.envId')}</Typography>
                        <Typography sx={{ fontSize: 12, color: C.text, wordBreak: 'break-all', lineHeight: 1.3 }}>
                            {seDisplayNameById[backup.serviceEnvironmentId] ?? backup.serviceEnvironmentId}
                        </Typography>
                    </Box>
                    </Box>
                </Box>

                <Box sx={{ px: 2.5, pb: 1.5 }}>
                    <Divider sx={{ mb: 1, borderColor: C.border }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                        <MetaRow label={t('backups.file')} value={backup.filePath} mono />
                        {backup.notes && <MetaRow label={t('backups.notes')} value={backup.notes} />}
                        <MetaRow label={t('backups.updated')} value={fmtDateTime(backup.updatedAt) ?? '\u2014'} />
                        {backup.restoredAt && <MetaRow label={t('backups.restored')} value={fmtDateTime(backup.restoredAt) ?? '\u2014'} />}
                    </Box>
                </Box>

                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: `1px solid ${C.border}`,
                        background: '#FAFAFA',
                        gap: 1,
                        mt: 'auto'
                    }}
                >
                    <Typography sx={{ fontSize: 11, color: C.subtle, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>
                        {backup.id}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        {backup.status === 'COMPLETED' && (
                            <Tooltip title={t('backups.restoreBackup')}>
                                <Box
                                    component="button"
                                    onClick={() => onRestore(backup.id)}
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#2E5C8A',
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 2,
                                        px: 1.5,
                                        py: 0.5,
                                        backgroundColor: C.surface,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        '&:hover': { backgroundColor: '#E4EEF7', borderColor: '#2E5C8A' }
                                    }}
                                >
                                    <RestoreAltIcon sx={{ fontSize: 14 }} />
                                    {t('backups.restore')}
                                </Box>
                            </Tooltip>
                        )}
                        {allowManage && (
                        <Tooltip title={t('backups.deleteBackup')}>
                            <Box
                                component="button"
                                onClick={() => onDelete(backup)}
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: C.danger,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 2,
                                    px: 1.5,
                                    py: 0.5,
                                    backgroundColor: C.surface,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    '&:hover': { backgroundColor: C.dangerLight, borderColor: C.danger }
                                }}
                            >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                                {t('common.delete')}
                            </Box>
                        </Tooltip>
                        )}
                    </Box>
                </Box>
            </Box>
        </Fade>
    );
};

export default BackupCard;
