import {
    Box, Button, Card, CardActions, CardContent, Chip, MenuItem, TextField, Typography
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { ServiceResponse } from '../../../services/devopsService';
import {
    deleteService, updateService
} from '../../../services/devopsService';
import MyCustomButton from '../../../components/MyCustomButton';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStatusColor } from './constants';
import { C, BTN } from '../../../theme/tokens';

type ServiceCardProps = {
    service: ServiceResponse;
    onRefresh: () => void;
    allowManage?: boolean;
    canViewAudit?: boolean;
};

const ServiceCard = ({ service, onRefresh, allowManage = false, canViewAudit = false }: ServiceCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = getStatusColor(service.status);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('');
    const [editRuntime, setEditRuntime] = useState('VAGRANT');

    const startEdit = (s: ServiceResponse) => {
        setEditing(true);
        setEditName(s.name);
        setEditType(s.type || '');
        setEditRuntime(s.runtime || 'VAGRANT');
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditName('');
        setEditType('');
        setEditRuntime('VAGRANT');
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateService(id, { name: editName.trim(), type: editType.trim(), runtime: editRuntime, tenantId: service.tenantId });
            toast.success(t('services.updatedSuccess'));
            cancelEdit();
            await onRefresh();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to update service'));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteService(id);
            toast.success(t('services.deletedSuccess'));
            await onRefresh();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, 'Failed to delete service'));
        }
    };

    return (
        <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: BTN.primary.gradient, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
            <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
                {editing ? (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        <TextField size="small" label={t('common.name')} value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <TextField size="small" select label={t('common.type')} value={editType} onChange={(e) => setEditType(e.target.value)}>
                            <MenuItem value="WEB">WEB</MenuItem>
                            <MenuItem value="API">API</MenuItem>
                            <MenuItem value="WORKER">WORKER</MenuItem>
                            <MenuItem value="DATABASE">DATABASE</MenuItem>
                            <MenuItem value="CACHE">CACHE</MenuItem>
                            <MenuItem value="QUEUE">QUEUE</MenuItem>
                            <MenuItem value="STORAGE">STORAGE</MenuItem>
                            <MenuItem value="OTHER">OTHER</MenuItem>
                        </TextField>
                        <TextField size="small" select label="Runtime" value={editRuntime} onChange={(e) => setEditRuntime(e.target.value)}>
                            <MenuItem value="VAGRANT">VAGRANT</MenuItem>
                            <MenuItem value="K8S">K8S</MenuItem>
                        </TextField>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>{service.name}</Typography>
                            <Chip label={service.status} size="small" sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 700, fontSize: 10 }} />
                            {service.runtime && (
                                <Chip label={service.runtime} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: 10, color: C.brand, borderColor: C.brandLight }} />
                            )}
                        </Box>
                        <Typography sx={{ color: C.muted, fontSize: 14 }}>{service.type || '-'}</Typography>
                        <Typography sx={{ color: C.subtle, fontFamily: 'monospace', fontSize: 11, mt: 1.5 }}>{service.id}</Typography>
                    </Box>
                )}
            </CardContent>
            {!editing && (
                <CardActions sx={{ px: 3, pb: 2.5, gap: 0.5, flexWrap: 'wrap' }}>
                    {canViewAudit && <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => navigate('/admin/audit-logs')} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: '#2E5C8A', borderColor: '#B0C4DE' }}>{t('services.viewDeployments')}</Button>}
                    {allowManage && (
                        <>
                            <Button size="small" variant="outlined" onClick={() => startEdit(service)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: C.muted, borderColor: C.border }}>{t('common.edit')}</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(service.id)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold' }}>{t('common.delete')}</Button>
                        </>
                    )}
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
