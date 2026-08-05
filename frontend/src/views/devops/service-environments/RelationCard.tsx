import LinkIcon from '@mui/icons-material/Link';
import { Box, Button, Card, CardContent, CardActions, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ServiceEnvironmentResponse } from '../../../services/devopsService';
import MyCustomButton from '../../../components/MyCustomButton';
import { C, BTN } from '../../../theme/tokens';
import type { Option } from './palette';

type RelationCardProps = {
    relation: ServiceEnvironmentResponse;
    isEditing: boolean;
    serviceName: string;
    environmentName: string;
    serviceOptions: Option[];
    envOptions: Option[];
    editServiceId: string;
    onEditServiceIdChange: (value: string) => void;
    editEnvironmentId: string;
    onEditEnvironmentIdChange: (value: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => void;
    onDelete: () => void;
    allowManage?: boolean;
    editErrors?: Record<string, string>;
    onEditFieldErrorClear?: (field: string) => void;
};

const RelationCard = ({
    relation, isEditing, serviceName, environmentName,
    serviceOptions, envOptions, editServiceId, onEditServiceIdChange,
    editEnvironmentId, onEditEnvironmentIdChange, onStartEdit, onCancelEdit,
    onSave, onDelete, allowManage = false, editErrors, onEditFieldErrorClear
}: RelationCardProps) => {
    const { t } = useTranslation();
    return (
    <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: BTN.primary.gradient, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
        <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
            {isEditing ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <TextField size="small" select label={t('serviceEnvs.service')} value={editServiceId} onChange={(e) => { onEditServiceIdChange(e.target.value); onEditFieldErrorClear?.('serviceId'); }} error={Boolean(editErrors?.serviceId)} helperText={editErrors?.serviceId}>
                        {serviceOptions.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" select label={t('serviceEnvs.environment')} value={editEnvironmentId} onChange={(e) => { onEditEnvironmentIdChange(e.target.value); onEditFieldErrorClear?.('environmentId'); }} error={Boolean(editErrors?.environmentId)} helperText={editErrors?.environmentId}>
                        {envOptions.map((e) => <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>)}
                    </TextField>
                </Box>
            ) : (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{serviceName || t('serviceEnvs.unknown')}</Typography>
                        <Chip icon={<LinkIcon sx={{ fontSize: 12 }} />} label={t('serviceEnvs.linked')} size="small" sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 1.5 }}>{environmentName || t('serviceEnvs.unknown')}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('serviceEnvs.relationId')}</Typography>
                            <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{relation.id}</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('serviceEnvs.tenant')}</Typography>
                            <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{relation.tenantId}</Typography>
                        </Box>
                    </Box>
                </Box>
            )}
        </CardContent>
        <CardActions sx={{ px: 3, py: 1.5, justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${C.border}`, background: '#FAFAFA' }}>
            {isEditing ? (
                <>
                    <Button variant="outlined" onClick={onCancelEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted }}>{t('common.cancel')}</Button>
                    <MyCustomButton onClick={onSave}>{t('common.save')}</MyCustomButton>
                </>
            ) : (
                allowManage && (
                    <>
                        <Button size="small" onClick={onStartEdit} sx={{ fontSize: 12, fontWeight: 'bold', color: C.brand, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.brandLight, borderColor: C.brand } }}>{t('common.edit')}</Button>
                        <Button size="small" onClick={onDelete} sx={{ fontSize: 12, fontWeight: 'bold', color: C.danger, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.dangerLight, borderColor: C.danger } }}>{t('common.delete')}</Button>
                    </>
                )
            )}
        </CardActions>
    </Card>
    );
};

export default RelationCard;
