import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import type { Vm } from '../../../services/interfaces/vm';
import type { ServiceEnvironment } from '../../../services/interfaces/serviceEnvironment';
import { backupService } from '../../../services/backupService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { C } from '../../../theme/tokens';

interface CreateBackupFormProps {
    vms: Vm[];
    serviceEnvs: ServiceEnvironment[];
    onCreated: () => void;
    onCancel: () => void;
}

const CreateBackupForm = ({ vms, serviceEnvs, onCreated, onCancel }: CreateBackupFormProps) => {
    const { t } = useTranslation();

    const FREQUENCIES = [
        { value: '', label: t('backups.manualOnly') },
        { value: 'daily', label: t('backups.daily') },
        { value: 'weekly', label: t('backups.weekly') },
        { value: 'monthly', label: t('backups.monthly') },
    ];
    const [creating, setCreating] = useState(false);
    const [selectedVmId, setSelectedVmId] = useState('');
    const [serviceEnvId, setServiceEnvId] = useState('');
    const [notes, setNotes] = useState('');
    const [frequency, setFrequency] = useState('');
    const [retentionDays, setRetentionDays] = useState(30);
    const [maintenanceWindow, setMaintenanceWindow] = useState('02:00');

    const handleCreate = async () => {
        if (!selectedVmId) return toast.error(t('backups.selectVm'));
        if (!serviceEnvId) return toast.error(t('backups.selectServiceEnv'));

        setCreating(true);
        try {
            await backupService.create({
                vmId: selectedVmId,
                serviceEnvironmentId: serviceEnvId,
                notes: notes.trim() || undefined,
                frequency: frequency || undefined,
                retentionDays: frequency ? retentionDays : undefined,
                maintenanceWindow: frequency ? maintenanceWindow : undefined
            });
            toast.success(t('backups.createdSuccess'));
            setSelectedVmId('');
            setServiceEnvId('');
            setNotes('');
            setFrequency('');
            setRetentionDays(30);
            setMaintenanceWindow('02:00');
            onCreated();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('backups.failedToCreate')));
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 2fr' }, gap: 2 }}>
                <FormControl size="medium" sx={{ minWidth: 180 }}>
                    <InputLabel id="vm-select-label">{t('backups.vm')}</InputLabel>
                    <Select labelId="vm-select-label" value={selectedVmId} label={t('backups.vm')} onChange={(e) => setSelectedVmId(e.target.value)}>
                        {vms.map((vm) => (
                            <MenuItem key={vm.id} value={vm.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{vm.name}</Typography>
                                    <Typography sx={{ color: C.subtle, fontSize: 12, fontFamily: 'monospace' }}>
                                        {vm.id.slice(0, 8)}…
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                        {vms.length === 0 && <MenuItem disabled value="">{t('backups.noVmsAvailable')}</MenuItem>}
                    </Select>
                </FormControl>

                <FormControl size="medium" sx={{ minWidth: 180 }}>
                    <InputLabel id="env-select-label">{t('backups.serviceEnvironment')}</InputLabel>
                    <Select labelId="env-select-label" value={serviceEnvId} label={t('backups.serviceEnvironment')} onChange={(e) => setServiceEnvId(e.target.value)}>
                        {serviceEnvs.map((env) => (
                            <MenuItem key={env.id} value={env.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{env.serviceName || env.serviceId}</Typography>
                                    <Typography sx={{ color: C.subtle, fontSize: 12 }}>— {env.environmentName || env.environmentId}</Typography>
                                </Box>
                            </MenuItem>
                        ))}
                        {serviceEnvs.length === 0 && <MenuItem disabled value="">{t('backups.noEnvironmentsAvailable')}</MenuItem>}
                    </Select>
                </FormControl>

                <TextField
                    label={t('backups.notes')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('backups.notesPlaceholder')}
                    multiline
                    minRows={1}
                    maxRows={3}
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
                <FormControl size="medium">
                    <InputLabel id="freq-label">{t('backups.schedule')}</InputLabel>
                    <Select labelId="freq-label" value={frequency} label={t('backups.schedule')} onChange={(e) => setFrequency(e.target.value)}>
                        {FREQUENCIES.map((f) => (
                            <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label={t('backups.retentionDays')}
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    disabled={!frequency}
                    slotProps={{ htmlInput: { min: 1, max: 365 } }}
                />

                <TextField
                    label={t('backups.maintenanceWindow')}
                    type="time"
                    value={maintenanceWindow}
                    onChange={(e) => setMaintenanceWindow(e.target.value)}
                    disabled={!frequency}
                />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button variant="outlined" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={creating}
                    startIcon={creating ? <LoadingSpinner size={14} variant="inline" /> : <AddIcon />}
                    sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, fontWeight: 700 }}
                >
                    {creating ? t('backups.creating') : t('backups.createBackup')}
                </Button>
            </Box>
        </>
    );
};

export default CreateBackupForm;