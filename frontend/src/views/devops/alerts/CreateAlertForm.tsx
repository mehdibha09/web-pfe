import Grid from '@mui/material/Grid';
import { Box, Button, Divider, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { AlertRequest } from '../../../services/cloudPricerService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { TYPES, SEVERITIES } from './constants';
import { BTN, C } from '../../../theme/tokens';
import { getStoredUser } from '../../../services/authStorage';
import { isSuperAdmin } from '../../../services/authorization';
import { listServiceEnvironments } from '../../../services/devopsService';
import type { ServiceEnvironmentResponse } from '../../../services/devopsService';
import { listTenants } from '../../../services/adminService';
import type { TenantResponse } from '../../../services/adminService';

interface CreateAlertFormProps {
    onCreated: () => void;
}

const serviceEnvLabel = (env: ServiceEnvironmentResponse) => {
    if (env.serviceName && env.environmentName) return `${env.serviceName} / ${env.environmentName}`;
    if (env.serviceName) return env.serviceName;
    if (env.environmentName) return env.environmentName;
    return env.id;
};

const CreateAlertForm = ({ onCreated }: CreateAlertFormProps) => {
    const { t } = useTranslation();
    const user = getStoredUser();
    const superAdmin = user ? isSuperAdmin(user) : false;

    const [tenants, setTenants] = useState<TenantResponse[]>([]);
    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironmentResponse[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [loadingEnvs, setLoadingEnvs] = useState(false);

    const [creating, setCreating] = useState(false);
    const [formTenantId, setFormTenantId] = useState(superAdmin ? '' : (user?.tenantId ?? ''));
    const [formSeId, setFormSeId] = useState('');
    const [formType, setFormType] = useState<string>(TYPES[0]);
    const [formMetric, setFormMetric] = useState('');
    const [formThreshold, setFormThreshold] = useState('');
    const [formActualValue, setFormActualValue] = useState('');
    const [formSeverity, setFormSeverity] = useState<string>(SEVERITIES[0]);
    const [formMessage, setFormMessage] = useState('');

    useEffect(() => {
        let active = true;

        setLoadingEnvs(true);
        listServiceEnvironments()
            .then((envs) => {
                if (active) setServiceEnvironments(envs);
            })
            .catch((e: unknown) => toast.error(getErrorMessage(e, t('common.error'))))
            .finally(() => {
                if (active) setLoadingEnvs(false);
            });

        if (superAdmin) {
            setLoadingTenants(true);
            listTenants()
                .then((items) => {
                    if (active) setTenants(items);
                })
                .catch((e: unknown) => toast.error(getErrorMessage(e, t('common.error'))))
                .finally(() => {
                    if (active) setLoadingTenants(false);
                });
        }

        return () => {
            active = false;
        };
    }, [superAdmin, t]);

    const availableEnvs = useMemo(
        () => serviceEnvironments.filter((env) => env.tenantId === formTenantId),
        [serviceEnvironments, formTenantId]
    );

    const handleTenantChange = (value: string) => {
        setFormTenantId(value);
        setFormSeId('');
    };

    const resetForm = () => {
        setFormTenantId(superAdmin ? '' : (user?.tenantId ?? ''));
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
        <Box
            sx={{
                p: 2.5,
                borderRadius: 3,
                background: '#FFFFFF',
                border: `1px solid ${C.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
        >
            <Grid container spacing={3}>
                {superAdmin && (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            fullWidth
                            select
                            label={t('alerts.tenantId')}
                            value={formTenantId}
                            onChange={(e) => handleTenantChange(e.target.value)}
                            disabled={loadingTenants}
                            sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                        >
                            {tenants.map((tenant) => (
                                <MenuItem key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        select
                        label={t('alerts.serviceEnvironmentId')}
                        value={formSeId}
                        onChange={(e) => setFormSeId(e.target.value)}
                        disabled={!formTenantId || loadingEnvs}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    >
                        {availableEnvs.map((env) => (
                            <MenuItem key={env.id} value={env.id}>
                                {serviceEnvLabel(env)}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        select
                        label={t('alerts.type')}
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    >
                        {TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        label={t('alerts.metric')}
                        value={formMetric}
                        onChange={(e) => setFormMetric(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        label={t('alerts.threshold')}
                        type="number"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        label={t('alerts.actualValue')}
                        type="number"
                        value={formActualValue}
                        onChange={(e) => setFormActualValue(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        select
                        label={t('alerts.severity')}
                        value={formSeverity}
                        onChange={(e) => setFormSeverity(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    >
                        {SEVERITIES.map((severity) => (
                            <MenuItem key={severity} value={severity}>
                                {severity}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        fullWidth
                        label={t('alerts.message')}
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: C.border }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ color: C.subtle }}>
                    {creating ? t('alerts.creating') : ''}
                </Typography>
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
        </Box>
    );
};

export default CreateAlertForm;
