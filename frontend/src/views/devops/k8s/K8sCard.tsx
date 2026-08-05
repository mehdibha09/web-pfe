import {
    Delete as DeleteIcon,
    History as RollbackIcon,
    Info as EventsIcon,
    PlayArrow as PlayArrowIcon,
    RestartAlt as RestartAltIcon,
    Scale as ScaleIcon,
    Terminal as TerminalIcon,
    Tune as HpaIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    Divider,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { K8sDeployment, K8sHpaResponse } from '../../../services/k8sService';
import { C, STATUS_COLORS, fmtDate } from './constants';

interface K8sCardProps {
    dep: K8sDeployment;
    envName: (id: string) => string;
    hpaConfig?: K8sHpaResponse | null;
    allowManage?: boolean;
    onScale: (dep: K8sDeployment) => void;
    onRestart: (dep: K8sDeployment) => void;
    onViewPods: (dep: K8sDeployment) => void;
    onViewLogs: (dep: K8sDeployment) => void;
    onViewEvents: (dep: K8sDeployment) => void;
    onConfigureHpa: (dep: K8sDeployment) => void;
    onRollback: (dep: K8sDeployment) => void;
    onDelete: (dep: K8sDeployment) => void;
}

const K8sCard = ({ dep, envName, hpaConfig, allowManage = false, onScale, onRestart, onViewPods, onViewLogs, onViewEvents, onConfigureHpa, onRollback, onDelete }: K8sCardProps) => {
    const { t } = useTranslation();
    const sc = STATUS_COLORS[dep.status] ?? { bg: '#F3F4F6', fg: '#374151' };

    const banner = (() => {
        switch (dep.status) {
            case 'RUNNING': return 'linear-gradient(90deg, #3F9B66, #8FCBA4)';
            case 'CREATED': return 'linear-gradient(90deg, #3E6E9E, #B9CFE6)';
            case 'FAILED': return 'linear-gradient(90deg, #DE8295, #E6C2C9)';
            case 'SCALED': return 'linear-gradient(90deg, #8A6A2E, #F7ECD6)';
            case 'RESTARTED': return 'linear-gradient(90deg, #5E4B9E, #E9E6F6)';
            default: return `linear-gradient(90deg, ${C.brand}, ${C.brandLight})`;
        }
    })();

    return (
        <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: banner, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
            <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{dep.name}</Typography>
                    <Chip label={dep.status} size="small" sx={{ backgroundColor: sc.bg, color: sc.fg, fontWeight: 700, fontSize: 10, border: `1px solid ${sc.fg}22` }} />
                    {hpaConfig && (
                        <Chip icon={<HpaIcon sx={{ fontSize: 11 }} />} label="HPA" size="small" sx={{ height: 20, backgroundColor: '#E9E6F6', color: '#5E4B9E', fontWeight: 700, fontSize: 9, '& .MuiChip-icon': { ml: 0.5 } }} />
                    )}
                </Box>
                <Typography sx={{ color: C.muted, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{dep.dockerImage}</Typography>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('k8s.env')}</Typography>
                        <Typography sx={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{envName(dep.serviceEnvironmentId)}</Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('k8s.replicas')}</Typography>
                        <Typography sx={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
                            {dep.replicas}
                            {hpaConfig && ` (${hpaConfig.minReplicas}-${hpaConfig.maxReplicas})`}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('k8s.port')}</Typography>
                        <Typography sx={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{dep.protocol ? `${dep.protocol}/${dep.port}` : `${dep.port}`}</Typography>
                    </Box>
                </Box>

                {dep.labels && (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 1.5 }}>
                        {dep.labels.split(',').map((l, i) => (
                            <Chip key={i} label={l.trim()} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />
                        ))}
                    </Stack>
                )}
                {dep.createdAt && (
                    <Typography sx={{ color: C.subtle, fontSize: 10, mt: 1 }}>{t('k8s.created')} {fmtDate(dep.createdAt)}</Typography>
                )}
            </CardContent>
            <CardActions sx={{ px: 2.5, py: 1.5, flexDirection: 'column', alignItems: 'stretch', gap: 0.75, borderTop: `1px solid ${C.border}`, background: '#FAFAFA' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Tooltip title={t('k8s.viewPods')}><Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />} onClick={() => onViewPods(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#0D9488', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.viewPods')}</Button></Tooltip>
                    <Tooltip title={t('k8s.viewLogs')}><Button size="small" startIcon={<TerminalIcon sx={{ fontSize: 14 }} />} onClick={() => onViewLogs(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#8A6A2E', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.viewLogs')}</Button></Tooltip>
                    <Tooltip title={t('k8s.viewEvents')}><Button size="small" startIcon={<EventsIcon sx={{ fontSize: 14 }} />} onClick={() => onViewEvents(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#6366F1', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.viewEvents')}</Button></Tooltip>
                </Box>
                {allowManage && (
                    <>
                        <Divider sx={{ borderColor: C.border, my: 0.25 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                            <Tooltip title={t('k8s.scale')}><Button size="small" startIcon={<ScaleIcon sx={{ fontSize: 14 }} />} onClick={() => onScale(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#BE185D', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.scale')}</Button></Tooltip>
                            <Tooltip title={t('k8s.restart')}><Button size="small" startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />} onClick={() => onRestart(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#9333EA', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.restart')}</Button></Tooltip>
                            <Tooltip title={t('k8s.rollback')}><Button size="small" startIcon={<RollbackIcon sx={{ fontSize: 14 }} />} onClick={() => onRollback(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#B45309', border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>{t('k8s.rollback')}</Button></Tooltip>
                            <Tooltip title="HPA"><Button size="small" startIcon={<HpaIcon sx={{ fontSize: 14 }} />} onClick={() => onConfigureHpa(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: hpaConfig ? '#5E4B9E' : C.subtle, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize' }}>HPA</Button></Tooltip>
                            <Box sx={{ flexGrow: 1 }} />
                            <Tooltip title={t('common.delete')}><Button size="small" startIcon={<DeleteIcon sx={{ fontSize: 14 }} />} onClick={() => onDelete(dep)} sx={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF', background: C.danger, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { background: '#B14A5C' } }}>{t('common.delete')}</Button></Tooltip>
                        </Box>
                    </>
                )}
            </CardActions>
        </Card>
    );
};

export default K8sCard;
