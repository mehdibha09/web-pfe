import { Box, Card, CardContent, Chip, Divider, Skeleton, Typography } from '@mui/material';
import type { MetricResponse } from '../../../services/devopsService';
import { C, formatBps, formatDateTime, formatPct } from './constants';
import SparkLine from './SparkLine';

type MetricTrendCardProps = {
    selectedHistory: MetricResponse[];
    cpuPoints: number[];
    ramPoints: number[];
    netPoints: number[];
    latest: MetricResponse | null;
    selectionLoading: boolean;
};

const MetricTrendCard = ({
    selectedHistory,
    cpuPoints,
    ramPoints,
    netPoints,
    latest,
    selectionLoading
}: MetricTrendCardProps) => {
    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${C.border}`,
                backgroundColor: C.surface,
                boxShadow: '0 2px 8px rgba(228,71,125,0.06)'
            }}
        >
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, color: C.text }}>
                    Trend overview
                </Typography>
                <Typography sx={{ color: C.muted, mt: 0.25 }}>
                    History for the selected service environment.
                </Typography>

                <Divider sx={{ my: 2, borderColor: C.border }} />

                {selectionLoading ? (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>CPU usage</Typography>
                                <Typography sx={{ fontWeight: 800, color: C.brand, fontSize: 14 }}>
                                    {latest?.cpuUsage != null ? `${latest.cpuUsage.toFixed(1)}%` : '—'}
                                </Typography>
                            </Box>
                            <SparkLine points={cpuPoints} color={C.brand} />
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>RAM usage</Typography>
                                <Typography sx={{ fontWeight: 800, color: '#2E5C8A', fontSize: 14 }}>
                                    {latest?.ramUsage != null ? `${latest.ramUsage.toFixed(1)}%` : '—'}
                                </Typography>
                            </Box>
                            <SparkLine points={ramPoints} color="#2E5C8A" />
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    Network usage
                                </Typography>
                                <Typography sx={{ fontWeight: 800, color: '#2E6B63', fontSize: 14 }}>
                                    {latest?.networkUsage != null ? `${latest.networkUsage.toFixed(1)} B/s` : '—'}
                                </Typography>
                            </Box>
                            <SparkLine points={netPoints} color="#2E6B63" />
                        </Box>
                    </Box>
                )}

                <Divider sx={{ my: 2, borderColor: C.border }} />

                <Typography sx={{ fontWeight: 700, color: C.text, mb: 1 }}>Recent history samples</Typography>
                {selectedHistory.length === 0 ? (
                    <Typography sx={{ color: C.muted }}>No historical metrics yet.</Typography>
                ) : (
                    <Box sx={{ display: 'grid', gap: 1 }}>
                        {selectedHistory
                            .slice(-5)
                            .reverse()
                            .map((metric) => (
                                <Box
                                    key={metric.id}
                                    sx={{
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 2,
                                        px: 1.5,
                                        py: 1,
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: '1fr repeat(4, auto)' },
                                        gap: 1.5,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, color: C.text }}>
                                            {formatDateTime(metric.createdAt)}
                                        </Typography>
                                        <Typography sx={{ color: C.subtle, fontSize: 12 }}>
                                            {metric.id}
                                        </Typography>
                                    </Box>
                                    <Chip size="small" label={`CPU ${formatPct(metric.cpuUsage)}`} />
                                    <Chip size="small" label={`RAM ${formatPct(metric.ramUsage)}`} />
                                    <Chip size="small" label={`Net ${formatBps(metric.networkUsage)}`} />
                                    <Chip size="small" label={`Pods ${metric.pods}`} />
                                </Box>
                            ))}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default MetricTrendCard;
