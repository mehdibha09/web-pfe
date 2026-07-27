import { Close as CloseIcon } from '@mui/icons-material';
import CloudIcon from '@mui/icons-material/Cloud';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import MyCustomButton from '../../../components/MyCustomButton';
import { useTranslation } from 'react-i18next';

import type { K8sDeployment, K8sHpaResponse, K8sPod } from '../../../services/k8sService';
import { BTN, C, MAX_REPLICAS, POD_STATUS_COLORS } from './constants';

interface K8sDialogsProps {
    scaleTarget: K8sDeployment | null;
    scaleReplicas: number;
    onScaleReplicasChange: (v: number) => void;
    onScaleClose: () => void;
    onScaleConfirm: () => void;

    deleteTarget: K8sDeployment | null;
    onDeleteClose: () => void;
    onDeleteConfirm: () => void;

    podsTarget: K8sDeployment | null;
    pods: K8sPod[];
    podsLoading: boolean;
    podsTab: number;
    onPodsTabChange: (v: number) => void;
    events: string;
    onPodsClose: () => void;

    logsTarget: K8sDeployment | null;
    logs: string;
    logsLoading: boolean;
    onLogsClose: () => void;

    eventsTarget: K8sDeployment | null;
    eventsLoading: boolean;
    onEventsClose: () => void;

    hpaTarget: K8sDeployment | null;
    hpaConfig: K8sHpaResponse | null;
    hpaMinReplicas: number;
    hpaMaxReplicas: number;
    hpaCpuTarget: number;
    hpaMemoryTarget: number;
    onHpaMinChange: (v: number) => void;
    onHpaMaxChange: (v: number) => void;
    onHpaCpuChange: (v: number) => void;
    onHpaMemoryChange: (v: number) => void;
    onHpaClose: () => void;
    onHpaSave: () => void;
    onHpaDelete: () => void;
    hpaSaving: boolean;

    rollbackTarget: K8sDeployment | null;
    rollbackRevision: number;
    onRollbackRevisionChange: (v: number) => void;
    onRollbackClose: () => void;
    onRollbackConfirm: () => void;
    rollbackSaving: boolean;
}

