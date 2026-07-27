import { Alert, Box, Card, CardContent, Divider, LinearProgress, Skeleton, Typography } from '@mui/material';
import type { MetricResponse } from '../../../services/devopsService';
import type { MetricSummary } from './constants';
import { C, formatBps, formatDateTime, formatPct } from './constants';

type MetricSnapshotCardProps = {
    latest: MetricResponse | null;
    selectionLoading: boolean;
    summary: MetricSummary | null;
    summarySource: 'api' | 'computed' | 'none';
    diskPct: number;
};

const MetricSnapshotCard = ({
    latest,
    selectionLoading,
    summary,
    summarySource,
    diskPct
}: MetricSnapshotCardProps) => {
    return (
        <Box sx={{ display: 'grid', gap: 2 }}>
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
                        Latest snapshot
                    </Typography>
                    <Typography sx={{ color: C.muted, mt: 0.25 }}>
                        The most recent metric returned by the API.
                    </Typography>

                    <Divider sx={{ my: 2, borderColor: C.border }} />

                    {selectionLoading ? (
                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="70%" />
                            <Skeleton variant="text" width="75%" />
                            <Skeleton variant="text" width="60%" />
                        </Box>
                    ) : latest ? (
                        <Box sx={{ display: 'grid', gap: 1.25 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>Metric ID</Typography>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        color: C.text,
                                        fontFamily: 'monospace',
                                        fontSize: 12
                                    }}
                                >
                                    {latest.id}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>Created at</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {formatDateTime(latest.createdAt)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>CPU / RAM</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {formatPct(latest.cpuUsage)} / {formatPct(latest.ramUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>Network / Disk</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {formatBps(latest.networkUsage)} / {formatPct(latest.diskUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>Pods</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>{latest.pods}</Typography>
                            </Box>

                            <Divider sx={{ my: 1.5, borderColor: C.border }} />

                            <Typography sx={{ color: C.muted, fontSize: 13, mb: 0.75 }}>
                                Disk utilization
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={diskPct}
                                sx={{
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: C.brandLight,
                                    '& .MuiLinearProgress-bar': {
                                        background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})`
                                    }
                                }}
                            />
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No metric found for the selected service environment.
                        </Alert>
                    )}
                </CardContent>
            </Card>

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
                        Summary
                    </Typography>
                    <Typography sx={{ color: C.muted, mt: 0.25 }}>
                        Aggregated values. Source:{' '}
                        {summarySource === 'api'
                            ? 'GET /metrics/summary/{id}'
                            : summarySource === 'computed'
                              ? 'computed from history'
                              : 'unavailable'}
                        .
                    </Typography>

                    <Divider sx={{ my: 2, borderColor: C.border }} />

                    {selectionLoading ? (
                        <Box sx={{ display: 'grid', gap: 1 }}>
                            <Skeleton variant="text" width="70%" />
                            <Skeleton variant="text" width="70%" />
                            <Skeleton variant="text" width="70%" />
                            <Skeleton variant="text" width="70%" />
                        </Box>
                    ) : summary ? (
                        <Box sx={{ display: 'grid', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>CPU avg</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.cpuUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>RAM avg</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.ramUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>Network avg</Typography>
                                <Typography sx={{ fontWeight: 700 }}>
                                    {formatBps(summary.networkUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>Disk avg</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.diskUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>Pods</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{summary.pods ?? '-'}</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No summary available yet.
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default MetricSnapshotCard;
