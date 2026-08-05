import { Alert, Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { createService } from '../../../services/devopsService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { useInlineErrors } from '../../../hooks/useInlineErrors';
import { cardSx } from './constants';
import { C} from '../../../theme/tokens';

type CreateServiceCardProps = {
    onCreated: () => void;
};

const CreateServiceCard = ({ onCreated }: CreateServiceCardProps) => {
    const tenantId = getStoredUser()?.tenantId || '';
    const [name, setName] = useState('');
    const [type, setType] = useState('WEB');
    const [runtime, setRuntime] = useState('VAGRANT');
    const [serverError, setServerError] = useState('');
    const { errors, setFieldError, clearFieldError, fieldProps } = useInlineErrors();

    const handleCreate = async () => {
        setServerError('');
        if (!name.trim()) return setFieldError('name', 'Service name is required');
        if (!tenantId) return setFieldError('tenantId', 'tenantId is required');

        try {
            await createService({
                name: name.trim(),
                type: type.trim(),
                runtime,
                tenantId
            });
            toast.success('Service created');
            setName('');
            setRuntime('VAGRANT');
            await onCreated();
        } catch (e: unknown) {
            setServerError(getErrorMessage(e, 'Failed to create service'));
        }
    };

    return (
        <Card sx={{ ...cardSx, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: C.text }}>
                    Create a service
                </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr auto',
                            gap: 2,
                            alignItems: 'center'
                        }}
                    >
                        <TextField label="Name" value={name}
                            onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                            {...fieldProps('name')} />
                        <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
                            <MenuItem value="WEB">WEB</MenuItem>
                            <MenuItem value="API">API</MenuItem>
                            <MenuItem value="WORKER">WORKER</MenuItem>
                            <MenuItem value="DATABASE">DATABASE</MenuItem>
                            <MenuItem value="CACHE">CACHE</MenuItem>
                            <MenuItem value="QUEUE">QUEUE</MenuItem>
                            <MenuItem value="STORAGE">STORAGE</MenuItem>
                            <MenuItem value="OTHER">OTHER</MenuItem>
                        </TextField>
                        <TextField select label="Runtime" value={runtime} onChange={(e) => setRuntime(e.target.value)}>
                            <MenuItem value="VAGRANT">VAGRANT</MenuItem>
                            <MenuItem value="K8S">K8S</MenuItem>
                        </TextField>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        sx={{ backgroundColor: C.brand, '&:hover': { backgroundColor: C.brandDark }, height: 40 }}
                    >
                        Create
                    </Button>
                </Box>
                {serverError && (
                    <Alert severity="error" onClose={() => setServerError('')} sx={{ borderRadius: 2, mt: 2, whiteSpace: 'pre-line' }}>
                        {serverError}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default CreateServiceCard;
