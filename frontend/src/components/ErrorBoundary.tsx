import { Component, type ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { BTN, C} from '../theme/tokens';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>Something went wrong</Typography>
                    <Typography sx={{ color: C.muted, mb: 3 }}>{this.state.error?.message || 'An unexpected error occurred.'}</Typography>
                    <Button variant="contained" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                        sx={{ background: BTN.primary.gradient, textTransform: 'none', px: 4 }}>
                        Reload Page
                    </Button>
                </Box>
            );
        }
        return this.props.children;
    }
}
