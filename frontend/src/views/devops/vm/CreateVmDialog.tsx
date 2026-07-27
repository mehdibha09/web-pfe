import AddIcon from '@mui/icons-material/Add';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import BackupIcon from '@mui/icons-material/Backup';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    Slider,
    Stack,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { serviceEnvironmentService, type ServiceEnvironment } from '../../../services/ServiceEnvironmentService';
import { vmService } from '../../../services/VmService';
import { VM_OS_OPTIONS, type CreateVmRequest, type VmOs } from '../../../services/interfaces/vm';
import { getErrorMessage } from '../../../utils/errorMessage';
import { C } from '../../../theme/tokens';

const RESOURCE_COLORS = {
    cpu: { icon: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
    ram: { icon: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
    disk: { icon: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
};

const RESOURCE_META = {
    cpu: { icon: <ComputerIcon sx={{ fontSize: 20 }} />, label: 'CPU', unit: 'cores', min: 1, max: 16, step: 1, key: 'cpu' as const },
    ram: { icon: <MemoryIcon sx={{ fontSize: 20 }} />, label: 'RAM', unit: 'MB', min: 512, max: 65536, step: 512, key: 'ram' as const },
    disk: { icon: <StorageIcon sx={{ fontSize: 20 }} />, label: 'Disk', unit: 'GB', min: 1, max: 500, step: 1, key: 'disk' as const },
};

const osColors: Record<VmOs, string> = {
    ubuntu: '#E95420',
    debian: '#A81D33',
    centos: '#262577',
    fedora: '#294172',
    windows: '#0078D4',
    alpine: '#0D597F',
    arch: '#1793D1',
    other: '#6B7280'
};

interface CreateVmDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const emptyForm: CreateVmRequest = {
    name: '',
    cpu: 2,
    ram: 2048,
    disk: 20,
    os: VM_OS_OPTIONS[0],
    tenantId: '',
    serviceEnvironmentId: '',
    backupEnabled: false
};

const formatRam = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
    return `${mb} MB`;
};

const CreateVmDialog = ({ open, onClose, onCreated }: CreateVmDialogProps) => {
    const { t } = useTranslation();
    const [form, setForm] = useState<CreateVmRequest>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [serviceEnvironments, setServiceEnvironments] = useState<ServiceEnvironment[]>([]);
    const [loadingEnvs, setLoadingEnvs] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoadingEnvs(true);
        setError(null);
        serviceEnvironmentService
            .getAll()
            .then((data) => setServiceEnvironments(data))
            .catch((err) => setError(getErrorMessage(err, 'Failed to load environments')))
            .finally(() => setLoadingEnvs(false));
    }, [open]);

    const isValid =
        form.name.trim().length > 0 &&
        form.serviceEnvironmentId.trim().length > 0 &&
        form.cpu > 0 &&
        form.ram > 0 &&
        form.disk > 0;

    const handleChange =
        <K extends keyof CreateVmRequest>(field: K) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value;
            const value: CreateVmRequest[K] =
                field === 'cpu' || field === 'ram' || field === 'disk'
                    ? (Number(raw) as CreateVmRequest[K])
                    : (raw as CreateVmRequest[K]);
            setForm((prev) => ({ ...prev, [field]: value }));
        };

    const handleSlider = (field: 'cpu' | 'ram' | 'disk') => (_: Event, value: number | number[]) => {
        setForm((prev) => ({ ...prev, [field]: value as number }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await vmService.create(form);
            setForm(emptyForm);
            onCreated();
            onClose();
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to create VM'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setError(null);
        setForm(emptyForm);
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
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                        {t('vms.createVmTitle')}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: C.muted }}>
                        {t('vms.createVmSubtitle')}
                    </Typography>
                </Box>
            </Box>

            <DialogContent sx={{ pt: 3, pb: 1 }}>
                <Stack spacing={3}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label={t('vms.vmName')}
                        value={form.name}
                        onChange={handleChange('name')}
                        required
                        fullWidth
                        autoFocus
                        slotProps={{
                            input: {
                                startAdornment: <DnsIcon sx={{ mr: 1, color: C.subtle, fontSize: 20 }} />
                            }
                        }}
                        placeholder={t('vms.vmNamePlaceholder')}
                    />

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label={t('vms.operatingSystem')}
                                value={form.os}
                                onChange={handleChange('os')}
                                fullWidth
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: osColors[form.os] || '#6B7280', mr: 1, flexShrink: 0 }} />
                                        )
                                    }
                                }}
                            >
                                {VM_OS_OPTIONS.map((os: VmOs) => (
                                    <MenuItem key={os} value={os}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: osColors[os] || '#6B7280' }} />
                                            {os.charAt(0).toUpperCase() + os.slice(1)}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label={t('vms.serviceEnvironment')}
                                value={form.serviceEnvironmentId}
                                onChange={handleChange('serviceEnvironmentId')}
                                required
                                fullWidth
                                disabled={loadingEnvs || serviceEnvironments.length === 0}
                                slotProps={{
                                    input: {
                                        startAdornment: <DnsIcon sx={{ mr: 1, color: C.subtle, fontSize: 20 }} />
                                    }
                                }}
                                helperText={loadingEnvs ? t('vms.loadingEnvironments') : !form.serviceEnvironmentId ? t('vms.selectTargetEnvironment') : undefined}
                            >
                                {serviceEnvironments.map((se) => (
                                    <MenuItem key={se.id} value={se.id}>
                                        {se.serviceName ?? se.serviceId} — {se.environmentName ?? se.environmentId}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14, color: C.text, mb: 2 }}>
                            {t('vms.resources')}
                        </Typography>
                        <Grid container spacing={2}>
                            {(['cpu', 'ram', 'disk'] as const).map((field) => {
                                const meta = RESOURCE_META[field];
                                const colors = RESOURCE_COLORS[field];
                                const val = form[field];
                                return (
                                    <Grid key={field} size={{ xs: 12, sm: 4 }}>
                                        <Paper elevation={0} sx={{
                                            p: 2, borderRadius: 2,
                                            border: '1px solid', borderColor: colors.border,
                                            background: colors.bg,
                                            height: '100%'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Box sx={{ color: colors.icon, display: 'flex' }}>{meta.icon}</Box>
                                                <Typography sx={{ fontWeight: 600, fontSize: 13, color: colors.icon }}>
                                                    {meta.label}
                                                </Typography>
                                            </Box>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, lineHeight: 1.1, mb: 1 }}>
                                                {field === 'ram' ? formatRam(val) : field === 'disk' ? `${val} GB` : val}
                                                {field === 'cpu' && <Typography component="span" sx={{ fontSize: 13, fontWeight: 500, color: C.muted, ml: 0.5 }}>{t('vms.cores')}</Typography>}
                                            </Typography>
                                            <Slider
                                                value={val}
                                                onChange={handleSlider(field)}
                                                min={meta.min}
                                                max={meta.max}
                                                step={meta.step}
                                                size="small"
                                                sx={{
                                                    color: colors.icon,
                                                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                                                    '& .MuiSlider-track': { height: 4, borderRadius: 2 },
                                                    '& .MuiSlider-rail': { height: 4, borderRadius: 2, backgroundColor: colors.border }
                                                }}
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                <Typography sx={{ fontSize: 10, color: C.subtle }}>{meta.min}{field === 'ram' ? 'MB' : field === 'disk' ? 'GB' : ''}</Typography>
                                                <Typography sx={{ fontSize: 10, color: C.subtle }}>{meta.max}{field === 'ram' ? 'GB' : ''}</Typography>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>

                    <Paper elevation={0} sx={{
                        p: 2, borderRadius: 2,
                        border: `1px solid ${C.border}`,
                        background: C.brandLight
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BackupIcon sx={{ color: C.brand, fontSize: 20 }} />
                                <Box>
                                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                                        {t('vms.automaticBackups')}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: C.muted }}>
                                        {t('vms.backupsDescription')}
                                    </Typography>
                                </Box>
                            </Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.backupEnabled}
                                        onChange={(e) => setForm((prev) => ({ ...prev, backupEnabled: e.target.checked }))}
                                    />
                                }
                                label=""
                                sx={{ m: 0 }}
                            />
                        </Box>
                    </Paper>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, borderTop: `1px solid ${C.border}`, pt: 2, gap: 1 }}>
                <Button onClick={handleClose} disabled={submitting}
                    sx={{ borderRadius: 2, fontWeight: 600, color: C.muted, px: 3 }}>
                    {t('vms.cancel')}
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!isValid || submitting}
                    startIcon={submitting ? undefined : <AddIcon />}
                    sx={{
                        borderRadius: 2, fontWeight: 600, px: 4,
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                        '&:hover': { background: C.brandDark },
                        '&.Mui-disabled': { background: '#E2E8F0' }
                    }}>
                    {submitting ? t('vms.creatingVm') : t('vms.createVm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateVmDialog;
