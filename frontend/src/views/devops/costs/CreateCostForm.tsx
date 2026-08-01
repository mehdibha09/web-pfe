import AddIcon from '@mui/icons-material/Add';
import CloudIcon from '@mui/icons-material/Cloud';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Grid,
    IconButton,
    MenuItem,
    TextField,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { createCost } from '../../../services/cloudPricerService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { listServiceEnvironments, listServices, listEnvironments } from '../../../services/devopsService';
import type { ServiceEnvironmentResponse, ServiceResponse, EnvironmentResponse } from '../../../services/devopsService';
import { BREAKDOWN_TYPES, type BreakdownRow } from './constants';
import type { CostRecordResponse } from '../../../services/cloudPricerService';
import { seLabel } from '../deployments/helpers';
import MyCustomButton from '../../../components/MyCustomButton';
import { C } from '../../../theme/tokens';

interface CreateCostFormProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    costs: CostRecordResponse[];
}

const labelSx = { '& .MuiInputLabel-root': { fontWeight: 600, color: C.text } };

const CreateCostForm = ({ open, onClose, onCreated, costs }: CreateCostFormProps) => {
    const { t } = useTranslation();
    const [serviceEnvironmentId, setServiceEnvironmentId] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [mode, setMode] = useState<string>('VM');
    const [computeCost, setComputeCost] = useState<number>(0);
    const [storageCost, setStorageCost] = useState<number>(0);
    const [networkCost, setNetworkCost] = useState<number>(0);
    const [backupCost, setBackupCost] = useState<number>(0);
    const [osCost, setOsCost] = useState<number>(0);
    const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
    const [creating, setCreating] = useState(false);
    const [seList, setSeList] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const [seRes, svcRes, envRes] = await Promise.all([
                    listServiceEnvironments(),
                    listServices(),
                    listEnvironments()
                ]);
                setSeList(seRes);
                setServices(svcRes);
                setEnvironments(envRes);
            } catch { /* ignore */ }
        })();
    }, [open]);

    const reset = () => {
        setServiceEnvironmentId('');
        setPeriodStart('');
        setPeriodEnd('');
        setMode('VM');
        setComputeCost(0);
        setStorageCost(0);
        setNetworkCost(0);
        setBackupCost(0);
        setOsCost(0);
        setBreakdowns([]);
    };

    const handleAddBreakdown = () => {
        setBreakdowns((prev) => [...prev, { type: BREAKDOWN_TYPES[0], unitCost: 0, quantity: 1 }]);
    };

    const handleRemoveBreakdown = (index: number) => {
        setBreakdowns((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBreakdownChange = (index: number, field: keyof BreakdownRow, value: string | number) => {
        setBreakdowns((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
    };

    const handleCreate = async () => {
        const tenantId = getStoredUser()?.tenantId;
        if (!tenantId) return toast.error(t('costs.tenantIdRequired'));
        if (!serviceEnvironmentId.trim()) return toast.error(t('costs.serviceEnvIdRequired'));
        if (!periodStart) return toast.error(t('costs.periodStartRequired'));
        if (!periodEnd) return toast.error(t('costs.periodEndRequired'));

        setCreating(true);
        try {
            await createCost({
                tenantId,
                serviceEnvironmentId: serviceEnvironmentId.trim(),
                periodStart,
                periodEnd,
                mode,
                computeCost,
                storageCost,
                networkCost,
                backupCost,
                osCost,
                breakdowns: breakdowns.map((b) => ({
                    type: b.type,
                    unitCost: b.unitCost,
                    quantity: b.quantity
                }))
            });
            toast.success(t('costs.created'));
            reset();
            onClose();
            onCreated();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('costs.failedToCreate')));
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloudIcon sx={{ color: C.brand, fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {t('costs.newCostRecord')}
                </Typography>
            </Box>
            <DialogContent>
                <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth select label={t('costs.serviceEnvironmentId')} value={serviceEnvironmentId} onChange={(e) => setServiceEnvironmentId(e.target.value)} helperText={t('costs.serviceEnvHelper')} sx={labelSx}>
                            <MenuItem value="">{t('costs.selectServiceEnvironment')}</MenuItem>
                            {seList.map((se) => (
                                <MenuItem key={se.id} value={se.id}>{seLabel(se)}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth select label={t('costs.mode')} value={mode} onChange={(e) => setMode(e.target.value)} sx={labelSx}>
                            <MenuItem value="VM">{t('costs.vm')}</MenuItem>
                            <MenuItem value="SERVICE">{t('costs.service')}</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label={t('costs.periodStart')} type="datetime-local" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label={t('costs.periodEnd')} type="datetime-local" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField fullWidth label={t('costs.computeCost')} type="number" value={computeCost} onChange={(e) => setComputeCost(Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField fullWidth label={t('costs.storageCost')} type="number" value={storageCost} onChange={(e) => setStorageCost(Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField fullWidth label={t('costs.networkCost')} type="number" value={networkCost} onChange={(e) => setNetworkCost(Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField fullWidth label={t('costs.backupCost')} type="number" value={backupCost} onChange={(e) => setBackupCost(Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} sx={labelSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField fullWidth label={t('costs.osCost')} type="number" value={osCost} onChange={(e) => setOsCost(Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} sx={labelSx} />
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.text }}>
                            {t('costs.breakdown')}
                        </Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={handleAddBreakdown} sx={{ textTransform: 'none', color: C.brand }}>
                            {t('costs.addRow')}
                        </Button>
                    </Box>
                    {breakdowns.map((b, idx) => (
                        <Grid container spacing={1} key={idx} sx={{ mb: 1, alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                <TextField fullWidth size="small" select label={t('costs.type')} value={b.type} onChange={(e) => handleBreakdownChange(idx, 'type', e.target.value)}>
                                    {BREAKDOWN_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                <TextField fullWidth size="small" label={t('costs.unitCost')} type="number" value={b.unitCost} onChange={(e) => handleBreakdownChange(idx, 'unitCost', Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                                <TextField fullWidth size="small" label={t('costs.quantity')} type="number" value={b.quantity} onChange={(e) => handleBreakdownChange(idx, 'quantity', Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 1, md: 1 }}>
                                <IconButton color="error" size="small" onClick={() => handleRemoveBreakdown(idx)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Grid>
                        </Grid>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.cancel')}</Button>
                <MyCustomButton onClick={handleCreate} disabled={creating} sx={{ px: 4 }}>
                    {creating ? t('costs.creating') : t('costs.createCostRecord')}
                </MyCustomButton>
            </DialogActions>
        </Dialog>
    );
};

export default CreateCostForm;
