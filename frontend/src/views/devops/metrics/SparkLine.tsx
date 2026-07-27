import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { C } from './constants';

const SparkLine = ({ points, color = C.brand }: { points: number[]; color?: string }) => {
    const { t } = useTranslation();
    const w = 320;
    const h = 70;
    const pad = 6;

    if (!points.length) {
        return (
            <Box
                sx={{
                    height: h,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: C.subtle,
                    fontSize: 13
                }}
            >
                {t('metrics.noDataYet')}
            </Box>
        );
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const denom = max - min || 1;

    const toX = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1 || 1);
    const toY = (v: number) => h - pad - ((v - min) * (h - pad * 2)) / denom;

    const linePath = points
        .map((p, i) => {
            const x = toX(i);
            const y = toY(p);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    const areaPath = `${linePath} L ${toX(points.length - 1)} ${h - pad} L ${toX(0)} ${h - pad} Z`;
    const gradientId = `spark-${color.replace('#', '')}`;

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default SparkLine;
