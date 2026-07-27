import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { C, PAGE_BG } from '../theme/tokens';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: ReactNode;
    action?: ReactNode;
}

const PageHeader = ({ title, subtitle, icon, action }: PageHeaderProps) => (
    <Box sx={{ p: 4, background: PAGE_BG, minHeight: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon && (
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                        {title}
                    </Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14 }}>{subtitle}</Typography>
                </Box>
            </Box>
            {action}
        </Box>
    </Box>
);

export default PageHeader;
