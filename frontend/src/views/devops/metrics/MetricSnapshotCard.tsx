import { Alert, Box, Card, CardContent, Divider, LinearProgress, Skeleton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MetricResponse } from '../../../services/devopsService';
import type { MetricSummary } from './constants';
import { C, formatBps, formatDateTime, formatPct, isMetricStale } from './constants';

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
    const { t } = useTranslation();
    const stale = isMetricStale(latest);
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
                        {t('metrics.latestSnapshot')}
                    </Typography>
                    <Typography sx={{ color: C.muted, mt: 0.25 }}>
                        {t('metrics.latestSnapshotHint')}
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
                                <Typography sx={{ color: C.muted }}>{t('metrics.metricId')}</Typography>
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
                                <Typography sx={{ color: C.muted }}>{t('metrics.createdAt')}</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {formatDateTime(latest.createdAt)} {stale ? `(${t('metrics.staleLabel')})` : ''}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.cpuRam')}</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {stale ? 'n/a' : formatPct(latest.cpuUsage)} / {stale ? 'n/a' : formatPct(latest.ramUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.networkDisk')}</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>
                                    {stale ? 'n/a' : formatBps(latest.networkUsage)} / {stale ? 'n/a' : formatPct(latest.diskUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.pods')}</Typography>
                                <Typography sx={{ fontWeight: 700, color: C.text }}>{stale ? 'n/a' : latest.pods}</Typography>
                            </Box>

                            <Divider sx={{ my: 1.5, borderColor: C.border }} />

                            <Typography sx={{ color: C.muted, fontSize: 13, mb: 0.75 }}>
                                {t('metrics.diskUtilization')}
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
                            {t('metrics.noMetricFound')}
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
                        {t('metrics.summary')}
                    </Typography>
                    <Typography sx={{ color: C.muted, mt: 0.25 }}>
                        {t('metrics.summaryHint', {
                            source:
                                summarySource === 'api'
                                    ? t('metrics.sourceApi')
                                    : summarySource === 'computed'
                                      ? t('metrics.sourceComputed')
                                      : t('metrics.sourceUnavailable')
                        })}
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
                                <Typography sx={{ color: C.muted }}>{t('metrics.cpuAvg')}</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.cpuUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.ramAvg')}</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.ramUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.networkAvg')}</Typography>
                                <Typography sx={{ fontWeight: 700 }}>
                                    {formatBps(summary.networkUsage)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.diskAvg')}</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{formatPct(summary.diskUsage)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: C.muted }}>{t('metrics.pods')}</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{summary.pods ?? '-'}</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {t('metrics.noSummaryAvailable')}
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default MetricSnapshotCard;
