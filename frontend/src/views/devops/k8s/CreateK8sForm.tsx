import { Add as AddIcon, Close as CloseIcon, ExpandMore as ExpandMoreIcon, RocketLaunch as RocketIcon, Remove as RemoveIcon } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Collapse,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useInlineErrors } from '../../../hooks/useInlineErrors';
import { getStoredUser } from '../../../services/authStorage';
import type { EnvironmentResponse, ServiceEnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import type { DeploymentTemplate, K8sDeploymentRequest, ProbeConfig } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { listQuotas } from '../../../services/cloudPricerService';
import type { QuotaResponse } from '../../../services/cloudPricerService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { numericFieldValue } from '../../../utils/numeric';
import {
    C,
    CPU_REGEX,
    IMAGE_PULL_POLICIES,
    IMAGE_REGEX,
    MAX_REPLICAS,
    MEMORY_REGEX,
    PROTOCOLS,
    RESTART_POLICIES,
    SERVICE_TYPES,
    type EnvVar
} from './constants';

interface CreateK8sFormProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    serviceEnvs: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
}

const defaultProbe = (overrides?: Partial<ProbeConfig>): ProbeConfig => ({
    enabled: false,
    path: '/health',
    port: 8080,
    initialDelaySeconds: 30,
    periodSeconds: 10,
    failureThreshold: 3,
    ...overrides
});

