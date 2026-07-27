import { Add as AddIcon, Close as CloseIcon, ExpandMore as ExpandMoreIcon, Remove as RemoveIcon } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Collapse,
    FormControl,
    FormControlLabel,
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

import { getStoredUser } from '../../../services/authStorage';
import type { EnvironmentResponse, ServiceEnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import type { DeploymentTemplate, K8sDeploymentRequest, ProbeConfig } from '../../../services/k8sService';
import { k8sService } from '../../../services/k8sService';
import { getErrorMessage } from '../../../utils/errorMessage';
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
    const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [form, setForm] = useState<K8sDeploymentRequest>({
        name: '',
        dockerImage: '',
        replicas: 1,
        port: 80,
        targetPort: 80,
        protocol: 'TCP',
        namespace: 'default',
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

    useEffect(() => {
        if (open) {
            const user = getStoredUser();
            k8sService.listTemplates(user?.tenantId).then(setTemplates).catch(() => {});
        }
    }, [open]);

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
        if (!form.name.trim()) return toast.error('Name is required');
        if (!form.dockerImage.trim()) return toast.error('Docker image is required');
        if (!IMAGE_REGEX.test(form.dockerImage.trim()))
            return toast.error('Invalid image format. Use name:tag (e.g. nginx:1.25)');
        if (!form.serviceEnvironmentId) return toast.error('Select a Service Environment');
        if (form.replicas < 0 || form.replicas > MAX_REPLICAS) return toast.error(`Replicas must be 0-${MAX_REPLICAS}`);
        if (form.cpuLimit && !CPU_REGEX.test(form.cpuLimit))
            return toast.error('CPU limit must be in format like 500m or 0.5');
        if (form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit))
            return toast.error('Memory limit must be in format like 512Mi or 2Gi');
        if (form.cpuRequest && !CPU_REGEX.test(form.cpuRequest))
            return toast.error('CPU request must be in format like 500m or 0.5');
        if (form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest))
            return toast.error('Memory request must be in format like 512Mi or 2Gi');

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
            toast.success('Deployment created');
            setForm({
                name: '',
                dockerImage: '',
                replicas: 1,
                port: 80,
                targetPort: 80,
                protocol: 'TCP',
                namespace: 'default',
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
            toast.error(getErrorMessage(e, 'Failed to create deployment'));
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
                                onChange={(e) => setProbe(type, { port: Number(e.target.value) })}
                                slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probeDelay')} value={probe.initialDelaySeconds}
                                onChange={(e) => setProbe(type, { initialDelaySeconds: Number(e.target.value) })}
                                slotProps={{ htmlInput: { min: 0 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probePeriod')} value={probe.periodSeconds}
                                onChange={(e) => setProbe(type, { periodSeconds: Number(e.target.value) })}
                                slotProps={{ htmlInput: { min: 1 } }} />
                        </Grid>
                        <Grid size={{ xs: 4, md: 2 }}>
                            <TextField size="small" fullWidth type="number" label={t('k8s.probeThreshold')} value={probe.failureThreshold}
                                onChange={(e) => setProbe(type, { failureThreshold: Number(e.target.value) })}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('k8s.createNewDeployment')}</Typography>
                        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
                    </Box>

                    {templates.length > 0 && (
                        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065F46', mb: 1 }}>Load from Template</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField size="small" select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); loadTemplate(e.target.value); }} sx={{ flex: 1 }}
                                    slotProps={{ select: { displayEmpty: true } }}>
                                    <MenuItem value=""><em>Select a template...</em></MenuItem>
                                    {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.dockerImage})</MenuItem>)}
                                </TextField>
                                {selectedTemplate && (
                                    <Button size="small" variant="outlined" onClick={() => { setSelectedTemplate(''); resetForm(); }}
                                        sx={{ whiteSpace: 'nowrap', color: C.muted, borderColor: C.border }}>Clear</Button>
                                )}
                            </Box>
                        </Box>
                    )}

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth required label={t('common.name')} value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('k8s.namePlaceholder')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth required label={t('k8s.dockerImage')} value={form.dockerImage}
                                onChange={(e) => setForm((p) => ({ ...p, dockerImage: e.target.value }))}
                                placeholder={t('k8s.dockerPlaceholder')}
                                error={form.dockerImage.length > 0 && !IMAGE_REGEX.test(form.dockerImage)}
                                helperText={form.dockerImage.length > 0 && !IMAGE_REGEX.test(form.dockerImage)
                                    ? t('k8s.dockerErrorFormat') : t('k8s.dockerHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.namespace')} value={form.namespace}
                                onChange={(e) => setForm((p) => ({ ...p, namespace: e.target.value }))} placeholder="default" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth type="number" label={t('k8s.replicas')} value={form.replicas}
                                onChange={(e) => setForm((p) => ({ ...p, replicas: Math.min(Number(e.target.value), MAX_REPLICAS) }))}
                                slotProps={{ htmlInput: { min: 0, max: MAX_REPLICAS } }} helperText={t('k8s.maxReplicas', { max: MAX_REPLICAS })} />
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
                                onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))}
                                slotProps={{ htmlInput: { min: 1, max: 65535 } }} placeholder="e.g. 80"
                                helperText={t('k8s.containerPortHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth type="number" label={t('k8s.targetPort')} value={form.targetPort || ''}
                                onChange={(e) => setForm((p) => ({ ...p, targetPort: Number(e.target.value) }))}
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
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.cpuRequest')} value={form.cpuRequest}
                                onChange={(e) => setForm((p) => ({ ...p, cpuRequest: e.target.value }))}
                                placeholder={t('k8s.cpuPlaceholder')}
                                error={!!form.cpuRequest && !CPU_REGEX.test(form.cpuRequest)}
                                helperText={!!form.cpuRequest && !CPU_REGEX.test(form.cpuRequest)
                                    ? t('k8s.cpuErrorFormat') : t('k8s.cpuRequestHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.cpuLimit')} value={form.cpuLimit}
                                onChange={(e) => setForm((p) => ({ ...p, cpuLimit: e.target.value }))}
                                placeholder={t('k8s.cpuLimitPlaceholder')}
                                error={!!form.cpuLimit && !CPU_REGEX.test(form.cpuLimit)}
                                helperText={!!form.cpuLimit && !CPU_REGEX.test(form.cpuLimit)
                                    ? t('k8s.cpuErrorFormat') : t('k8s.cpuLimitHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.memRequest')} value={form.memoryRequest}
                                onChange={(e) => setForm((p) => ({ ...p, memoryRequest: e.target.value }))}
                                placeholder={t('k8s.memPlaceholder')}
                                error={!!form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest)}
                                helperText={!!form.memoryRequest && !MEMORY_REGEX.test(form.memoryRequest)
                                    ? t('k8s.memErrorFormat') : t('k8s.memRequestHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField fullWidth label={t('k8s.memLimit')} value={form.memoryLimit}
                                onChange={(e) => setForm((p) => ({ ...p, memoryLimit: e.target.value }))}
                                placeholder={t('k8s.memLimitPlaceholder')}
                                error={!!form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit)}
                                helperText={!!form.memoryLimit && !MEMORY_REGEX.test(form.memoryLimit)
                                    ? t('k8s.memErrorFormat') : t('k8s.memLimitHint')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth required>
                                <InputLabel>{t('k8s.serviceEnvironment')}</InputLabel>
                                <Select value={form.serviceEnvironmentId} label={t('k8s.serviceEnvironment')}
                                    onChange={(e) => setForm((p) => ({ ...p, serviceEnvironmentId: e.target.value }))}>
                                    {serviceEnvs.length === 0 && <MenuItem disabled value=""><em>{t('k8s.noServiceEnvs')}</em></MenuItem>}
                                    {serviceEnvs.map((se) => {
                                        const svc = services.find((s) => s.id === se.serviceId)?.name ?? se.serviceId.slice(0, 8);
                                        const env = environments.find((e) => e.id === se.environmentId)?.name ?? se.environmentId.slice(0, 8);
                                        return <MenuItem key={se.id} value={se.id}>{svc} / {env}</MenuItem>;
                                    })}
                                </Select>
                            </FormControl>
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
