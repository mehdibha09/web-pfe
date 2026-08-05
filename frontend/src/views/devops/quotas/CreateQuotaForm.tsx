import CloudIcon from '@mui/icons-material/Cloud';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    FormHelperText,
    MenuItem,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useInlineErrors } from '../../../hooks/useInlineErrors';
import type { QuotaRequest } from '../../../services/cloudPricerService';
import { createQuota } from '../../../services/cloudPricerService';
import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { numericFieldValue } from '../../../utils/numeric';
import MyCustomButton from '../../../components/MyCustomButton';
import { seLabel } from './helpers';
import { PERIODS } from './types';
import { C } from '../../../theme/tokens';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    serviceEnvironments: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
}

const CreateQuotaForm = ({ open, onClose, onCreated, serviceEnvironments, services, environments }: Props) => {
    const { t } = useTranslation();
    const [seId, setSeId] = useState('');
    const [cpu, setCpu] = useState<number>(0);
    const [ram, setRam] = useState<number>(0);
    const [storage, setStorage] = useState<number>(0);
    const [pods, setPods] = useState<number>(0);
    const [budget, setBudget] = useState<number>(0);
    const [period, setPeriod] = useState<string>('monthly');
    const [active, setActive] = useState(true);
    const [creating, setCreating] = useState(false);
    const [serverError, setServerError] = useState('');
    const { errors, setFieldError, clearFieldError, clearErrors } = useInlineErrors();

    const reset = () => {
        setSeId('');
        setCpu(0);
        setRam(0);
        setStorage(0);
        setPods(0);
        setBudget(0);
        setPeriod('monthly');
        setActive(true);
        clearErrors();
        setServerError('');
    };

    const handleCreate = async () => {
        clearErrors();
        setServerError('');
        if (!seId.trim()) return setFieldError('seId', 'Service environment ID is required');
        setCreating(true);
        try {
            const request: QuotaRequest = {
                serviceEnvironmentId: seId,
                maxCpu: cpu,
                maxRam: ram,
                maxStorage: storage,
                maxPods: pods,
                maxBudget: budget,
                period,
                isActive: active
            };
            await createQuota(request);
            toast.success(t('quotas.createSuccess'));
            reset();
            onClose();
            await onCreated();
        } catch (e: unknown) {
            setServerError(getErrorMessage(e, 'Failed to create quota'));
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: 'linear-gradient(135deg, #E4EEF7 0%, #FFFFFF 100%)',
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: '#E4EEF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloudIcon sx={{ color: '#2E5C8A', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {t('quotas.newQuota')}
                </Typography>
            </Box>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {serverError && (
                        <Alert severity="error" onClose={() => setServerError('')} sx={{ borderRadius: 2, whiteSpace: 'pre-line' }}>
                            {serverError}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        select
                        label={t('quotas.serviceEnvironment')}
                        value={seId}
                        onChange={(e) => { setSeId(e.target.value); clearFieldError('seId'); }}
                        error={Boolean(errors.seId)}
                    >
                        <MenuItem value="" disabled>
                            {t('quotas.selectServiceEnvironment')}
                        </MenuItem>
                        {serviceEnvironments.map((se) => (
                            <MenuItem key={se.id} value={se.id}>
                                {seLabel(se, services, environments)}
                            </MenuItem>
                        ))}
                    </TextField>
                    {errors.seId && <FormHelperText error>{errors.seId}</FormHelperText>}
                    <Typography variant="caption" sx={{ color: C.muted }}>
                        {t('quotas.belowUsageHint')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                        <TextField fullWidth type="number" label={t('quotas.maxCpu')} value={cpu} onChange={(e) => setCpu(Number(numericFieldValue(e.target.value)))}
                            helperText="CPU cores" slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField fullWidth type="number" label={t('quotas.maxRam')} value={ram} onChange={(e) => setRam(Number(numericFieldValue(e.target.value)))}
                            helperText="RAM en Mo" slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField fullWidth type="number" label={t('quotas.maxStorage')} value={storage} onChange={(e) => setStorage(Number(numericFieldValue(e.target.value)))}
                            helperText="Stockage en GB" slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField fullWidth type="number" label={t('quotas.maxPods')} value={pods} onChange={(e) => setPods(Number(numericFieldValue(e.target.value)))}
                            helperText="Nombre max de pods" slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField fullWidth type="number" label={t('quotas.maxBudget')} value={budget} onChange={(e) => setBudget(Number(numericFieldValue(e.target.value)))}
                            helperText="Budget max ($)" slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField fullWidth select label={t('quotas.period')} value={period} onChange={(e) => setPeriod(e.target.value)}
                            helperText="Période de la quota">
                            {PERIODS.map((p) => (
                                <MenuItem key={p} value={p}>{t('periods.' + p)}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                        <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: C.text }}>
                                {active ? t('quotas.active') : t('quotas.inactive')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: C.muted }}>
                                {active ? 'La quota est appliquée activement' : 'La quota est désactivée'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>{t('common.cancel')}</Button>
                <MyCustomButton onClick={handleCreate} disabled={creating} sx={{ px: 4 }}>
                    {creating ? t('quotas.creating') : t('quotas.create')}
                </MyCustomButton>
            </DialogActions>
        </Dialog>
    );
};

export default CreateQuotaForm;