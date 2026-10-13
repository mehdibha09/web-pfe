import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { C, PAGE_BG } from '../theme/tokens';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: ReactNode;
    action?: ReactNode;
    /** Optional content rendered below the header row (e.g. KPI stat cards). */
    stats?: ReactNode;
    /** When true, the header is rendered without the full-page background/padding
     *  wrapper (use inside a page that already provides its own wrapper). */
    dense?: boolean;
}

const PageHeader = ({ title, subtitle, icon, action, stats, dense }: PageHeaderProps) => {
    const header = (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
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
                                justifyContent: 'center',
                                flexShrink: 0
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
            {stats}
        </>
    );

    if (dense) return header;

    return (
        <Box sx={{ p: 4, background: PAGE_BG, minHeight: '100%' }}>
            {header}
        </Box>
    );
};

export default PageHeader;

