import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { DeploymentResponse } from '../../../services/devopsService';
import { STATUSES, statusColors } from './constants';

type Props = {
    deployments: DeploymentResponse[];
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
};

const DeploymentStats = ({ deployments, statusFilter, onStatusFilterChange }: Props) => {
    const { t } = useTranslation();
    return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
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
                        background: isSelected ? c.bg : '#fff',
                        border: isSelected ? `2px solid ${c.color}` : `1px solid ${c.border || '#E5E7EB'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${c.border || 'rgba(0,0,0,0.1)'}`
                        }
                    }}
                    onClick={() => onStatusFilterChange(isSelected ? 'ALL' : s)}
                >
                    <CardContent sx={{ py: 2, textAlign: 'center' }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 900,
                                color: c.color,
                                lineHeight: 1,
                                mb: 0.5
                            }}
                        >
                            {count}
                        </Typography>
                        <Typography
                            sx={{
                                color: c.color,
                                fontWeight: 700,
                                fontSize: 11,
                                letterSpacing: 0.5,
                                textTransform: 'uppercase'
                            }}
                        >
                            {t(`deployments.statusLabels.${s}`)}
                        </Typography>
                    </CardContent>
                </Card>
            );
        })}
    </Box>
    );
};

export default DeploymentStats;
