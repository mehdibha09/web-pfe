import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';

interface DeleteDialogProps {
    open: boolean;
    name?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteDialog = ({ open, name, onConfirm, onCancel }: DeleteDialogProps) => (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete {name || 'item'}?</DialogTitle>
        <DialogContent>
            <DialogContentText>
                This action cannot be undone. The {name || 'item'} will be permanently removed.
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button variant="outlined" onClick={onCancel}>
                Cancel
            </Button>
            <Button variant="contained" color="error" onClick={onConfirm}>
                Delete
            </Button>
        </DialogActions>
    </Dialog>
);

export default DeleteDialog;
