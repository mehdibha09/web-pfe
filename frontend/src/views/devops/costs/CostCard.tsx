import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Collapse,
    Grid,
    Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { CostBreakdownResponse, CostRecordResponse } from '../../../services/cloudPricerService';
import { modeColors } from './constants';
import { C } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';

interface CostCardProps {
    cost: CostRecordResponse;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const CostCard = ({ cost, isExpanded, onToggleExpand }: CostCardProps) => {
    const { t } = useTranslation();
    const mc = modeColors[cost.mode] || { bg: C.brandLight, color: C.brand };
    const breakdownTotal = cost.breakdowns.reduce((sum, b) => sum + b.total, 0);
    const totalForShare = Math.max(cost.totalCost, 1e-9);

    const costItems = [
        { label: t('costs.computeLabel'), value: cost.computeCost, color: '#2E5C8A' },
        { label: t('costs.storageLabel'), value: cost.storageCost, color: '#8A6A2E' },
        { label: t('costs.networkLabel'), value: cost.networkCost, color: '#10B981' },
        { label: t('costs.backupLabel'), value: cost.backupCost, color: '#5E4B9E' },
        { label: t('costs.osLabel'), value: cost.osCost, color: '#C95B6E' },
    ];
    const shareItems = costItems.filter((i) => i.value > 0);

    return (
        <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Chip
                            label={cost.mode}
                            size="small"
                            sx={{ backgroundColor: mc.bg, color: mc.color, fontWeight: 700, height: 24 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 900, color: C.text }}>
                            {formatMoney(cost.totalCost)}
                        </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: C.muted, mb: 1 }}>
                        <strong>{t('costs.periodLabel')}:</strong>{' '}
                        {new Date(cost.periodStart).toLocaleString()} — {new Date(cost.periodEnd).toLocaleString()}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {costItems.map((item) => (
                            <Chip
                                key={item.label}
                                label={`${item.label}: ${formatMoney(item.value)} (${((item.value / totalForShare) * 100).toFixed(0)}%)`}
                                size="small"
                                variant="outlined"
                                sx={{ borderColor: item.color, color: item.color, fontWeight: 600, fontSize: 11 }}
                            />
                        ))}
                    </Box>

                    {shareItems.length > 0 && (
                        <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', mb: 1.5, backgroundColor: '#F1F5F9' }}>
                            {shareItems.map((item) => (
                                <Box
                                    key={item.label}
                                    sx={{ width: `${(item.value / totalForShare) * 100}%`, backgroundColor: item.color }}
                                />
                            ))}
                        </Box>
                    )}

                    <Button
                        size="small"
                        startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={onToggleExpand}
                        sx={{ textTransform: 'none', color: C.muted, p: 0 }}
                    >
                        {isExpanded ? t('costs.hideBreakdown') : t('costs.showBreakdown')}
                    </Button>

                    <Collapse in={isExpanded}>
                        <Box sx={{ mt: 1.5, border: `1px solid ${C.border}`, borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', px: 2, py: 1, backgroundColor: '#F8FAFC' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.subtle }}>{t('costs.type')}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.subtle }}>{t('costs.unitCost')}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.subtle }}>{t('costs.quantity')}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.subtle }}>{t('costs.totalCost')}</Typography>
                            </Box>
                            {cost.breakdowns.map((b: CostBreakdownResponse) => (
                                <Box
                                    key={b.id}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                        px: 2,
                                        py: 0.75,
                                        borderTop: `1px solid ${C.border}`
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: C.text }}>{b.type}</Typography>
                                    <Typography variant="body2" sx={{ color: C.muted }}>{formatMoney(b.unitCost)}</Typography>
                                    <Typography variant="body2" sx={{ color: C.muted }}>{b.quantity}</Typography>
                                    <Typography variant="body2" sx={{ color: C.text, fontWeight: 600 }}>{formatMoney(b.total)}</Typography>
                                </Box>
                            ))}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', px: 2, py: 0.75, borderTop: `1px solid ${C.border}`, backgroundColor: '#F8FAFC' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.text }}>{t('costs.breakdownTotal')}</Typography>
                                <Typography variant="caption" />
                                <Typography variant="caption" />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: C.text }}>{formatMoney(breakdownTotal)}</Typography>
                            </Box>
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>
        </Grid>
    );
};

export default CostCard;