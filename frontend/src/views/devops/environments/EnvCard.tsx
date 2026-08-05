import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, TextField, Fade, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { EnvironmentResponse } from '../../../services/devopsService';
import MyCustomButton from '../../../components/MyCustomButton';
import { C, BTN } from '../../../theme/tokens';
import { envChipColor, fmtDate } from './constants';

type EnvCardProps = {
    env: EnvironmentResponse;
    isEditing: boolean;
    editName: string;
    setEditName: (v: string) => void;
    editDescription: string;
    setEditDescription: (v: string) => void;
    saving: boolean;
    onSave: (id: string) => void;
    startEdit: (env: EnvironmentResponse) => void;
    cancelEdit: () => void;
    onDelete: (env: EnvironmentResponse) => void;
    allowManage?: boolean;
};

const envGradient = (name: string) => {
    const gradients = [
        BTN.primary.gradient,
        'linear-gradient(90deg, #2E7A4F, #4ADE80)',
        'linear-gradient(90deg, #2E5C8A, #6366F1)',
        'linear-gradient(90deg, #5E4B9E, #A78BFA)',
        'linear-gradient(90deg, #C95B6E, #E4477D)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
};

const EnvCard = ({
    env, isEditing, editName, setEditName, editDescription, setEditDescription,
    saving, onSave, startEdit, cancelEdit, onDelete, allowManage = false
}: EnvCardProps) => {
    const { t } = useTranslation();
    const chip = envChipColor(env.name);

    return (
        <Fade in>
            <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: isEditing ? `2px solid ${C.brand}` : `1px solid ${C.border}`, backgroundColor: '#fff' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: envGradient(env.name), borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
                    {isEditing ? (
                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.brand }}>{t('environments.editingEnvironment')}</Typography>
                            <TextField size="small" label={t('environments.name')} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                            <TextField size="small" label={t('environments.description')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        </Box>
                    ) : (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>{env.name}</Typography>
                                <Chip label={env.name.toUpperCase()} size="small" sx={{ backgroundColor: chip.bg, color: chip.fg, fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }} />
                            </Box>
                            <Typography sx={{ color: C.muted, fontSize: 14 }}>{env.description || <span style={{ color: C.subtle, fontStyle: 'italic' }}>{t('environments.noDescription')}</span>}</Typography>
                            <Box sx={{ mt: 1.5, display: 'flex', gap: 3 }}>
                                <Box>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>ID</Typography>
                                    <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{env.id}</Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>Tenant</Typography>
                                    <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{env.tenantId}</Typography>
                                </Box>
                                {fmtDate(env.createdAt) && (
                                    <Box>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>{t('environments.createdAt')}</Typography>
                                        <Typography sx={{ fontSize: 12, color: C.muted }}>{fmtDate(env.createdAt)}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </CardContent>
                <Box sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${C.border}`, background: '#FAFAFA' }}>
                    {isEditing ? (
                        <>
                            <Button variant="outlined" size="small" onClick={cancelEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted }}>{t('common.cancel')}</Button>
                            <MyCustomButton size="small" onClick={() => onSave(env.id)} disabled={saving}>{saving ? t('environments.saving') : t('environments.saveChanges')}</MyCustomButton>
                        </>
                    ) : (
                        allowManage && (
                            <>
                                <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} onClick={() => startEdit(env)} sx={{ fontSize: 12, fontWeight: 'bold', color: C.brand, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.brandLight, borderColor: C.brand } }}>{t('common.edit')}</Button>
                                <Button size="small" startIcon={<DeleteIcon sx={{ fontSize: 14 }} />} onClick={() => onDelete(env)} sx={{ fontSize: 12, fontWeight: 'bold', color: C.danger, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.dangerLight, borderColor: C.danger } }}>{t('common.delete')}</Button>
                            </>
                        )
                    )}
                </Box>
            </Card>
        </Fade>
    );
};

export default EnvCard;
