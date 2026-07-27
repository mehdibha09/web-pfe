import InboxIcon from '@mui/icons-material/Inbox';
import { Box, Button, Card, Fade, Typography } from '@mui/material';
import { BTN, C} from '../theme/tokens';

interface EmptyStateProps {
    title?: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState = ({ title, message, actionLabel, onAction }: EmptyStateProps) => (
    <Fade in>
        <Card sx={{ borderRadius: 3, border: `1px solid ${C.border}`, textAlign: 'center', py: 8 }}>
            <InboxIcon sx={{ fontSize: 48, color: C.subtle, mb: 2 }} />
            {title && (
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                    {title}
                </Typography>
            )}
            <Typography sx={{ color: C.muted, mt: 0.5, mb: 3, px: 4 }}>{message}</Typography>
            {actionLabel && onAction && (
                <Button
                    variant="contained"
                    onClick={onAction}
                    sx={{
                        background: BTN.primary.gradient,
                        fontWeight: 700,
                        '&:hover': { background: BTN.primary.gradientHover }
                    }}
                >
                    {actionLabel}
                </Button>
            )}
        </Card>
    </Fade>
);

export default EmptyState;
