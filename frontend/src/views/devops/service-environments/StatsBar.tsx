import { Box, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import BuildIcon from '@mui/icons-material/Build';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

type StatsBarProps = {
    relationsCount: number;
    servicesCount: number;
    environmentsCount: number;
};

const STATS_CONFIG = [
    { label: 'Total relations', key: 'relationsCount', icon: <LinkIcon sx={{ color: '#E4477D', fontSize: 22 }} />, bg: '#FCE7F3', color: '#E4477D' },
    { label: 'Services', key: 'servicesCount', icon: <BuildIcon sx={{ color: '#2E5C8A', fontSize: 22 }} />, bg: '#E4EEF7', color: '#2E5C8A' },
    { label: 'Environments', key: 'environmentsCount', icon: <CloudQueueIcon sx={{ color: '#065F46', fontSize: 22 }} />, bg: '#D1FAE5', color: '#065F46' }
] as const;

const StatsBar = ({ relationsCount, servicesCount, environmentsCount }: StatsBarProps) => {
    const values = { relationsCount, servicesCount, environmentsCount };

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
            {STATS_CONFIG.map((s) => (
                <Box
                    key={s.key}
                    sx={{
                        borderRadius: 3,
                        border: `1px solid ${s.color}22`,
                        background: s.bg,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.22s ease',
                        overflow: 'hidden',
                        '&:hover': {
                            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                            transform: 'translateY(-2px)'
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            {s.icon}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 11, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                                {s.label}
                            </Typography>
                            <Typography sx={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>
                                {values[s.key]}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default StatsBar;
