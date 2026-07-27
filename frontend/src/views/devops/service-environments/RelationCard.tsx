import LinkIcon from '@mui/icons-material/Link';
import { Box, Button, Card, CardContent, CardActions, Chip, MenuItem, TextField, Typography } from '@mui/material';
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
};

const RelationCard = ({
    relation, isEditing, serviceName, environmentName,
    serviceOptions, envOptions, editServiceId, onEditServiceIdChange,
    editEnvironmentId, onEditEnvironmentIdChange, onStartEdit, onCancelEdit,
    onSave, onDelete
}: RelationCardProps) => (
    <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', border: `1px solid ${C.border}`, backgroundColor: '#fff' }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: BTN.primary.gradient, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
        <CardContent sx={{ pt: 3.5, pb: 2, px: 3 }}>
            {isEditing ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <TextField size="small" select label="Service" value={editServiceId} onChange={(e) => onEditServiceIdChange(e.target.value)}>
                        {serviceOptions.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" select label="Environment" value={editEnvironmentId} onChange={(e) => onEditEnvironmentIdChange(e.target.value)}>
                        {envOptions.map((e) => <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>)}
                    </TextField>
                </Box>
            ) : (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{serviceName || 'Unknown'}</Typography>
                        <Chip icon={<LinkIcon sx={{ fontSize: 12 }} />} label="Linked" size="small" sx={{ backgroundColor: C.brandLight, color: C.brand, fontWeight: 700, fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 1.5 }}>{environmentName || 'Unknown'}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>Relation ID</Typography>
                            <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{relation.id}</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', mb: 0.2 }}>Tenant</Typography>
                            <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>{relation.tenantId}</Typography>
                        </Box>
                    </Box>
                </Box>
            )}
        </CardContent>
        <CardActions sx={{ px: 3, py: 1.5, justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${C.border}`, background: '#FAFAFA' }}>
            {isEditing ? (
                <>
                    <Button variant="outlined" onClick={onCancelEdit} sx={{ borderRadius: '5px', textTransform: 'capitalize', fontWeight: 'bold', borderColor: C.border, color: C.muted }}>Cancel</Button>
                    <MyCustomButton onClick={onSave}>Save</MyCustomButton>
                </>
            ) : (
                <>
                    <Button size="small" onClick={onStartEdit} sx={{ fontSize: 12, fontWeight: 'bold', color: C.brand, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.brandLight, borderColor: C.brand } }}>Edit</Button>
                    <Button size="small" onClick={onDelete} sx={{ fontSize: 12, fontWeight: 'bold', color: C.danger, border: `1px solid ${C.border}`, borderRadius: '5px', px: 1.5, textTransform: 'capitalize', '&:hover': { backgroundColor: C.dangerLight, borderColor: C.danger } }}>Delete</Button>
                </>
            )}
        </CardActions>
    </Card>
);

export default RelationCard;
