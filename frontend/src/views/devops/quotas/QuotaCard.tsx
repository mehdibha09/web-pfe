import CloudIcon from '@mui/icons-material/Cloud';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    LinearProgress,
    MenuItem,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { QuotaRequest } from '../../../services/cloudPricerService';
import { updateQuota, deleteQuota } from '../../../services/cloudPricerService';
import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { numericFieldValue } from '../../../utils/numeric';
import MyCustomButton from '../../../components/MyCustomButton';
import { getBarBg, getBarColor, getUsagePercent, seLabel } from './helpers';
import { PERIODS } from './types';
import type { QuotaWithMetrics } from './types';
import { C } from '../../../theme/tokens';

interface Props {
    quota: QuotaWithMetrics;
    onSaved: () => void;
    serviceEnvironments: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
}

const QuotaCard = ({ quota, onSaved, serviceEnvironments, services, environments }: Props) => {
    const { t } = useTranslation();
    const q = quota;
    const m = q.usage || null;
    const cpuPct = m ? getUsagePercent(m.cpu, q.maxCpu) : 0;
    const ramPct = m ? getUsagePercent(m.ram, q.maxRam) : 0;
    const storagePct = m ? getUsagePercent(m.storage, q.maxStorage) : 0;
    const podsPct = m ? getUsagePercent(m.pods, q.maxPods) : 0;
    const isNearLimit = cpuPct >= 90 || ramPct >= 90;

    const matchedSe = serviceEnvironments.find((se) => se.id === q.serviceEnvironmentId);

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [seId, setSeId] = useState(q.serviceEnvironmentId);
    const [cpu, setCpu] = useState<number>(q.maxCpu);
    const [ram, setRam] = useState<number>(q.maxRam);
    const [storage, setStorage] = useState<number>(q.maxStorage);
    const [pods, setPods] = useState<number>(q.maxPods);
    const [budget, setBudget] = useState<number>(q.maxBudget);
    const [period, setPeriod] = useState<string>(q.period);
    const [active, setActive] = useState(q.isActive);
    const [saving, setSaving] = useState(false);

    const buildRequest = (): QuotaRequest => ({
        serviceEnvironmentId: seId,
        maxCpu: cpu,
        maxRam: ram,
        maxStorage: storage,
        maxPods: pods,
        maxBudget: budget,
        period,
        isActive: active
    });

    const handleUpdate = async () => {
        if (!seId.trim()) return toast.error('Service environment ID is required');
        setSaving(true);
        try {
            await updateQuota(q.id, buildRequest());
            toast.success(t('quotas.updateSuccess'));
            setEditOpen(false);
            await onSaved();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to update quota'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleteOpen(false);
        try {
            await deleteQuota(q.id);
            toast.success(t('quotas.deleteSuccess'));
            await onSaved();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete quota'));
        }
    };

    const renderProgressBar = (label: string, used: number, max: number, unit: string) => {
        const labelT = t(label);
        const pct = getUsagePercent(used, max);
        const color = getBarColor(pct);
        const bg = getBarBg(pct);
        const nearLimit = pct >= 90;

        return (
            <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: C.subtle, fontWeight: 600 }}>
                        {labelT}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {nearLimit && <WarningAmberIcon sx={{ fontSize: 14, color: '#C95B6E' }} />}
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: nearLimit ? '#C95B6E' : C.text }}
                        >
                            {used.toLocaleString()} / {max.toLocaleString()} {unit}
                        </Typography>
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: bg,
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            background: `linear-gradient(90deg, ${color}88, ${color})`
                        }
                    }}
                />
            </Box>
        );
    };

    const renderStaticValue = (label: string, value: number, unit: string) => {
        const labelT = t(label);
        return (
            <Box>
                <Typography variant="caption" sx={{ color: C.subtle, fontWeight: 600 }}>
                    {labelT}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.text }}>
                    {value} {unit}
                </Typography>
            </Box>
        );
    };

    const displayLabel = matchedSe
        ? seLabel(matchedSe, services, environments)
        : q.serviceEnvironmentId.length > 24
            ? q.serviceEnvironmentId.slice(0, 24) + '…'
            : q.serviceEnvironmentId;

    return (
        <>
            <Card
                sx={{
                    borderRadius: 3,
                    border: isNearLimit ? '2px solid #C95B6E' : `1px solid ${C.border}`,
                    transition: '0.2s',
                    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
                }}
            >
                <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                            {isNearLimit && (
                                <WarningAmberIcon sx={{ fontSize: 18, color: '#C95B6E' }} />
                            )}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: isNearLimit ? '#C95B6E' : C.text,
                                    wordBreak: 'break-all'
                                }}
                            >
                                {displayLabel}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                            <Chip
                                label={q.period}
                                size="small"
                                sx={{
                                    backgroundColor: '#E9E6F6',
                                    color: '#5E4B9E',
                                    fontWeight: 700,
                                    height: 24,
                                }}
                            />
                            <Chip
                                label={q.isActive ? t('quotas.active') : t('quotas.inactive')}
                                size="small"
                                sx={{
                                    backgroundColor: q.isActive ? '#E0F1E6' : '#F7DEE3',
                                    color: q.isActive ? '#2E7A4F' : '#A23B4E',
                                    fontWeight: 700,
                                    height: 24,
                                }}
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {m ? (
                        <Box>
                            {renderProgressBar('quotas.cpuLabel', m.cpu, q.maxCpu, t('quotas.cores'))}
                            {renderProgressBar('quotas.ramLabel', m.ram, q.maxRam, t('quotas.mb'))}
                            {renderProgressBar('quotas.storageLabel', m.storage, q.maxStorage, t('quotas.gb'))}
                            {q.maxPods > 0 && renderProgressBar('quotas.podsLabel', m.pods, q.maxPods, '')}
                        </Box>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            {renderStaticValue('quotas.cpuLabel', q.maxCpu, t('quotas.cores'))}
                            {renderStaticValue('quotas.ramLabel', q.maxRam, t('quotas.mb'))}
                            {renderStaticValue('quotas.storageLabel', q.maxStorage, t('quotas.gb'))}
                            {q.maxPods > 0 && renderStaticValue('quotas.podsLabel', q.maxPods, '')}
                            {renderStaticValue('quotas.budgetLabel', q.maxBudget, '$')}
                        </Box>
                    )}

                    <Box
                        sx={{
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: `1px solid ${C.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>
                            {t('quotas.budgetLabel')}: <strong>${q.maxBudget.toLocaleString()}</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => setEditOpen(true)}
                                startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: 12,
                                    background: 'linear-gradient(135deg, #E4477D, #BE185D)',
                                    boxShadow: '0 2px 6px rgba(228,71,125,0.3)',
                                    px: 1.5,
                                    color: '#FFFFFF',
                                    '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)', boxShadow: '0 4px 12px rgba(228,71,125,0.4)' }
                                }}
                            >
                                {t('common.edit')}
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => setDeleteOpen(true)}
                                startIcon={<DeleteOutlinedIcon sx={{ fontSize: 15 }} />}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: 12,
                                    px: 1.5,
                                    backgroundColor: '#FCE7F3',
                                    color: '#BE185D',
                                    boxShadow: 'none',
                                    '&:hover': { backgroundColor: '#F9D5E8', boxShadow: 'none' }
                                }}
                            >
                                {t('common.delete')}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('quotas.confirmDelete')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: C.muted }}>
                        {t('quotas.confirmDelete')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600, color: '#BE185D', borderColor: '#F2B8CC' }}>{t('common.cancel')}</Button>
                    <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' } }}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
                <Box sx={{
                    background: 'linear-gradient(135deg, #FCE7F3 0%, #FFFFFF 100%)',
                    px: 3, py: 2.5,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    borderBottom: `1px solid ${C.border}`
                }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudIcon sx={{ color: '#BE185D', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                            {t('common.edit')}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: C.muted }}>{displayLabel}</Typography>
                    </Box>
                </Box>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            size="small"
                            select
                            label={t('quotas.serviceEnvironment')}
                            value={seId}
                            onChange={(e) => setSeId(e.target.value)}
                            fullWidth
                        >
                            {serviceEnvironments.map((se) => (
                                <MenuItem key={se.id} value={se.id}>
                                    {seLabel(se, services, environments)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="number" label={t('quotas.maxCpu')} value={cpu} onChange={(e) => setCpu(Number(numericFieldValue(e.target.value)))} />
                            <TextField size="small" type="number" label={t('quotas.maxRam')} value={ram} onChange={(e) => setRam(Number(numericFieldValue(e.target.value)))} />
                            <TextField size="small" type="number" label={t('quotas.maxStorage')} value={storage} onChange={(e) => setStorage(Number(numericFieldValue(e.target.value)))} />
                            <TextField size="small" type="number" label={t('quotas.maxPods')} value={pods} onChange={(e) => setPods(Number(numericFieldValue(e.target.value)))} />
                            <TextField size="small" type="number" label={t('quotas.maxBudget')} value={budget} onChange={(e) => setBudget(Number(numericFieldValue(e.target.value)))} />
                            <TextField size="small" select label={t('quotas.period')} value={period} onChange={(e) => setPeriod(e.target.value)}>
                                {PERIODS.map((p) => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
                            <Typography variant="body2" sx={{ color: C.muted }}>
                                {active ? t('quotas.active') : t('quotas.inactive')}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                    <Button onClick={() => setEditOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600, px: 3, color: '#BE185D', borderColor: '#F2B8CC' }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={handleUpdate} disabled={saving} sx={{ px: 4 }}>
                        {saving ? t('quotas.saving') : t('common.save')}
                    </MyCustomButton>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default QuotaCard;