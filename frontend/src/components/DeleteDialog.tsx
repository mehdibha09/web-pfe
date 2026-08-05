import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { C } from '../theme/tokens';

interface DeleteDialogProps {
    open: boolean;
    name?: string;
    deleting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteDialog = ({ open, name, deleting, onConfirm, onCancel }: DeleteDialogProps) => {
    const { t } = useTranslation();
    const itemName = name || t('common.item');

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
            <Box sx={{
                background: `linear-gradient(135deg, #FCE7F3, #FDEAF2)`,
                px: 3, py: 2.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: `1px solid ${C.border}`
            }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #E4477D, #BE185D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <DeleteForeverIcon sx={{ color: '#fff', fontSize: 22 }} />
                </Box>
                <Box>
                    <DialogTitle sx={{ p: 0, fontWeight: 800, fontSize: 17, lineHeight: 1.2, color: C.text }}>
                        {t('common.deleteConfirmTitle', { name: itemName })}
                    </DialogTitle>
                    <Typography sx={{ color: C.muted, fontSize: 12 }}>
                        {t('common.deleteConfirmSubtitle')}
                    </Typography>
                </Box>
            </Box>
            <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
                <Box sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    p: 2, borderRadius: 2,
                    background: '#FEF2F2', border: '1px solid #FECACA'
                }}>
                    <WarningAmberIcon sx={{ color: '#B91C1C', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#B91C1C' }}>
                            {t('common.deleteConfirmWarningTitle')}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#B91C1C', opacity: 0.9 }}>
                            {t('common.deleteConfirmWarningBody', { name: itemName })}
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: `1px solid ${C.border}`, pt: 2 }}>
                <Button onClick={onCancel} disabled={deleting} variant="outlined"
                    sx={{ borderRadius: 2, fontWeight: 600, color: C.muted, px: 3 }}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={onConfirm} disabled={deleting} variant="contained" color="error"
                    startIcon={<DeleteForeverIcon />}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #E4477D, #BE185D)', '&:hover': { background: 'linear-gradient(135deg, #BE185D, #9D174D)' }, '&.Mui-disabled': { background: '#F9A8C9' } }}>
                    {deleting ? t('common.deleting') : t('common.delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteDialog;