const CreateK8sForm = ({ open, onClose, onCreated, serviceEnvs, services, environments }: CreateK8sFormProps) => {
    const { t } = useTranslation();
    const [creating, setCreating] = useState(false);
    const [serverError, setServerError] = useState('');
    const {
        errors,
        setFieldError,
        clearFieldError,
        clearErrors,
        fieldProps
    } = useInlineErrors();
    const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [form, setForm] = useState<K8sDeploymentRequest>({
        name: '',
        dockerImage: '',
        replicas: 1,
        port: 80,
        targetPort: 80,
        protocol: 'TCP',
        tenantId: '',
        serviceEnvironmentId: '',
        envVars: '',
        secrets: '',
        cpuLimit: '',
        memoryLimit: '',
        cpuRequest: '',
        memoryRequest: '',
        imagePullPolicy: 'IfNotPresent',
        serviceType: 'ClusterIP',
        restartPolicy: 'Always',
        labels: '',
        livenessProbe: defaultProbe({ path: '/health', initialDelaySeconds: 30 }),
        readinessProbe: defaultProbe({ path: '/ready', initialDelaySeconds: 5, periodSeconds: 5 }),
        startupProbe: defaultProbe({ enabled: false, path: '/health', failureThreshold: 30, periodSeconds: 10 })
    });
    const [configMapVars, setConfigMapVars] = useState<EnvVar[]>([]);
    const [secretVars, setSecretVars] = useState<EnvVar[]>([]);
    const [quotas, setQuotas] = useState<QuotaResponse[]>([]);

    useEffect(() => {
        if (open) {
            const user = getStoredUser();
            k8sService.listTemplates(user?.tenantId).then(setTemplates).catch(() => {});
            listQuotas().then(setQuotas).catch(() => setQuotas([]));
        }
    }, [open]);

    const hasActiveQuota = (seId: string): boolean =>
        quotas.some((q) => q.serviceEnvironmentId === seId && q.isActive);

    const loadTemplate = (templateId: string) => {
        const tpl = templates.find((t) => t.id === templateId);
        if (!tpl) return;
        setForm((p) => ({
            ...p,
            dockerImage: tpl.dockerImage,
            port: tpl.port,
            protocol: tpl.protocol || 'TCP',
            cpuLimit: tpl.cpuLimit || '',
            memoryLimit: tpl.memoryLimit || '',
            cpuRequest: tpl.cpuRequest || '',
            memoryRequest: tpl.memoryRequest || '',
            envVars: tpl.envVars || '',
            labels: tpl.labels || '',
            imagePullPolicy: tpl.imagePullPolicy || 'IfNotPresent',
            serviceType: tpl.serviceType || 'ClusterIP',
            restartPolicy: tpl.restartPolicy || 'Always'
        }));
        if (tpl.envVars) {
            const vars = tpl.envVars.split(',').map((s) => {
                const [k, ...v] = s.split('=');
                return { key: k.trim(), value: v.join('=').trim() };
            }).filter((v) => v.key);
            setConfigMapVars(vars);
        }
    };

    const envVarsToString = (vars: EnvVar[]): string =>
        vars.filter((v) => v.key.trim()).map((v) => `${v.key.trim()}=${v.value}`).join(',');

    const labelsToArr = (raw: string) => raw.split(',').map((l) => l.trim()).filter(Boolean);

    const setProbe = (type: 'livenessProbe' | 'readinessProbe' | 'startupProbe', patch: Partial<ProbeConfig>) =>
        setForm((p) => ({
            ...p,
            [type]: { ...(p[type] || defaultProbe()), ...patch }
        }));

    const handleCreate = async () => {
        clearErrors();
        setServerError('');
        if (!form.name.trim()) return setFieldError('name', t('k8s.nameRequired'));
        if (!form.dockerImage.trim()) return setFieldError('dockerImage', t('k8s.dockerRequired'));
        if (!IMAGE_REGEX.test(form.dockerImage.trim()))
            return setFieldError('dockerImage', t('k8s.invalidImageFormat'));
        if (!form.serviceEnvironmentId) return setFieldError('serviceEnvironmentId', t('k8s.selectServiceEnv'));
        if (form.replicas < 0 || form.replicas > MAX_REPLICAS) return setFieldError('replicas', t('k8s.replicasRange', { max: MAX_REPLICAS }));
        if (form.cpuLimit && !CPU_REGEX.test(form.cpuLimit))
            return setFieldError('cpuLimit', 'CPU limit must be in format like 500m or 0.5');
        if (form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit))
            return setFieldError('memoryLimit', 'Memory limit must be in format like 512Mi or 2Gi');
        if (form.cpuRequest && !CPU_REGEX.test(form.cpuRequest))
            return setFieldError('cpuRequest', 'CPU request must be in format like 500m or 0.5');
        if (form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest))
            return setFieldError('memoryRequest', 'Memory request must be in format like 512Mi or 2Gi');

        setCreating(true);
        try {
            const user = getStoredUser();
            await k8sService.create({
                ...form,
                name: form.name.trim(),
                dockerImage: form.dockerImage.trim(),
                tenantId: user?.tenantId ?? '',
                envVars: envVarsToString(configMapVars) || undefined,
                secrets: envVarsToString(secretVars) || undefined,
                labels: form.labels ? labelsToArr(form.labels).join(',') : undefined,
                livenessProbe: form.livenessProbe?.enabled ? form.livenessProbe : undefined,
                readinessProbe: form.readinessProbe?.enabled ? form.readinessProbe : undefined,
                startupProbe: form.startupProbe?.enabled ? form.startupProbe : undefined
            });
            toast.success(t('k8s.deploymentCreated'));
            setForm({
                name: '',
                dockerImage: '',
                replicas: 1,
                port: 80,
                targetPort: 80,
                protocol: 'TCP',
                tenantId: '',
                serviceEnvironmentId: '',
                envVars: '',
                secrets: '',
                cpuLimit: '',
                memoryLimit: '',
                cpuRequest: '',
                memoryRequest: '',
                imagePullPolicy: 'IfNotPresent',
                serviceType: 'ClusterIP',
                restartPolicy: 'Always',
                labels: '',
                livenessProbe: defaultProbe({ path: '/health', initialDelaySeconds: 30 }),
                readinessProbe: defaultProbe({ path: '/ready', initialDelaySeconds: 5, periodSeconds: 5 }),
                startupProbe: defaultProbe({ enabled: false, path: '/health', failureThreshold: 30, periodSeconds: 10 })
            });
            setConfigMapVars([]);
            setSecretVars([]);
            onClose();
            onCreated();
        } catch (e: unknown) {
            setServerError(getErrorMessage(e, t('k8s.createDeploymentError')));
        } finally {
            setCreating(false);
        }
    };

    const probeFields = (type: 'livenessProbe' | 'readinessProbe' | 'startupProbe', label: string) => {
        const probe = form[type] || defaultProbe();
        return (
            <Box sx={{ border: `1px solid ${C.border}`, borderRadius: 2, p: 2, mb: 1.5 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={probe.enabled}
                            onChange={(e) => setProbe(type, { enabled: e.target.checked })}
                        />
                    }
                    label={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{label}</Typography>}
                    sx={{ mb: 1 }}
                />
                <Collapse in={probe.enabled}>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField size="small" fullWidth label={t('k8s.probePath')} value={probe.path}
                                onChange={(e) => setProbe(type, { path: e.target.value })} placeholder="/health" />
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probePort')} value={probe.port}
                                onChange={(e) => setProbe(type, { port: Number(numericFieldValue(e.target.value)) })}
                                slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probeDelay')} value={probe.initialDelaySeconds}
                                onChange={(e) => setProbe(type, { initialDelaySeconds: Number(numericFieldValue(e.target.value)) })}
                                slotProps={{ htmlInput: { min: 0 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probePeriod')} value={probe.periodSeconds}
                                onChange={(e) => setProbe(type, { periodSeconds: Number(numericFieldValue(e.target.value)) })}
                                slotProps={{ htmlInput: { min: 1 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probeThreshold')} value={probe.failureThreshold}
                                onChange={(e) => setProbe(type, { failureThreshold: Number(numericFieldValue(e.target.value)) })}
                                slotProps={{ htmlInput: { min: 1 } }} />
                        </Grid>
                    </Grid>
                </Collapse>
            </Box>
        );
    };

    const envVarSection = (label: string, vars: EnvVar[], setVars: (v: EnvVar[]) => void, secret: boolean) => (
        <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {label} {secret && <Typography component="span" sx={{ fontSize: 11, color: C.danger }}>🔒</Typography>}
            </Typography>
            {vars.map((ev, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField size="small" label={t('k8s.envKey')} value={ev.key}
                        onChange={(e) => { const n = [...vars]; n[idx] = { ...n[idx], key: e.target.value }; setVars(n); }}
                        placeholder="MY_VAR" sx={{ flex: 1 }} />
                    <TextField size="small" label={t('k8s.envValue')} value={ev.value} type={secret ? 'password' : 'text'}
                        onChange={(e) => { const n = [...vars]; n[idx] = { ...n[idx], value: e.target.value }; setVars(n); }}
                        placeholder={secret ? '••••••••' : 'value'} sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => setVars(vars.filter((_, i) => i !== idx))} sx={{ color: C.danger }}>
                        <RemoveIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setVars([...vars, { key: '', value: '' }])}
                sx={{ textTransform: 'none', color: C.brand, fontWeight: 600 }}>
                {secret ? t('k8s.addSecret') : t('k8s.addVariable')}
            </Button>
        </Box>
    );

    return (
        <Collapse in={open}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <CardContent>
                    <Box sx={{
                        background: `linear-gradient(135deg, ${C.brandLight} 0%, #FFFFFF 100%)`,
                        px: 2.5, py: 2, mb: 2.5,
                        borderRadius: 2,
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        border: `1px solid ${C.border}`
                    }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RocketIcon sx={{ color: C.brand, fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                                {t('k8s.createNewDeployment')}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: C.muted }}>
                                {t('k8s.createDeploymentSubtitle')}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                    {serverError && (
                        <Alert severity="error" onClose={() => setServerError('')} sx={{ borderRadius: 2, mb: 2, whiteSpace: 'pre-line' }}>
                            {serverError}
                        </Alert>
                    )}

                    {templates.length > 0 && (
                        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065F46', mb: 1 }}>{t('k8s.loadFromTemplate')}</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField size="small" select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); loadTemplate(e.target.value); }} sx={{ flex: 1 }}
                                    slotProps={{ select: { displayEmpty: true } }}>
                                    <MenuItem value=""><em>{t('k8s.selectTemplate')}</em></MenuItem>
                                    {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.dockerImage})</MenuItem>)}
                                </TextField>
                                {selectedTemplate && (
                                    <Button size="small" variant="outlined" onClick={() => { setSelectedTemplate(''); setForm({ name: '', dockerImage: '', replicas: 1, port: 80, targetPort: 80, protocol: 'TCP', tenantId: '', serviceEnvironmentId: '', envVars: '', secrets: '', cpuLimit: '', memoryLimit: '', cpuRequest: '', memoryRequest: '', imagePullPolicy: 'IfNotPresent', serviceType: 'ClusterIP', restartPolicy: 'Always', labels: '', livenessProbe: defaultProbe({ path: '/health', initialDelaySeconds: 30 }), readinessProbe: defaultProbe({ path: '/ready', initialDelaySeconds: 5, periodSeconds: 5 }), startupProbe: defaultProbe({ enabled: false, path: '/health', failureThreshold: 30, periodSeconds: 10 }) }); }}
                                        sx={{ whiteSpace: 'nowrap', color: C.muted, borderColor: C.border }}>{t('k8s.clear')}</Button>
                                )}
                            </Box>
                        </Box>
                    )}

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                                {t('k8s.sectionGeneral')}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth required label={t('common.name')} value={form.name}
                                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); clearFieldError('name'); }} placeholder={t('k8s.namePlaceholder')} {...fieldProps('name')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth required label={t('k8s.dockerImage')} value={form.dockerImage}
                                onChange={(e) => { setForm((p) => ({ ...p, dockerImage: e.target.value })); clearFieldError('dockerImage'); }}
                                placeholder={t('k8s.dockerPlaceholder')}
                                error={Boolean(errors.dockerImage) || (form.dockerImage.length > 0 && !IMAGE_REGEX.test(form.dockerImage))}
                                helperText={errors.dockerImage || (form.dockerImage.length > 0 && !IMAGE_REGEX.test(form.dockerImage)
                                    ? t('k8s.dockerErrorFormat') : t('k8s.dockerHint'))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth type="number" label={t('k8s.replicas')} value={form.replicas}
                                onChange={(e) => { setForm((p) => ({ ...p, replicas: Math.min(Number(numericFieldValue(e.target.value)), MAX_REPLICAS) })); clearFieldError('replicas'); }}
                                slotProps={{ htmlInput: { min: 0, max: MAX_REPLICAS } }}
                                helperText={errors.replicas || t('k8s.maxReplicas', { max: MAX_REPLICAS })}
                                error={Boolean(errors.replicas)} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                                {t('k8s.sectionNetworking')}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>{t('k8s.protocol')}</InputLabel>
                                <Select value={form.protocol} label={t('k8s.protocol')}
                                    onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}>
                                    {PROTOCOLS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth type="number" label={t('k8s.containerPort')} value={form.port || ''}
                                onChange={(e) => setForm((p) => ({ ...p, port: Number(numericFieldValue(e.target.value)) }))}
                                slotProps={{ htmlInput: { min: 1, max: 65535 } }} placeholder="e.g. 80"
                                helperText={t('k8s.containerPortHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth type="number" label={t('k8s.targetPort')} value={form.targetPort || ''}
                                onChange={(e) => setForm((p) => ({ ...p, targetPort: Number(numericFieldValue(e.target.value)) }))}
                                slotProps={{ htmlInput: { min: 1, max: 65535 } }} placeholder="e.g. 80"
                                helperText={t('k8s.targetPortHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>{t('k8s.serviceType')}</InputLabel>
                                <Select value={form.serviceType} label={t('k8s.serviceType')}
                                    onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}>
                                    {SERVICE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>{t('k8s.imagePullPolicy')}</InputLabel>
                                <Select value={form.imagePullPolicy} label={t('k8s.imagePullPolicy')}
                                    onChange={(e) => setForm((p) => ({ ...p, imagePullPolicy: e.target.value }))}>
                                    {IMAGE_PULL_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>{t('k8s.restartPolicy')}</InputLabel>
                                <Select value={form.restartPolicy} label={t('k8s.restartPolicy')}
                                    onChange={(e) => setForm((p) => ({ ...p, restartPolicy: e.target.value }))}>
                                    {RESTART_POLICIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                                {t('k8s.sectionResources')}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.cpuRequest')} value={form.cpuRequest}
                                onChange={(e) => { setForm((p) => ({ ...p, cpuRequest: e.target.value })); clearFieldError('cpuRequest'); }}
                                placeholder={t('k8s.cpuPlaceholder')}
                                error={Boolean(errors.cpuRequest) || (!!form.cpuRequest && !CPU_REGEX.test(form.cpuRequest))}
                                helperText={errors.cpuRequest || (!!form.cpuRequest && !CPU_REGEX.test(form.cpuRequest)
                                    ? t('k8s.cpuErrorFormat') : t('k8s.cpuRequestHint'))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.cpuLimit')} value={form.cpuLimit}
                                onChange={(e) => { setForm((p) => ({ ...p, cpuLimit: e.target.value })); clearFieldError('cpuLimit'); }}
                                placeholder={t('k8s.cpuLimitPlaceholder')}
                                error={Boolean(errors.cpuLimit) || (!!form.cpuLimit && !CPU_REGEX.test(form.cpuLimit))}
                                helperText={errors.cpuLimit || (!!form.cpuLimit && !CPU_REGEX.test(form.cpuLimit)
                                    ? t('k8s.cpuErrorFormat') : t('k8s.cpuLimitHint'))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.memRequest')} value={form.memoryRequest}
                                onChange={(e) => { setForm((p) => ({ ...p, memoryRequest: e.target.value })); clearFieldError('memoryRequest'); }}
                                placeholder={t('k8s.memPlaceholder')}
                                error={Boolean(errors.memoryRequest) || (!!form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest))}
                                helperText={errors.memoryRequest || (!!form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest)
                                    ? t('k8s.memErrorFormat') : t('k8s.memRequestHint'))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.memLimit')} value={form.memoryLimit}
                                onChange={(e) => { setForm((p) => ({ ...p, memoryLimit: e.target.value })); clearFieldError('memoryLimit'); }}
                                placeholder={t('k8s.memLimitPlaceholder')}
                                error={Boolean(errors.memoryLimit) || (!!form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit))}
                                helperText={errors.memoryLimit || (!!form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit)
                                    ? t('k8s.memErrorFormat') : t('k8s.memLimitHint'))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth required error={Boolean(errors.serviceEnvironmentId)}>
                                <InputLabel>{t('k8s.serviceEnvironment')}</InputLabel>
                                <Select value={form.serviceEnvironmentId} label={t('k8s.serviceEnvironment')}
                                    onChange={(e) => { setForm((p) => ({ ...p, serviceEnvironmentId: e.target.value })); clearFieldError('serviceEnvironmentId'); }}>
                                    {serviceEnvs.length === 0 && <MenuItem disabled value=""><em>{t('k8s.noServiceEnvs')}</em></MenuItem>}
                                    {serviceEnvs.map((se) => {
                                        const svc = services.find((s) => s.id === se.serviceId)?.name ?? se.serviceId.slice(0, 8);
                                        const env = environments.find((e) => e.id === se.environmentId)?.name ?? se.environmentId.slice(0, 8);
                                        return <MenuItem key={se.id} value={se.id}>{svc} / {env}</MenuItem>;
                                    })}
                                </Select>
                                {errors.serviceEnvironmentId && <FormHelperText error>{errors.serviceEnvironmentId}</FormHelperText>}
                            </FormControl>
                            {form.serviceEnvironmentId && !hasActiveQuota(form.serviceEnvironmentId) && (
                                <Box sx={{ mt: 1, p: 1, borderRadius: 2, backgroundColor: C.brandLight, border: `1px solid ${C.brandLight}` }}>
                                    <Typography sx={{ fontSize: 12, color: C.brand, fontWeight: 600 }}>
                                        {t('k8s.unlimitedQuotaNote')}
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.labels')} value={form.labels}
                                onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))}
                                placeholder={t('k8s.labelsPlaceholder')} helperText={t('k8s.labelsHint')} />
                        </Grid>

                        {/* ConfigMap & Secrets */}
                        <Grid size={{ xs: 12 }}>
                            <Accordion defaultExpanded={false} sx={{ boxShadow: 'none', border: `1px solid ${C.border}`, borderRadius: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                                        {t('k8s.envVars')}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            {envVarSection(t('k8s.configMap'), configMapVars, setConfigMapVars, false)}
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            {envVarSection(t('k8s.secretsSection'), secretVars, setSecretVars, true)}
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* Health Checks */}
                        <Grid size={{ xs: 12 }}>
                            <Accordion defaultExpanded={false} sx={{ boxShadow: 'none', border: `1px solid ${C.border}`, borderRadius: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                                        {t('k8s.healthChecks')}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {probeFields('livenessProbe', t('k8s.livenessProbe'))}
                                    {probeFields('readinessProbe', t('k8s.readinessProbe'))}
                                    {probeFields('startupProbe', t('k8s.startupProbe'))}
                                </AccordionDetails>
                            </Accordion>
                        </Grid>
                    </Grid>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant="outlined" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={creating}
                        startIcon={creating ? <LoadingSpinner size={14} variant="inline" /> : <AddIcon />}
                        sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, fontWeight: 700 }}>
                        {creating ? t('k8s.creating') : t('k8s.createDeployment')}
                    </Button>
                </CardActions>
            </Card>
        </Collapse>
    );
};

export default CreateK8sForm;
