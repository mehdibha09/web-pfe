import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { Box, Card, CardContent, Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { generateForecast } from '../../../services/cloudPricerService';
import { getErrorMessage } from '../../../utils/errorMessage';
import { getStoredUser } from '../../../services/authStorage';
import { listServiceEnvironments, listServices, listEnvironments } from '../../../services/devopsService';
import type { ServiceEnvironmentResponse, ServiceResponse, EnvironmentResponse } from '../../../services/devopsService';
import { seLabel } from '../common/seLabel';
import MyCustomButton from '../../../components/MyCustomButton';
import { C } from '../../../theme/tokens';

const ForecastCard = () => {
    const { t } = useTranslation();
    const [forecastSeId, setForecastSeId] = useState('');
    const [forecastPeriod, setForecastPeriod] = useState('');
    const [forecastResult, setForecastResult] = useState<{
        predictedCost: number;
        confidenceLevel: number;
    } | null>(null);
    const [forecasting, setForecasting] = useState(false);
    const [seList, setSeList] = useState<ServiceEnvironmentResponse[]>([]);
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);

    useEffect(() => {
        const nextMonth = new Date();
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setForecastPeriod(nextMonth.toISOString().slice(0, 7));

        (async () => {
            try {
                const [seRes, svcRes, envRes] = await Promise.all([
                    listServiceEnvironments(),
                    listServices(),
                    listEnvironments()
                ]);
                setSeList(seRes);
                setServices(svcRes);
                setEnvironments(envRes);
            } catch (e: unknown) {
                toast.error(getErrorMessage(e, t('costs.failedToLoad')));
            }
        })();
    }, []);

    const handleForecast = async () => {
        const tenantId = getStoredUser()?.tenantId;
        if (!tenantId) return toast.error(t('costs.tenantIdRequired'));
        if (!forecastSeId.trim()) return toast.error(t('costs.serviceEnvIdRequired'));
        if (!forecastPeriod.trim()) return toast.error(t('costs.periodRequired'));

        setForecasting(true);
        setForecastResult(null);
        try {
            const result = await generateForecast(tenantId, forecastSeId.trim(), forecastPeriod.trim());
            setForecastResult({ predictedCost: result.predictedCost, confidenceLevel: result.confidenceLevel });
            toast.success(t('costs.forecastGenerated'));
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, t('costs.failedToGenerateForecast')));
        } finally {
            setForecasting(false);
        }
    };

    return (
        <Card sx={{ borderRadius: 3, mb: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AutoGraphIcon sx={{ color: C.brand }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('costs.simpleForecast')}
                    </Typography>
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth select label={t('costs.serviceEnvironmentId')} value={forecastSeId} onChange={(e) => setForecastSeId(e.target.value)} helperText={t('costs.serviceEnvHelper')}>
                            <MenuItem value="">{t('costs.selectServiceEnvironment')}</MenuItem>
                            {seList.map((se) => (
                                <MenuItem key={se.id} value={se.id}>{seLabel(se)}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label={t('costs.period')}
                            type="month"
                            value={forecastPeriod}
                            onChange={(e) => setForecastPeriod(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            helperText={t('costs.periodMonthHelper')}
                        />
                    </Grid>
                </Grid>

                <MyCustomButton
                    onClick={handleForecast}
                    disabled={forecasting}
                    sx={{ height: 48, px: 4 }}
                >
                    {forecasting ? t('costs.generating') : t('costs.generateForecast')}
                </MyCustomButton>

                {forecastResult && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 3 }}>
                        <Card sx={{ flex: 1, borderRadius: 3, backgroundColor: C.brandLight, border: `1px solid ${C.border}` }}>
                            <CardContent>
                                <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13 }}>
                                    {t('costs.predictedCost')}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: C.brand }}>
                                    ${forecastResult.predictedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1, borderRadius: 3, backgroundColor: '#D1FAE5', border: `1px solid ${C.border}` }}>
                            <CardContent>
                                <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: 13 }}>
                                    {t('costs.confidenceLevel')}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46' }}>
                                    {(forecastResult.confidenceLevel * 100).toFixed(1)}%
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default ForecastCard;