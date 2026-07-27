import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    Collapse,
    IconButton,
    TextField,
    Typography,
    Box
} from '@mui/material';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { createEnvironment } from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { C } from './constants';

interface CreateEnvFormProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const CreateEnvForm = ({ open, onClose, onCreated }: CreateEnvFormProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const tenantId = getStoredUser()?.tenantId || '';

    const handleCreate = async () => {
        if (!name.trim()) return toast.error(t('environments.nameRequired'));
        if (!tenantId) return toast.error(t('environments.tenantIdRequired'));

        setCreating(true);
        try {
            await createEnvironment({
                name: name.trim(),
                description: description.trim() || undefined,
                tenantId
            });
            toast.success(t('environments.created', { name: name.trim() }));
            setName('');
            setDescription('');
            onClose();
            onCreated();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('environments.failedToCreate')));
        } finally {
            setCreating(false);
        }
    };

    return (
        <Collapse in={open}>
            <Card
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${C.border}`,
                    mb: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                            {t('environments.newEnvironment')}
                        </Typography>
                        <IconButton size="small" onClick={onClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 2fr' },
                            gap: 2
                        }}
                    >
                        <TextField
                            label={t('environments.name')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('environments.namePlaceholder')}
                            required
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <TextField
                            label={t('environments.description')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('environments.descriptionPlaceholder')}
                        />
                    </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant="outlined" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating}
                        startIcon={creating ? <LoadingSpinner size={14} variant="inline" /> : <AddIcon />}
                        sx={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, fontWeight: 700 }}
                    >
                        {creating ? t('environments.creating') : t('common.create')}
                    </Button>
                </CardActions>
            </Card>
        </Collapse>
    );
};

export default CreateEnvForm;
