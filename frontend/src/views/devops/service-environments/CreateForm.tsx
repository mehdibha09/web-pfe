import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { P, type Option } from './palette';

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        '& fieldset': { borderColor: P.border },
        '&:hover fieldset': { borderColor: P.subtle },
        '&.Mui-focused fieldset': { borderColor: P.brand }
    },
    '& label.Mui-focused': { color: P.brand }
};

type CreateFormProps = {
    serviceId: string;
    onServiceIdChange: (value: string) => void;
    environmentId: string;
    onEnvironmentIdChange: (value: string) => void;
    serviceOptions: Option[];
    envOptions: Option[];
    loading: boolean;
    onCreate: () => void;
};

const CreateForm = ({
    serviceId,
    onServiceIdChange,
    environmentId,
    onEnvironmentIdChange,
    serviceOptions,
    envOptions,
    loading,
    onCreate
}: CreateFormProps) => {
    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${P.border}`,
                backgroundColor: P.surface,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                mb: 3
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            background: P.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <AddIcon sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: P.text }}>
                        Create association
                    </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 2, alignItems: 'end' }}>
                    <TextField
                        select
                        label="Service"
                        value={serviceId}
                        onChange={(e) => onServiceIdChange(e.target.value)}
                        sx={inputSx}
                    >
                        <MenuItem value="">Select service</MenuItem>
                        {serviceOptions.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                                {s.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label="Environment"
                        value={environmentId}
                        onChange={(e) => onEnvironmentIdChange(e.target.value)}
                        sx={inputSx}
                    >
                        <MenuItem value="">Select environment</MenuItem>
                        {envOptions.map((e) => (
                            <MenuItem key={e.id} value={e.id}>
                                {e.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                        onClick={onCreate}
                        disabled={loading}
                        sx={{
                            background: P.gradient,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 3,
                            boxShadow: '0 4px 12px rgba(228,71,125,0.3)',
                            '&:hover': { boxShadow: '0 6px 16px rgba(228,71,125,0.4)' }
                        }}
                    >
                        Link
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CreateForm;
