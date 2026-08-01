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
    Card,
    CardContent,
    Chip,
    Divider,
    Fade,
    IconButton,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { K8sDeployment, K8sHpaResponse } from '../../../services/k8sService';
import { C, STATUS_COLORS, fmtDate } from './constants';

interface MetaRowProps {
    label: string;
    value: string;
}

const MetaRow = ({ label, value }: MetaRowProps) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: 12, color: C.text, fontFamily: 'monospace', fontWeight: 500 }}>{value}</Typography>
    </Box>
);

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
    const created = fmtDate(dep.createdAt);
    const updated = fmtDate(dep.updatedAt);

    const bannerGrad = (() => {
        switch (dep.status) {
            case 'RUNNING': return 'linear-gradient(135deg, #8FCBA4 0%, #3F9B66 100%)';
            case 'CREATED': return 'linear-gradient(135deg, #B9CFE6 0%, #3E6E9E 100%)';
            case 'FAILED': return 'linear-gradient(135deg, #E6C2C9 0%, #DE8295 100%)';
            case 'SCALED': return 'linear-gradient(135deg, #F7ECD6 0%, #8A6A2E 100%)';
            case 'RESTARTED': return 'linear-gradient(135deg, #E9E6F6 0%, #5E4B9E 100%)';
            default: return `linear-gradient(135deg, ${C.brandLight} 0%, #FFF 100%)`;
        }
    })();

    return (
        <Fade in>
            <Card sx={{ borderRadius: 4, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(228,71,125,0.06)', transition: 'all 0.22s ease', overflow: 'hidden', '&:hover': { boxShadow: '0 8px 28px rgba(228,71,125,0.14)', transform: 'translateY(-2px)' } }}>
                <Box sx={{ height: 6, background: bannerGrad }} />

                <CardContent sx={{ p: 0 }}>
                    <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, flexShrink: 0, background: bannerGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                            <PlayArrowIcon sx={{ color: '#fff', fontSize: 22 }} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2, mr: 'auto', fontSize: 15 }}>
                                    {dep.name}
                                </Typography>
                                <Chip label={dep.status} size="small" sx={{ backgroundColor: sc.bg, color: sc.fg, fontWeight: 800, fontSize: 10, letterSpacing: '0.06em', border: `1px solid ${sc.fg}22` }} />
                                {hpaConfig && (
                                    <Chip icon={<HpaIcon sx={{ fontSize: 11 }} />} label="HPA" size="small" sx={{ height: 20, backgroundColor: '#E9E6F6', color: '#5E4B9E', fontWeight: 700, fontSize: 9, '& .MuiChip-icon': { ml: 0.5 } }} />
                                )}
                            </Box>
                            <Typography sx={{ color: C.muted, fontSize: 12, fontFamily: 'monospace', mt: 0.5 }}>
                                {dep.dockerImage}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mx: 2.5, borderColor: C.border }} />

                    <Box sx={{ px: 2.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                        <MetaRow label={t('k8s.namespace')} value={dep.namespace} />
                        <MetaRow label={t('k8s.replicas')} value={`${dep.replicas}`} />
                        {hpaConfig && (
                            <MetaRow label="HPA" value={`${hpaConfig.minReplicas}-${hpaConfig.maxReplicas} (CPU: ${hpaConfig.cpuTargetAverageUtilization ?? '-'}%)`} />
                        )}
                        <MetaRow label={t('k8s.port')} value={dep.protocol ? `${dep.protocol}/${dep.port}` : `${dep.port}`} />
                        {dep.targetPort && <MetaRow label={t('k8s.targetPort')} value={`${dep.targetPort}`} />}
                        {dep.cpuRequest && <MetaRow label={t('k8s.cpuReq')} value={dep.cpuRequest} />}
                        {dep.cpuLimit && <MetaRow label={t('k8s.cpuLimit')} value={dep.cpuLimit} />}
                        {dep.memoryRequest && <MetaRow label={t('k8s.memReq')} value={dep.memoryRequest} />}
                        {dep.memoryLimit && <MetaRow label={t('k8s.memLimit')} value={dep.memoryLimit} />}
                        <MetaRow label={t('k8s.env')} value={envName(dep.serviceEnvironmentId)} />
                        {dep.labels && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    {t('k8s.labels')}
                                </Typography>
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                    {dep.labels.split(',').map((l, i) => (
                                        <Chip key={i} label={l.trim()} size="small" sx={{ height: 18, fontSize: 10, backgroundColor: '#F3F4F6', color: '#374151' }} />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        {dep.secrets && <MetaRow label={t('k8s.secrets')} value={t('k8s.secretsCount', { count: dep.secrets.split(',').length })} />}
                        {dep.livenessProbe?.enabled && <MetaRow label={t('k8s.liveness')} value={t('k8s.probeDetail', { path: dep.livenessProbe.path, port: dep.livenessProbe.port, seconds: dep.livenessProbe.periodSeconds })} />}
                        {dep.readinessProbe?.enabled && <MetaRow label={t('k8s.readiness')} value={t('k8s.probeDetail', { path: dep.readinessProbe.path, port: dep.readinessProbe.port, seconds: dep.readinessProbe.periodSeconds })} />}
                        {dep.startupProbe?.enabled && <MetaRow label={t('k8s.startup')} value={t('k8s.startupDetail', { path: dep.startupProbe.path, port: dep.startupProbe.port, failures: dep.startupProbe.failureThreshold })} />}
                        {created && <MetaRow label={t('k8s.created')} value={created} />}
                        {updated && <MetaRow label={t('k8s.updated')} value={updated} />}
                    </Box>
                </CardContent>

                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, background: '#FAFAFA', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 11, color: C.subtle, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '35%' }}>
                        {dep.id}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap' }}>
                        {allowManage && (
                            <Tooltip title={t('k8s.scale')}>
                                <IconButton size="small" onClick={() => onScale(dep)} sx={{ color: '#BE185D' }}>
                                    <ScaleIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {allowManage && (
                            <Tooltip title={t('k8s.restart')}>
                                <IconButton size="small" onClick={() => onRestart(dep)} sx={{ color: '#9333EA' }}>
                                    <RestartAltIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {allowManage && (
                            <Tooltip title="Rollback">
                                <IconButton size="small" onClick={() => onRollback(dep)} sx={{ color: '#B45309' }}>
                                    <RollbackIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {allowManage && (
                            <Tooltip title="HPA">
                                <IconButton size="small" onClick={() => onConfigureHpa(dep)} sx={{ color: hpaConfig ? '#5E4B9E' : C.subtle }}>
                                    <HpaIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title={t('k8s.viewPods')}>
                            <IconButton size="small" onClick={() => onViewPods(dep)} sx={{ color: '#0D9488' }}>
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t('k8s.viewLogs')}>
                            <IconButton size="small" onClick={() => onViewLogs(dep)} sx={{ color: '#8A6A2E' }}>
                                <TerminalIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t('k8s.viewEvents')}>
                            <IconButton size="small" onClick={() => onViewEvents(dep)} sx={{ color: '#6366F1' }}>
                                <EventsIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        {allowManage && (
                            <Tooltip title={t('common.delete')}>
                                <IconButton size="small" onClick={() => onDelete(dep)} sx={{ color: C.danger }}>
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </Card>
        </Fade>
    );
};

export default K8sCard;
