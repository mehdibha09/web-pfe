import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
    Box, Button, Card, CardActions, CardContent, Chip, MenuItem, TextField, Typography
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { ServiceResponse } from '../../../services/devopsService';
import {
    deleteService, restartService, startService, stopService, updateService
} from '../../../services/devopsService';
import MyCustomButton from '../../../components/MyCustomButton';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStatusColor } from './constants';
import { C, BTN } from '../../../theme/tokens';

type ServiceCardProps = {
    service: ServiceResponse;
    onRefresh: () => void;
};

const ServiceCard = ({ service, onRefresh }: ServiceCardProps) => {
    const { t } = useTranslation();
    const c = getStatusColor(service.status);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('');
    const [editStatus, setEditStatus] = useState('ACTIVE');

    const startEdit = (s: ServiceResponse) => {
        setEditing(true);
        setEditName(s.name);
        setEditType(s.type || '');
        setEditStatus(s.status);
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditName('');
        setEditType('');
        setEditStatus('ACTIVE');
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateService(id, { name: editName.trim(), type: editType.trim(), status: editStatus, tenantId: service.tenantId });
            toast.success('Service updated');
            cancelEdit();
            await onRefresh();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to update service'));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteService(id);
            toast.success('Service deleted');
            await onRefresh();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete service'));
        }
    };

    const handleStart = async () => {
        try { await startService(service.id); toast.success('Service started'); await onRefresh(); } catch (e: unknown) { toast.error(getErrorMessage(e, 'Failed to start service')); }
    };
    const handleStop = async () => {
        try { await stopService(service.id); toast.success('Service stopped'); await onRefresh(); } catch (e: unknown) { toast.error(getErrorMessage(e, 'Failed to stop service')); }
    };
    const handleRestart = async () => {
        try { await restartService(service.id); toast.success('Service restarted'); await onRefresh(); } catch (e: unknown) { toast.error(getErrorMessage(e, 'Failed to restart service')); }
    };

    return (
        <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: BTN.primary.gradient, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
            <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
                {editing ? (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        <TextField size="small" label={t('common.name')} value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <TextField size="small" label={t('common.type')} value={editType} onChange={(e) => setEditType(e.target.value)} />
                        <TextField size="small" select label={t('common.status')} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                            <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                            <MenuItem value="PENDING">PENDING</MenuItem>
                            <MenuItem value="DISABLED">DISABLED</MenuItem>
                        </TextField>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>{service.name}</Typography>
                            <Chip label={service.status} size="small" sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 700, fontSize: 10 }} />
                        </Box>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{service.type || '-'}</Typography>
                        <Typography sx={{ color: C.subtle, fontFamily: 'monospace', fontSize: 11, mt: 1.5 }}>{service.id}</Typography>
                    </Box>
                )}
            </CardContent>
            {!editing && (
                <CardActions sx={{ px: 3, pb: 2.5, gap: 0.5, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" color="success" startIcon={<PlayArrowIcon />} onClick={handleStart} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>{t('services.start')}</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<StopIcon />} onClick={handleStop} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>{t('services.stop')}</Button>
                    <Button size="small" variant="outlined" color="warning" startIcon={<RestartAltIcon />} onClick={handleRestart} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>{t('services.restart')}</Button>
                    <Button size="small" variant="outlined" onClick={() => startEdit(service)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: C.muted, borderColor: C.border }}>{t('common.edit')}</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(service.id)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>{t('common.delete')}</Button>
                </CardActions>
            )}
            {editing && (
                <CardActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant="outlined" onClick={cancelEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: C.muted, borderColor: C.border }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={() => handleUpdate(service.id)} sx={{ px: 3 }}>{t('common.save')}</MyCustomButton>
                </CardActions>
            )}
        </Card>
    );
};

export default ServiceCard;
