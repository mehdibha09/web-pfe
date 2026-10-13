import type { ReactNode } from 'react';
import { Box, Button, Card, CardActions, CardContent, Collapse, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import LoadingSpinner from './LoadingSpinner';
import { C } from '../theme/tokens';

interface CollapsibleFormCardProps {
    title: string;
    open: boolean;
    onToggle: () => void;
    creating?: boolean;
    onCreate?: () => void;
    createLabel?: string;
    children: ReactNode;
}

const CollapsibleFormCard = ({
    title,
    open,
    onToggle,
    creating = false,
    onCreate,
    createLabel = 'Create',
    children
}: CollapsibleFormCardProps) => (
    <Card sx={{ mb: 3 }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: open ? 2.5 : 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {title}
                </Typography>
                <IconButton size="small" onClick={onToggle}>
                    {open ? <CloseIcon fontSize="small" /> : <AddIcon sx={{ transform: 'rotate(0deg)', transition: '0.2s' }} />}
                </IconButton>
            </Box>
            <Collapse in={open}>{children}</Collapse>
        </CardContent>
        {open && onCreate && (
            <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={onToggle}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onCreate}
                    disabled={creating}
                    startIcon={creating ? <LoadingSpinner size={14} variant="inline" /> : <AddIcon />}
                >
                    {creating ? 'Creating…' : createLabel}
                </Button>
            </CardActions>
        )}
    </Card>
);

export default CollapsibleFormCard;
