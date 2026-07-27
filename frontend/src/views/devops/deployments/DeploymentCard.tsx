import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, Card, CardActions, CardContent, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DeploymentResponse, EnvironmentResponse, ServiceEnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import { STATUSES, statusColors } from './constants';
import { seLabel } from './helpers';
import MyCustomButton from '../../../components/MyCustomButton';
import { C, BTN } from '../../../theme/tokens';

type Props = {
    deployment: DeploymentResponse;
    serviceEnvironments: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
    isEditing: boolean;
    editingVersion: string;
    editingNotes: string;
    editingStatus: string;
    editingServiceEnvironmentId: string;
    onVersionChange: (v: string) => void;
    onNotesChange: (v: string) => void;
    onStatusChange: (v: string) => void;
    onServiceEnvironmentChange: (v: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => void;
    saving: boolean;
    onRedeploy: (id: string) => void;
    onDelete: (id: string) => void;
};

const statusGradient = (status: string) => {
    switch (status) {
        case 'SUCCESS': return 'linear-gradient(90deg, #2E7A4F, #4ADE80)';
        case 'FAILED': return 'linear-gradient(90deg, #C95B6E, #E4477D)';
        case 'PENDING': return 'linear-gradient(90deg, #B45309, #F59E0B)';
        default: return BTN.primary.gradient;
    }
};

const DeploymentCard = ({
    deployment: d, serviceEnvironments, services, environments,
    isEditing, editingVersion, editingNotes, editingStatus, editingServiceEnvironmentId,
    onVersionChange, onNotesChange, onStatusChange, onServiceEnvironmentChange,
    onStartEdit, onCancelEdit, onSave, saving, onRedeploy, onDelete
}: Props) => {
    const { t } = useTranslation();
    const c = statusColors[d.status] || { bg: C.brandLight, color: C.brand };
    const rel = serviceEnvironments.find((r) => r.id === d.serviceEnvironmentId);
    const envLabel = rel ? seLabel(rel, services, environments) : d.serviceEnvironmentId;

    return (
        <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: statusGradient(d.status), borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
            <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
                {isEditing ? (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        <TextField size="small" label={t('deployments.version')} value={editingVersion} onChange={(e) => onVersionChange(e.target.value)} />
                        <TextField size="small" label={t('deployments.notes')} value={editingNotes} onChange={(e) => onNotesChange(e.target.value)} />
                        <TextField size="small" select label={t('deployments.status')} value={editingStatus} onChange={(e) => onStatusChange(e.target.value)}>
                            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                        <TextField size="small" select label={t('deployments.serviceEnvironment')} value={editingServiceEnvironmentId} onChange={(e) => onServiceEnvironmentChange(e.target.value)}>
                            {serviceEnvironments.map((r) => <MenuItem key={r.id} value={r.id}>{seLabel(r, services, environments)}</MenuItem>)}
                        </TextField>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 18 }}>v{d.version}</Typography>
                            <Chip label={d.status} size="small" sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 700, fontSize: 10 }} />
                        </Box>
                        <Typography sx={{ color: C.muted, fontSize: 14, mb: 1.5 }}>{d.notes || t('deployments.noNotes')}</Typography>
                        <Box sx={{ p: 1.25, borderRadius: 1.5, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: 13 }}>
                                <Box component="span" sx={{ fontWeight: 700, color: '#334155' }}>{t('deployments.environmentLabel')} </Box>
                                {envLabel}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </CardContent>
            <CardActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${C.border}` }}>
                {isEditing ? (
                    <>
                        <Button variant="outlined" onClick={onCancelEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted }}>{t('common.cancel')}</Button>
                        <MyCustomButton onClick={onSave} disabled={saving}>{saving ? t('deployments.saving') : t('common.save')}</MyCustomButton>
                    </>
                ) : (
                    <>
                        <Button variant="outlined" onClick={onStartEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: C.muted, borderColor: C.border }}>{t('common.edit')}</Button>
                        <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={() => onRedeploy(d.id)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: '#B45309', borderColor: '#D8C48E', '&:hover': { borderColor: '#8A6A2E', backgroundColor: '#FFFBEB' } }}>{t('deployments.redeploy')}</Button>
                        <Button variant="outlined" onClick={() => onDelete(d.id)} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', color: C.danger, borderColor: '#E6C2C9', '&:hover': { borderColor: C.danger, backgroundColor: '#F7DEE3' } }}>{t('common.delete')}</Button>
                    </>
                )}
            </CardActions>
        </Card>
    );
};

export default DeploymentCard;
