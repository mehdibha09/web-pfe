import { Box, Card, CardContent, Typography } from '@mui/material';

import type { DeploymentResponse } from '../../../services/devopsService';
import { STATUSES, statusColors } from './constants';

type Props = {
    deployments: DeploymentResponse[];
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
};

const DeploymentStats = ({ deployments, statusFilter, onStatusFilterChange }: Props) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {STATUSES.map((s) => {
            const count = deployments.filter((d) => d.status === s).length;
            const c = statusColors[s];
            const isSelected = statusFilter === s;
            return (
                <Card
                    key={s}
                    sx={{
                        borderRadius: 3,
                        cursor: 'pointer',
                        background: isSelected ? (c.gradient || c.bg) : '#fff',
                        border: isSelected ? 'none' : `1px solid ${c.border}`,
                        boxShadow: isSelected ? `0 6px 20px ${c.border || 'rgba(0,0,0,0.1)'}` : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 20px ${c.border || 'rgba(0,0,0,0.1)'}`
                        },
                        ...(isSelected && {
                            outline: `2px solid ${c.color}`,
                            outlineOffset: '2px'
                        })
                    }}
                    onClick={() => onStatusFilterChange(isSelected ? 'ALL' : s)}
                >
                    <CardContent sx={{ py: 2.5, textAlign: 'center' }}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 900,
                                color: isSelected ? '#fff' : c.color,
                                lineHeight: 1,
                                mb: 0.5
                            }}
                        >
                            {count}
                        </Typography>
                        <Typography
                            sx={{
                                color: isSelected ? 'rgba(255,255,255,0.85)' : c.color,
                                fontWeight: 700,
                                fontSize: 13,
                                letterSpacing: 0.5,
                                textTransform: 'uppercase'
                            }}
                        >
                            {s}
                        </Typography>
                    </CardContent>
                </Card>
            );
        })}
    </Box>
);

export default DeploymentStats;
