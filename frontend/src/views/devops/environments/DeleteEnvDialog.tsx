import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import { useTranslation } from 'react-i18next';

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
        <DialogTitle sx={{ fontWeight: 700 }}>{t('environments.deleteTitle')}</DialogTitle>
        <DialogContent>
            <DialogContentText>
                {t('environments.deleteMessage', { name })}
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button variant="outlined" onClick={onCancel}>
                {t('common.cancel')}
            </Button>
            <Button variant="contained" color="error" onClick={onConfirm}>
                {t('common.delete')}
            </Button>
        </DialogActions>
    </Dialog>
    );
};

export default DeleteEnvDialog;
