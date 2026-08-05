import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getUsagePercent } from './helpers';
import type { QuotaWithMetrics } from './types';
import { C } from '../../../theme/tokens';

interface Props {
    quotas: QuotaWithMetrics[];
}

const QuotasSummary = ({ quotas }: Props) => {
    const { t } = useTranslation();

    const totalCount = quotas.length;
    const activeCount = useMemo(() => quotas.filter((q) => q.isActive).length, [quotas]);
    const totalBudget = useMemo(() => quotas.reduce((sum, q) => sum + q.maxBudget, 0), [quotas]);

    const nearLimitCount = useMemo(() => {
        return quotas.filter((q) => {
            if (!q.usage) return false;
            const cpuPct = getUsagePercent(q.usage.cpu, q.maxCpu);
            const ramPct = getUsagePercent(q.usage.ram, q.maxRam);
            return cpuPct >= 90 || ramPct >= 90;
        }).length;
    }, [quotas]);

    const cards = [
        {
            label: t('quotas.totalQuotas'),
            value: totalCount,
            icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 28, color: '#5E4B9E' }} />,
            bg: '#F4F0FA',
            valueColor: '#5E4B9E',
        },
        {
            label: t('quotas.activeQuotas'),
            value: activeCount,
            icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 28, color: '#2E7A4F' }} />,
            bg: '#E0F1E6',
            valueColor: '#2E7A4F',
        },
        {
            label: t('quotas.nearLimit'),
            value: nearLimitCount,
            icon: <WarningAmberOutlinedIcon sx={{ fontSize: 28, color: nearLimitCount > 0 ? '#C95B6E' : '#2E7A4F' }} />,
            bg: nearLimitCount > 0 ? '#F7DEE3' : '#E0F1E6',
            valueColor: nearLimitCount > 0 ? '#C95B6E' : '#2E7A4F',
            border: nearLimitCount > 0 ? `2px solid #C95B6E` : undefined,
        },
        {
            label: t('quotas.totalBudget'),
            value: `$${totalBudget.toLocaleString()}`,
            icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28, color: '#2E5C8A' }} />,
            bg: '#E4EEF7',
            valueColor: '#2E5C8A',
        },
    ];

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
            {cards.map((card) => (
                <Card
                    key={card.label}
                    sx={{ borderRadius: 3, border: card.border, transition: '0.2s', '&:hover': { translate: '0 -2px' } }}
                >
                    <CardContent sx={{ py: 2, px: 2.5, background: card.bg, borderRadius: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 900, color: card.valueColor, lineHeight: 1.1 }}>
                                    {card.value}
                                </Typography>
                                <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13, mt: 0.5 }}>
                                    {card.label}
                                </Typography>
                            </Box>
                            {card.icon}
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
};

export default QuotasSummary;