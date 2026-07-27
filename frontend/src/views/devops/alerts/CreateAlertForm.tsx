import Grid from '@mui/material/Grid';
import { Box, Button, MenuItem, TextField } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { AlertRequest, AlertResponse } from '../../../services/cloudPricerService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { TYPES, SEVERITIES } from './constants';
import { BTN } from '../../../theme/tokens';

interface CreateAlertFormProps {
    onCreated: () => void;
}

const CreateAlertForm = ({ onCreated }: CreateAlertFormProps) => {
    const { t } = useTranslation();
    const [creating, setCreating] = useState(false);
    const [formTenantId, setFormTenantId] = useState('');
    const [formSeId, setFormSeId] = useState('');
    const [formType, setFormType] = useState<string>(TYPES[0]);
    const [formMetric, setFormMetric] = useState('');
    const [formThreshold, setFormThreshold] = useState('');
    const [formActualValue, setFormActualValue] = useState('');
    const [formSeverity, setFormSeverity] = useState<string>(SEVERITIES[0]);
    const [formMessage, setFormMessage] = useState('');

    const resetForm = () => {
        setFormTenantId('');
        setFormSeId('');
        setFormMetric('');
        setFormThreshold('');
        setFormActualValue('');
        setFormMessage('');
    };

    const handleCreate = async () => {
        if (!formTenantId.trim()) return toast.error(t('alerts.tenantIdRequired'));
        if (!formSeId.trim()) return toast.error(t('alerts.serviceEnvIdRequired'));
        if (!formMetric.trim()) return toast.error(t('alerts.metricRequired'));
        if (!formThreshold.trim()) return toast.error(t('alerts.thresholdRequired'));
        if (!formActualValue.trim()) return toast.error(t('alerts.actualValueRequired'));
        if (!formMessage.trim()) return toast.error(t('alerts.messageRequired'));

        setCreating(true);
        try {
            const { default: axiosInstance } = await import('../../../services/axiosInstance');
            await axiosInstance.post('/alerts', {
                tenantId: formTenantId.trim(),
                serviceEnvironmentId: formSeId.trim(),
                type: formType,
                metric: formMetric.trim(),
                threshold: Number(formThreshold),
                actualValue: Number(formActualValue),
                severity: formSeverity,
                message: formMessage.trim()
            } satisfies AlertRequest);
            toast.success(t('alerts.created'));
            resetForm();
            onCreated();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('alerts.failedToCreate')));
        } finally {
            setCreating(false);
        }
    };

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.tenantId')} value={formTenantId} onChange={(e) => setFormTenantId(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.serviceEnvironmentId')} value={formSeId} onChange={(e) => setFormSeId(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth select label={t('alerts.type')} value={formType} onChange={(e) => setFormType(e.target.value)}>
                    {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.metric')} value={formMetric} onChange={(e) => setFormMetric(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.threshold')} type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.actualValue')} type="number" value={formActualValue} onChange={(e) => setFormActualValue(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth select label={t('alerts.severity')} value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)}>
                    {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label={t('alerts.message')} value={formMessage} onChange={(e) => setFormMessage(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating}
                        sx={{
                            px: 4,
                            fontWeight: 700,
                            background: BTN.primary.gradient,
                            borderRadius: 2,
                            boxShadow: `0 4px 12px rgba(228,71,125,0.3)`,
                            '&:hover': { boxShadow: '0 6px 16px rgba(228,71,125,0.4)' }
                        }}
                    >
                        {creating ? t('alerts.creating') : t('common.create')}
                    </Button>
                </Box>
            </Grid>
        </Grid>
    );
};

export default CreateAlertForm;
