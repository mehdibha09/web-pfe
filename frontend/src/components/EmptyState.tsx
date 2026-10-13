import type { ReactNode } from 'react';
import InboxIcon from '@mui/icons-material/Inbox';
import { Box, Button, Card, Fade, Typography } from '@mui/material';
import { C } from '../theme/tokens';

interface EmptyStateProps {
    title?: string;
    message: string;
    /** Optional contextual icon (defaults to an inbox). Rendered inside a
     *  branded tile so every empty state looks consistent. */
    icon?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState = ({ title, message, icon, actionLabel, onAction }: EmptyStateProps) => (
    <Fade in>
        <Card sx={{ textAlign: 'center', py: 7, px: 4 }}>
            <Box
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    background: C.brandLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    '& .MuiSvgIcon-root': { fontSize: 32, color: C.brand }
                }}
            >
                {icon || <InboxIcon />}
            </Box>
            {title && (
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 0.5 }}>
                    {title}
                </Typography>
            )}
            <Typography variant="body2" sx={{ color: C.muted, mb: actionLabel && onAction ? 3 : 0 }}>
                {message}
            </Typography>
            {actionLabel && onAction && (
                <Button variant="contained" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </Card>
    </Fade>
);

export default EmptyState;
