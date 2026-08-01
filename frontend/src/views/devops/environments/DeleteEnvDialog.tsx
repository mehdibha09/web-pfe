import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box } from '@mui/material';
import { C } from '../../../theme/tokens';

interface DeleteEnvDialogProps {
    open: boolean;
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteEnvDialog = ({ open, name, onConfirm, onCancel }: DeleteEnvDialogProps) => {
    const { t } = useTranslation();
    return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EF4444, #F87171)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pt: 3 }}>
            <WarningAmberIcon sx={{ color: '#DC2626' }} />
            {t('environments.deleteTitle')}
        </DialogTitle>
        <DialogContent>
            <DialogContentText>
                {t('environments.deleteMessage', { name })}
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button variant="outlined" onClick={onCancel} sx={{ borderRadius: 2, textTransform: 'capitalize', fontWeight: 700 }}>
                {t('common.cancel')}
            </Button>
            <Button variant="contained" color="error" onClick={onConfirm} sx={{ borderRadius: 2, textTransform: 'capitalize', fontWeight: 700 }}>
                {t('common.delete')}
            </Button>
        </DialogActions>
    </Dialog>
    );
};

export default DeleteEnvDialog;