const headerBox = (title: string, subtitle?: string) => (
    <Box sx={{
        background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: `1px solid ${C.border}`
    }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudIcon sx={{ color: C.brand, fontSize: 20 }} />
        </Box>
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                {title}
            </Typography>
            {subtitle && <Typography sx={{ fontSize: 13, color: C.muted }}>{subtitle}</Typography>}
        </Box>
    </Box>
);

const K8sDialogs = ({
    scaleTarget, scaleReplicas, onScaleReplicasChange, onScaleClose, onScaleConfirm,
    deleteTarget, onDeleteClose, onDeleteConfirm,
    podsTarget, pods, podsLoading, podsTab, onPodsTabChange, events, onPodsClose,
    logsTarget, logs, logsLoading, onLogsClose,
    eventsTarget, eventsLoading, onEventsClose,
    hpaTarget, hpaConfig, hpaMinReplicas, hpaMaxReplicas, hpaCpuTarget, hpaMemoryTarget,
    onHpaMinChange, onHpaMaxChange, onHpaCpuChange, onHpaMemoryChange, onHpaClose, onHpaSave, onHpaDelete, hpaSaving,
    rollbackTarget, rollbackRevision, onRollbackRevisionChange, onRollbackClose, onRollbackConfirm, rollbackSaving
}: K8sDialogsProps) => {
    const { t } = useTranslation();
    return (
        <>
        {/* Scale dialog */}
        <Dialog open={!!scaleTarget} onClose={onScaleClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            {headerBox(t('k8s.scale'), scaleTarget?.name)}
            <DialogContent>
                <TextField autoFocus fullWidth type="number" label={t('k8s.replicas')} value={scaleReplicas} onChange={(e) => onScaleReplicasChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: MAX_REPLICAS } }} helperText={t('k8s.maxReplicas', { max: MAX_REPLICAS })} sx={{ mt: 1 }} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button variant="outlined" onClick={onScaleClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.cancel')}</Button>
                <MyCustomButton onClick={onScaleConfirm} sx={{ px: 4 }}>{t('k8s.scale')}</MyCustomButton>
            </DialogActions>
        </Dialog>

        {/* Delete dialog */}
        <Dialog open={!!deleteTarget} onClose={onDeleteClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>{t('k8s.deleteDialogTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ color: C.muted }}>{t('k8s.deleteDialogContent', { name: deleteTarget?.name })}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="outlined" onClick={onDeleteClose} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.cancel')}</Button>
                <Button variant="contained" color="error" onClick={onDeleteConfirm} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('common.delete')}</Button>
            </DialogActions>
        </Dialog>

        {/* Pods dialog */}
        <Dialog open={!!podsTarget} onClose={onPodsClose} maxWidth="md" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudIcon sx={{ color: C.brand, fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                        {t('k8s.detailsDialogTitle', { name: podsTarget?.name })}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onPodsClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <Tabs value={podsTab} onChange={(_, v) => onPodsTabChange(v)} sx={{ px: 3, pt: 1 }}>
                <Tab label={t('k8s.pods')} />
                <Tab label={t('k8s.events')} />
            </Tabs>
            <DialogContent>
                {podsTab === 0 && (podsLoading ? <LoadingSpinner variant="block" /> : pods.length === 0 ? <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>{t('k8s.noPods')}</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>{t('common.name')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{t('k8s.ready')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{t('k8s.restarts')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{t('k8s.age')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pods.map((pod) => {
                                    const pc = POD_STATUS_COLORS[pod.status] ?? { bg: '#F3F4F6', fg: '#374151' };
                                    return (
                                        <TableRow key={pod.name}>
                                            <TableCell><Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{pod.name}</Typography></TableCell>
                                            <TableCell><Chip label={pod.status} size="small" sx={{ backgroundColor: pc.bg, color: pc.fg, fontWeight: 700, fontSize: 10 }} /></TableCell>
                                            <TableCell>{pod.ready}</TableCell>
                                            <TableCell>{pod.restarts}</TableCell>
                                            <TableCell>{pod.age}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ))}
                {podsTab === 1 && (
                    <Box sx={{ backgroundColor: '#1E293B', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                            {events || t('k8s.noEvents')}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button variant="outlined" onClick={onPodsClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>

        {/* Logs dialog */}
        <Dialog open={!!logsTarget} onClose={onLogsClose} maxWidth="lg" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudIcon sx={{ color: C.brand, fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                        {t('k8s.logsDialogTitle', { name: logsTarget?.name })}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onLogsClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <DialogContent>
                {logsLoading ? <LoadingSpinner variant="block" /> : !logs ? <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>{t('k8s.noLogs')}</Typography> : (
                    <Box sx={{ backgroundColor: '#1E293B', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>{logs}</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button variant="outlined" onClick={onLogsClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>

        {/* Events dialog */}
        <Dialog open={!!eventsTarget} onClose={onEventsClose} maxWidth="lg" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudIcon sx={{ color: C.brand, fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                        {t('k8s.eventsDialogTitle', { name: eventsTarget?.name })}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onEventsClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            <DialogContent>
                {eventsLoading ? <LoadingSpinner variant="block" /> : !events ? <Typography sx={{ color: C.muted, textAlign: 'center', py: 4 }}>{t('k8s.noEvents')}</Typography> : (
                    <Box sx={{ backgroundColor: '#1E293B', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>{events}</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button variant="outlined" onClick={onEventsClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>

        {/* HPA dialog */}
        <Dialog open={!!hpaTarget} onClose={onHpaClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            {headerBox('Auto-scaling HPA', hpaTarget?.name)}
            <DialogContent>
                {hpaConfig && (
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, backgroundColor: '#E9E6F6', border: '1px solid #D4C8E6' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5E4B9E' }}>Current HPA Status</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Box><Typography sx={{ fontSize: 10, color: C.subtle }}>Current</Typography><Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{hpaConfig.currentReplicas} replicas</Typography></Box>
                            <Box><Typography sx={{ fontSize: 10, color: C.subtle }}>Desired</Typography><Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{hpaConfig.desiredReplicas} replicas</Typography></Box>
                            <Box><Typography sx={{ fontSize: 10, color: C.subtle }}>Status</Typography><Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text }}>{hpaConfig.status}</Typography></Box>
                        </Box>
                    </Box>
                )}
                <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
                    <TextField fullWidth type="number" label="Min Replicas" value={hpaMinReplicas} onChange={(e) => onHpaMinChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
                    <TextField fullWidth type="number" label="Max Replicas" value={hpaMaxReplicas} onChange={(e) => onHpaMaxChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
                    <TextField fullWidth type="number" label="CPU Target (%)" value={hpaCpuTarget} onChange={(e) => onHpaCpuChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 100 } }} helperText="Average CPU utilization target" />
                    <TextField fullWidth type="number" label="Memory Target (%)" value={hpaMemoryTarget} onChange={(e) => onHpaMemoryChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: 100 } }} helperText="Average memory utilization target (0 = disabled)" />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                {hpaConfig && (
                    <Button variant="outlined" color="error" onClick={onHpaDelete} sx={{ mr: 'auto', borderRadius: 2, fontWeight: 600 }}>Remove HPA</Button>
                )}
                <Button variant="outlined" onClick={onHpaClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>Cancel</Button>
                <MyCustomButton onClick={onHpaSave} disabled={hpaSaving} sx={{ px: 4 }}>
                    {hpaSaving ? 'Saving...' : hpaConfig ? 'Update HPA' : 'Enable HPA'}
                </MyCustomButton>
            </DialogActions>
        </Dialog>

        {/* Rollback dialog */}
        <Dialog open={!!rollbackTarget} onClose={onRollbackClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            {headerBox('Rollback', rollbackTarget?.name)}
            <DialogContent>
                <Typography sx={{ color: C.muted, mb: 2 }}>Rollback to a previous revision (leave empty for previous revision)</Typography>
                <TextField fullWidth type="number" label="Revision" value={rollbackRevision} onChange={(e) => onRollbackRevisionChange(Number(e.target.value))} slotProps={{ htmlInput: { min: 1 } }} helperText="Leave 0 to undo to previous revision" />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button variant="outlined" onClick={onRollbackClose} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>Cancel</Button>
                <Button variant="contained" onClick={onRollbackConfirm} disabled={rollbackSaving}
                    sx={{ borderRadius: 2, fontWeight: 600, px: 4, background: BTN.warning.gradient, '&:hover': { background: BTN.warning.gradientHover } }}>
                    {rollbackSaving ? 'Rolling back...' : 'Rollback'}
                </Button>
            </DialogActions>
        </Dialog>
    </>
    );
};

export default K8sDialogs;
