import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type {
    EnvironmentResponse,
    ServiceEnvironmentResponse,
    ServiceResponse
} from '../../../services/devopsService';
import { STATUSES } from './constants';
import { seLabel } from './helpers';
import { C} from '../../../theme/tokens';

type Props = {
    version: string;
    onVersionChange: (v: string) => void;
    notes: string;
    onNotesChange: (v: string) => void;
    status: string;
    onStatusChange: (v: string) => void;
    serviceEnvironmentId: string;
    onServiceEnvironmentChange: (v: string) => void;
    serviceEnvironments: ServiceEnvironmentResponse[];
    services: ServiceResponse[];
    environments: EnvironmentResponse[];
    creating: boolean;
    onCreate: () => void;
};

const CreateDeploymentForm = ({
    version,
    onVersionChange,
    notes,
    onNotesChange,
    status,
    onStatusChange,
    serviceEnvironmentId,
    onServiceEnvironmentChange,
    serviceEnvironments,
    services,
    environments,
    creating,
    onCreate
}: Props) => {
    const { t } = useTranslation();
    return (
    <Card sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        {/* Gradient header bar */}
        <Box
            sx={{
                height: 4,
                background: 'linear-gradient(135deg, #E4477D, #BE185D)'
            }}
        />
        <CardContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #E4477D, #BE185D)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(228, 71, 125, 0.3)'
                    }}
                >
                    <AddCircleOutlinedIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {t('deployments.newDeployment')}
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
                <TextField
                    label={t('deployments.version')}
                    value={version}
                    onChange={(e) => onVersionChange(e.target.value)}
                    placeholder={t('deployments.versionPlaceholder')}
                />
                <TextField
                    label={t('deployments.notes')}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder={t('deployments.notesPlaceholder')}
                />
                <TextField select label={t('deployments.status')} value={status} onChange={(e) => onStatusChange(e.target.value)}>
                    {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                            {s}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center' }}>
                <TextField
                    select
                    label={t('deployments.serviceEnvironment')}
                    value={serviceEnvironmentId}
                    onChange={(e) => onServiceEnvironmentChange(e.target.value)}
                >
                    {serviceEnvironments.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                            {seLabel(r)}
                        </MenuItem>
                    ))}
                </TextField>
                <Button
                    variant="contained"
                    onClick={onCreate}
                    disabled={creating}
                    startIcon={<AddCircleOutlinedIcon />}
                    sx={{
                        height: 56,
                        px: 4,
                        fontWeight: 700,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #E4477D, #BE185D)',
                        boxShadow: '0 4px 14px rgba(228, 71, 125, 0.35)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #BE185D, #9D174D)',
                            boxShadow: '0 6px 20px rgba(228, 71, 125, 0.4)'
                        }
                    }}
                >
                    {creating ? t('deployments.creating') : t('common.create')}
                </Button>
            </Box>
        </CardContent>
    </Card>
    );
};

export default CreateDeploymentForm;
