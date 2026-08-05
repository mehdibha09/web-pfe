import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import type { CostRecordResponse } from '../../../services/cloudPricerService';
import {
    listServiceEnvironments,
    listServices,
    listEnvironments
} from '../../../services/devopsService';
import { seLabel } from '../common/seLabel';
import { C } from '../../../theme/tokens';
import { getErrorMessage } from '../../../utils/errorMessage';

interface ModeComparisonCardProps {
    costs: CostRecordResponse[];
}

const BREAKDOWN = [
    { key: 'compute', label: 'costs.computeLabel', color: '#2E5C8A' },
    { key: 'storage', label: 'costs.storageLabel', color: '#8A6A2E' },
    { key: 'network', label: 'costs.networkLabel', color: '#10B981' },
    { key: 'backup', label: 'costs.backupLabel', color: '#5E4B9E' },
    { key: 'os', label: 'costs.osLabel', color: '#C95B6E' },
] as const;

interface ModeAgg {
    total: number;
    compute: number;
    storage: number;
    network: number;
    backup: number;
    os: number;
}

const emptyMode = (): ModeAgg => ({ total: 0, compute: 0, storage: 0, network: 0, backup: 0, os: 0 });

const money = (v: number) => v.toLocaleString(undefined, {
    minimumFractionDigits: v.toFixed(2) === '0.00' && v > 0 ? 4 : 2,
    maximumFractionDigits: v.toFixed(2) === '0.00' && v > 0 ? 6 : 2
});

/**
 * Flexible VM vs K8s comparison, grouped per service environment.
 * Only SEs that actually expose BOTH VM and K8s modes are shown — it is a
 * real comparison. Single-mode SEs are not displayed here.
 */
const ModeComparisonCard = ({ costs }: ModeComparisonCardProps) => {
    const { t } = useTranslation();
    const [seNames, setSeNames] = useState<Record<string, string>>({});

    useEffect(() => {
        (async () => {
            try {
                const [seRes, svcRes, envRes] = await Promise.all([
                    listServiceEnvironments(),
                    listServices(),
                    listEnvironments()
                ]);
                const labels: Record<string, string> = {};
                for (const se of seRes) {
                    labels[se.id] = seLabel(se, svcRes, envRes);
                }
                setSeNames(labels);
            } catch (e: unknown) {
                toast.error(getErrorMessage(e, t('costs.failedToLoad')));
            }
        })();
    }, []);

    const bySe = useMemo(() => {
        const map = new Map<string, Map<string, ModeAgg>>();
        for (const c of costs) {
            const modes = map.get(c.serviceEnvironmentId) ?? new Map<string, ModeAgg>();
            const m = modes.get(c.mode) ?? emptyMode();
            m.total += c.totalCost;
            m.compute += c.computeCost;
            m.storage += c.storageCost;
            m.network += c.networkCost;
            m.backup += c.backupCost;
            m.os += c.osCost;
            modes.set(c.mode, m);
            map.set(c.serviceEnvironmentId, modes);
        }
        return map;
    }, [costs]);

    const seEntries = useMemo(
        () =>
            [...bySe.entries()].filter(
                ([, modes]) => modes.has('VM') && modes.has('KUBERNETES')
            ),
        [bySe]
    );

    const grandTotal = seEntries.reduce((s, [, modes]) => {
        for (const m of modes.values()) s += m.total;
        return s;
    }, 0);

    if (seEntries.length === 0) {
        return null;
    }

    return (
        <Card sx={{ borderRadius: 3, mb: 3, transition: '0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StorageIcon sx={{ color: C.brand }} />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('costs.modeComparison')}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>
                        {t('costs.total')}: <strong>${money(grandTotal)}</strong>
                    </Typography>
                </Box>

                {seEntries.map(([seId, modes]) => {
                    const label = seNames[seId] ?? seId.slice(0, 24) + '…';
                    const modeList = ['VM', 'KUBERNETES'] as const;
                    return (
                        <Box key={seId} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
                                {label}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: 2
                                }}
                            >
                                {modeList.map((mode) => {
                                    const m = modes.get(mode);
                                    if (!m) return null;
                                    return (
                                        <Box
                                            key={mode}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                border: `1px solid ${C.border}`,
                                                backgroundColor: C.surface
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                <MemoryIcon sx={{ color: C.brand, fontSize: 20 }} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.text }}>
                                                    {mode === 'VM' ? t('costs.vmMode') : t('costs.k8sMode')}
                                                </Typography>
                                                <Typography sx={{ ml: 'auto', fontWeight: 900, color: C.brand }}>
                                                    ${money(m.total)}
                                                </Typography>
                                            </Box>
                                            {BREAKDOWN.map((b) => {
                                                const value = m[b.key];
                                                return (
                                                    <Box key={b.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                                        <Typography variant="caption" sx={{ color: b.color, fontWeight: 600 }}>
                                                            {t(b.label)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>
                                                            ${money(value)}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default ModeComparisonCard;