import {
    Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, MenuItem, Switch, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import CalculateIcon from '@mui/icons-material/Calculate';
import ComputerIcon from '@mui/icons-material/Computer';
import FilterListIcon from '@mui/icons-material/FilterList';
import MemoryIcon from '@mui/icons-material/Memory';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import { getStoredUser } from '../../../services/authStorage';
import { canManagePricing } from '../../../services/authorization';
import {
    calculateCost,
    createPricing,
    deletePricing,
    listPricing,
    updatePricing
} from '../../../services/pricingService';
import MyCustomButton from '../../../components/MyCustomButton';
import PaginationBar from '../../../components/PaginationBar';
import { BTN, C } from '../../../theme/tokens';
import type { CalculateCostResponse, PriceConfigResponse } from '../../../services/interfaces/cloudPricer';

const MODES = ['VM', 'KUBERNETES'];
const RESOURCE_TYPES = ['CPU', 'RAM', 'DISK', 'NETWORK', 'BACKUP', 'OS'];
const UNITS: Record<string, string[]> = {
    CPU: ['core/hour'],
    RAM: ['GB/hour'],
    DISK: ['GB/month'],
    NETWORK: ['GB'],
    BACKUP: ['GB/month'],
    OS: ['month']
};
const CURRENCIES = ['USD', 'EUR'];

const RESOURCE_COLORS: Record<string, { bg: string; color: string }> = {
    CPU: { bg: '#E4EEF7', color: '#2E5C8A' },
    RAM: { bg: '#E0F1E6', color: '#2E7A4F' },
    DISK: { bg: '#F7ECD6', color: '#8A6A2E' },
    NETWORK: { bg: '#E0F4F7', color: '#0E7490' },
    BACKUP: { bg: '#F3E8FF', color: '#7C3AED' },
    OS: { bg: '#FCE7F3', color: '#E4477D' }
};

const PricingPage = () => {
    const { t } = useTranslation();
    const [prices, setPrices] = useState<PriceConfigResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [modeFilter, setModeFilter] = useState('');
    const [currentUser, setCurrentUser] = useState(getStoredUser());
    const allowManage = currentUser ? canManagePricing(currentUser) : false;

    /* ── Create form ── */
    const [mode, setMode] = useState('VM');
    const [resourceType, setResourceType] = useState('CPU');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [priceError, setPriceError] = useState('');
    const [unit, setUnit] = useState('core/hour');
    const [currency, setCurrency] = useState('USD');

    /* ── Inline edit ── */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPricePerUnit, setEditPricePerUnit] = useState('');
    const [editCurrency, setEditCurrency] = useState('USD');
    const [editActive, setEditActive] = useState(true);

    /* ── Delete confirmation ── */
    const [deleteTarget, setDeleteTarget] = useState<PriceConfigResponse | null>(null);

    /* ── Pagination ── */
    const PAGE_SIZE = 10;
    const [vmPage, setVmPage] = useState(1);
    const [k8sPage, setK8sPage] = useState(1);

    /* ── Cost calculator ── */
    const [calcMode, setCalcMode] = useState('VM');
    const [calcCpu, setCalcCpu] = useState('2');
    const [calcRam, setCalcRam] = useState('4');
    const [calcDisk, setCalcDisk] = useState('20');
    const [calcNetwork, setCalcNetwork] = useState('50');
    const [calcBackup, setCalcBackup] = useState('5');
    const [calcHours, setCalcHours] = useState('720');
    const [calcResult, setCalcResult] = useState<CalculateCostResponse | null>(null);
    const [calcLoading, setCalcLoading] = useState(false);

    const formRef = useRef<HTMLDivElement>(null);

    const handleAddPrice = (modeType: string) => {
        setMode(modeType);
        setModeFilter(modeType);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    /* ── Data loading ── */
    const loadPricing = async () => {
        setLoading(true);
        try {
            const response = await listPricing(modeFilter || undefined);
            setPrices(response);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.failedToLoadPricing'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPricing(); }, [modeFilter]);

    useEffect(() => { setVmPage(1); setK8sPage(1); }, [modeFilter]);

    useEffect(() => {
        const syncUser = () => setCurrentUser(getStoredUser());
        window.addEventListener('authUserUpdated', syncUser);
        window.addEventListener('storage', syncUser);
        return () => {
            window.removeEventListener('authUserUpdated', syncUser);
            window.removeEventListener('storage', syncUser);
        };
    }, []);

    useEffect(() => {
        setUnit(UNITS[resourceType]?.[0] || '');
    }, [resourceType]);

    /* ── Derived ── */
    const vmPrices = useMemo(() => prices.filter(p => p.mode === 'VM'), [prices]);
    const k8sPrices = useMemo(() => prices.filter(p => p.mode === 'KUBERNETES'), [prices]);

    const paginatedVm = useMemo(() => {
        const start = (vmPage - 1) * PAGE_SIZE;
        return vmPrices.slice(start, start + PAGE_SIZE);
    }, [vmPrices, vmPage]);

    const paginatedK8s = useMemo(() => {
        const start = (k8sPage - 1) * PAGE_SIZE;
        return k8sPrices.slice(start, start + PAGE_SIZE);
    }, [k8sPrices, k8sPage]);

    const vmPageCount = Math.max(1, Math.ceil(vmPrices.length / PAGE_SIZE));
    const k8sPageCount = Math.max(1, Math.ceil(k8sPrices.length / PAGE_SIZE));

    /* ── Validation helpers ── */
    const isValidPrice = (v: string) => {
        const n = parseFloat(v);
        return v.trim() !== '' && !isNaN(n) && n >= 0;
    };

    /* ── Handlers ── */
    const handleCreate = async () => {
        if (!allowManage) { toast.error(t('admin.pricing.noPermission')); return; }
        if (!isValidPrice(pricePerUnit)) {
            setPriceError(t('admin.pricing.mustBePositiveNumber'));
            return;
        }
        setPriceError('');
        try {
            await createPricing({
                mode, resourceType, pricePerUnit: parseFloat(pricePerUnit), unit, currency, isActive: true
            });
            toast.success(t('admin.pricing.priceCreated'));
            setPricePerUnit('');
            await loadPricing();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.failedToCreate'));
        }
    };

    const handleUpdate = async (id: string) => {
        if (!allowManage) { toast.error(t('admin.pricing.noPermission')); return; }
        if (!isValidPrice(editPricePerUnit)) { toast.error(t('admin.pricing.validPriceRequired')); return; }
        try {
            const existing = prices.find(p => p.id === id);
            if (!existing) return;
            await updatePricing(id, {
                mode: existing.mode,
                resourceType: existing.resourceType,
                pricePerUnit: parseFloat(editPricePerUnit),
                unit: existing.unit,
                currency: editCurrency,
                isActive: editActive
            });
            toast.success(t('admin.pricing.priceUpdated'));
            setEditingId(null);
            await loadPricing();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.failedToUpdate'));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget || !allowManage) return;
        try {
            await deletePricing(deleteTarget.id);
            toast.success(t('admin.pricing.priceDeleted'));
            setDeleteTarget(null);
            await loadPricing();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.failedToDelete'));
        }
    };

    const handleToggleActive = async (item: PriceConfigResponse) => {
        if (!allowManage) return;
        try {
            await updatePricing(item.id, {
                mode: item.mode,
                resourceType: item.resourceType,
                pricePerUnit: item.pricePerUnit,
                unit: item.unit,
                currency: item.currency,
                isActive: !item.isActive
            });
            await loadPricing();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.failedToUpdateStatus'));
        }
    };

    const handleCalculate = async () => {
        setCalcLoading(true);
        try {
            const result = await calculateCost({
                mode: calcMode,
                cpu: parseFloat(calcCpu) || 0,
                ram: parseFloat(calcRam) || 0,
                disk: parseFloat(calcDisk) || 0,
                network_usage: parseFloat(calcNetwork) || 0,
                backup_size: parseFloat(calcBackup) || 0,
                hours: parseFloat(calcHours) || 0,
            });
            setCalcResult(result);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || t('admin.pricing.calculationFailed'));
        } finally {
            setCalcLoading(false);
        }
    };

    /* ── Table renderer ── */
    const renderPriceTable = (title: string, modeType: string, items: PriceConfigResponse[]) => {
        const isVm = modeType === 'VM';
        const accentGradient = isVm
            ? 'linear-gradient(90deg, #2E5C8A, #5E9BC8)'
            : 'linear-gradient(90deg, #7C3AED, #A78BFA)';
        const headerBg = isVm ? '#F1F6FC' : '#F5F0FD';
        const headerColor = isVm ? '#2E5C8A' : '#7C3AED';
        const zebraBg = isVm ? '#FAFCFE' : '#FCFAFE';
        const hoverBg = isVm ? '#F3F8FD' : '#F8F4FD';
        const headerIcon = isVm ? <ComputerIcon sx={{ fontSize: 20 }} /> : <MemoryIcon sx={{ fontSize: 20 }} />;

        return (
            <Card
                key={modeType}
                sx={{
                    borderRadius: 3,
                    mb: 3,
                    position: 'relative',
                    overflow: 'visible',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': { boxShadow: '0 10px 26px rgba(0,0,0,0.07)' }
                }}
            >
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: accentGradient,
                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                }} />
                <CardContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 34, height: 34, borderRadius: 2,
                                backgroundColor: headerBg, color: headerColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {headerIcon}
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{title}</Typography>
                        </Box>
                        {allowManage && (
                            <MyCustomButton
                                size="small"
                                onClick={() => handleAddPrice(modeType)}
                                sx={{ height: 32, px: 2, fontSize: 13 }}
                            >
                                {t('admin.pricing.addPrice', { mode: modeType === 'VM' ? 'VM' : 'K8s' })}
                            </MyCustomButton>
                        )}
                    </Box>
                    {items.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 5 }}>
                            <Box sx={{
                                width: 56, height: 56, borderRadius: 3,
                                backgroundColor: headerBg, color: headerColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mx: 'auto', mb: 2
                            }}>
                                {headerIcon}
                            </Box>
                            <Typography sx={{ color: C.muted, mb: 1.5 }}>
                                {t('admin.pricing.noPricesConfigured', { mode: modeType === 'VM' ? 'VM' : 'K8s' })}
                            </Typography>
                            {allowManage && (
                                <MyCustomButton
                                    size="small"
                                    onClick={() => handleAddPrice(modeType)}
                                    sx={{ height: 32, px: 2, fontSize: 13 }}
                                >
                                    {t('admin.pricing.addPrice', { mode: modeType === 'VM' ? 'VM' : 'K8s' })}
                                </MyCustomButton>
                            )}
                        </Box>
                    ) : (
                        <TableContainer sx={{ border: `1px solid ${C.border}`, borderRadius: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{
                                        backgroundColor: headerBg,
                                        '& th': {
                                            color: headerColor,
                                            fontWeight: 800,
                                            fontSize: 12,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.6,
                                            py: 1.4,
                                            borderBottom: `1px solid ${C.border}`
                                        }
                                    }}>
                                        <TableCell>{t('admin.pricing.resource')}</TableCell>
                                        <TableCell>{t('admin.pricing.price')}</TableCell>
                                        <TableCell>{t('admin.pricing.unit')}</TableCell>
                                        <TableCell>{t('admin.pricing.currency')}</TableCell>
                                        <TableCell>{t('admin.pricing.status')}</TableCell>
                                        {allowManage && <TableCell>{t('common.actions')}</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            sx={{
                                                '&:nth-of-type(even)': { backgroundColor: zebraBg },
                                                '&:hover': { backgroundColor: hoverBg },
                                                transition: 'background-color 0.15s ease',
                                                '& td': { py: 1.4, borderBottom: `1px solid ${C.border}` }
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{
                                                    display: 'inline-flex', alignItems: 'center', px: 1.2, py: 0.5,
                                                    borderRadius: 2, fontSize: 12.5, fontWeight: 700,
                                                    backgroundColor: RESOURCE_COLORS[item.resourceType]?.bg || C.brandLight,
                                                    color: RESOURCE_COLORS[item.resourceType]?.color || C.brand
                                                }}>
                                                    {item.resourceType}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <TextField size="small" type="number" value={editPricePerUnit}
                                                        onChange={(e) => setEditPricePerUnit(e.target.value)}
                                                        slotProps={{ htmlInput: { step: '0.0001', min: 0 } }}
                                                        sx={{ width: 110 }} />
                                                ) : (
                                                    <Typography sx={{ fontWeight: 600, color: C.text }}>
                                                        ${item.pricePerUnit.toFixed(4)}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ color: C.muted }}>{item.unit}</TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <TextField select size="small" value={editCurrency}
                                                        onChange={(e) => setEditCurrency(e.target.value)} sx={{ width: 90 }}>
                                                        {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                                    </TextField>
                                                ) : (
                                                    <Typography sx={{ fontWeight: 600, color: C.text }}>{item.currency}</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Switch
                                                        checked={editActive}
                                                        onChange={(_, v) => setEditActive(v)}
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.brand, opacity: 1 },
                                                            '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': { backgroundColor: '#E5E7EB', opacity: 1 },
                                                            '& .MuiSwitch-thumb': { backgroundColor: editActive ? '#fff' : '#aaa' }
                                                        }}
                                                    />
                                                ) : (
                                                    <Switch
                                                        checked={item.isActive}
                                                        onChange={() => handleToggleActive(item)}
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.brand, opacity: 1 },
                                                            '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': { backgroundColor: '#E5E7EB', opacity: 1 },
                                                            '& .MuiSwitch-thumb': { backgroundColor: item.isActive ? '#fff' : '#aaa' }
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            {allowManage && (
                                                <TableCell>
                                                    {editingId === item.id ? (
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <MyCustomButton
                                                                size="small"
                                                                onClick={() => handleUpdate(item.id)}
                                                                sx={{ height: 30, px: 2, fontSize: 12 }}
                                                            >
                                                                {t('common.save')}
                                                            </MyCustomButton>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => setEditingId(null)}
                                                                sx={{ textTransform: 'none', borderColor: C.border, color: C.muted }}
                                                            >
                                                                {t('common.cancel')}
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => {
                                                                    setEditingId(item.id);
                                                                    setEditPricePerUnit(String(item.pricePerUnit));
                                                                    setEditCurrency(item.currency);
                                                                    setEditActive(item.isActive);
                                                                }}
                                                                sx={{
                                                                    textTransform: 'none', fontWeight: 600,
                                                                    borderColor: '#2E5C8A', color: '#2E5C8A'
                                                                }}
                                                            >
                                                                {t('common.edit')}
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => setDeleteTarget(item)}
                                                                sx={{
                                                                    textTransform: 'none', fontWeight: 600,
                                                                    borderColor: '#C95B6E', color: '#C95B6E'
                                                                }}
                                                            >
                                                                {t('common.delete')}
                                                            </Button>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        );
    };

    /* ── Summary card ── */
    const SummaryCard = ({ label, value, bg, color, onClick }: { label: string; value: number; bg: string; color: string; onClick?: () => void }) => {
        const icon = color === C.brand
            ? <PriceChangeIcon sx={{ fontSize: 24 }} />
            : color === '#2E5C8A'
                ? <ComputerIcon sx={{ fontSize: 24 }} />
                : <MemoryIcon sx={{ fontSize: 24 }} />;
        return (
            <Card
                sx={{
                    borderRadius: 3,
                    cursor: onClick ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'visible',
                    transition: 'all 0.2s ease',
                    border: modeFilter && onClick ? `2px solid ${color}` : `1px solid ${color}22`,
                    backgroundColor: bg,
                    boxShadow: modeFilter && onClick ? `0 6px 18px ${color}26` : undefined,
                    '&:hover': onClick ? { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${color}33` } : {}
                }}
                onClick={onClick}
            >
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                }} />
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 3, pb: 2.5 }}>
                    <Box sx={{
                        width: 46, height: 46, borderRadius: 2, flexShrink: 0,
                        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${color}33`
                    }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="overline" sx={{ color: C.muted, lineHeight: 1, display: 'block' }}>{label}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color }}>{value}</Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    /* ── Cost calculator result ── */
    const calcBreakdown = calcResult ? [
        { label: t('admin.pricing.computeCpuRam'), value: calcResult.computeCost, color: '#E4477D', bg: '#FCE7F3' },
        { label: t('admin.pricing.storageDisk'), value: calcResult.storageCost, color: '#2E5C8A', bg: '#E4EEF7' },
        { label: t('admin.pricing.network'), value: calcResult.networkCost, color: '#8A6A2E', bg: '#F7ECD6' },
        { label: t('admin.pricing.backup'), value: calcResult.backupCost, color: '#065F46', bg: '#D1FAE5' },
        { label: t('admin.pricing.osLicense'), value: calcResult.osCost, color: '#7C3AED', bg: '#F3E8FF' },
    ] : [];

    /* ── Render ── */
    return (
        <Box sx={{ p: 4, background: 'linear-gradient(180deg, #FDFCFF 0%, #F8F5FA 100%)', minHeight: '100%' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ width: 48, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #E4477D, #BE185D)', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: C.text }}>
                    {t('admin.pricing.title')}
                </Typography>
                <Typography sx={{ color: C.muted }}>
                    {t('admin.pricing.subtitle')}
                </Typography>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: C.brand }} />
                </Box>
            ) : (
            <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5, mb: 3 }}>
                <SummaryCard
                    label={t('admin.pricing.totalPrices')}
                    value={prices.length}
                    bg={modeFilter === '' ? '#FCE7F3' : '#FFF'}
                    color={C.brand}
                    onClick={() => setModeFilter('')}
                />
                <SummaryCard
                    label={t('admin.pricing.vmPrices')}
                    value={vmPrices.length}
                    bg={modeFilter === 'VM' ? '#E4EEF7' : '#FFF'}
                    color="#2E5C8A"
                    onClick={() => setModeFilter(modeFilter === 'VM' ? '' : 'VM')}
                />
                <SummaryCard
                    label={t('admin.pricing.k8sPrices')}
                    value={k8sPrices.length}
                    bg={modeFilter === 'KUBERNETES' ? '#F3E8FF' : '#FFF'}
                    color="#7C3AED"
                    onClick={() => setModeFilter(modeFilter === 'KUBERNETES' ? '' : 'KUBERNETES')}
                />
            </Box>

            {/* Create Price */}
            {allowManage && (
                <Card
                    ref={formRef}
                    sx={{
                        borderRadius: 3,
                        mb: 3,
                        position: 'relative',
                        overflow: 'visible',
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 4px 18px rgba(228,71,125,0.06)'
                    }}
                >
                    <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: 'linear-gradient(90deg, #E4477D, #BE185D)',
                        borderTopLeftRadius: 12, borderTopRightRadius: 12
                    }} />
                    <CardContent sx={{ pt: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                            <Box sx={{
                                width: 34, height: 34, borderRadius: 2,
                                backgroundColor: C.brandLight, color: C.brand,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <AddCircleOutlinedIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                {t('admin.pricing.createPrice')}
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(6, minmax(0, 1fr))' },
                            gap: 2,
                            alignItems: 'end'
                        }}>
                            <TextField select label={t('admin.pricing.mode')} value={mode} onChange={(e) => setMode(e.target.value)}>
                                {MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </TextField>
                            <TextField select label={t('admin.pricing.resourceType')} value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                                {RESOURCE_TYPES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </TextField>
                            <Box>
                                {priceError && (
                                <Typography variant="caption" sx={{ color: 'error.main', mb: 0.5, display: 'block' }}>
                                    {priceError}
                                </Typography>
                                )}
                                <TextField
                                    label={t('admin.pricing.price')} type="number" value={pricePerUnit}
                                    onChange={(e) => { setPricePerUnit(e.target.value); setPriceError(''); }}
                                    error={!!priceError}
                                    slotProps={{ htmlInput: { step: '0.0001', min: 0 } }}
                                    fullWidth
                                />
                            </Box>
                            <TextField label={t('admin.pricing.unit')} value={unit} slotProps={{ input: { readOnly: true } }} />
                            <TextField select label={t('admin.pricing.currency')} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </TextField>
                            <MyCustomButton
                                onClick={handleCreate}
                                sx={{ height: 40, width: { xs: '100%', xl: 'auto' } }}
                            >
                                {t('common.create')}
                            </MyCustomButton>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Filter */}
            <Card sx={{
                borderRadius: 3,
                mb: 3,
                position: 'relative',
                overflow: 'visible',
                transition: 'box-shadow 0.2s ease',
                '&:hover': { boxShadow: '0 10px 26px rgba(0,0,0,0.05)' }
            }}>
                <CardContent sx={{ py: 2.25 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 34, height: 34, borderRadius: 2,
                                backgroundColor: C.brandLight, color: C.brand,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FilterListIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                {t('admin.pricing.filterByMode')}
                            </Typography>
                        </Box>
                        <TextField select label={t('admin.pricing.mode')} value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 220 } }} size="small">
                            <MenuItem value="">{t('admin.pricing.allModes')}</MenuItem>
                            {MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                    </Box>
                </CardContent>
            </Card>

            {/* Tables */}
            {(!modeFilter || modeFilter === 'VM') && (
                <>
                {renderPriceTable(t('admin.pricing.vmPricing'), 'VM', paginatedVm)}
                {vmPrices.length > 0 && <PaginationBar page={vmPage} pageCount={vmPageCount} total={vmPrices.length} onPageChange={setVmPage} />}
                </>
            )}
            {(!modeFilter || modeFilter === 'KUBERNETES') && (
                <>
                {renderPriceTable(t('admin.pricing.kubernetesPricing'), 'KUBERNETES', paginatedK8s)}
                {k8sPrices.length > 0 && <PaginationBar page={k8sPage} pageCount={k8sPageCount} total={k8sPrices.length} onPageChange={setK8sPage} />}
                </>
            )}

            {/* Cost Calculator */}
            <Card sx={{ borderRadius: 3, position: 'relative', overflow: 'visible', transition: 'box-shadow 0.2s ease', '&:hover': { boxShadow: '0 10px 26px rgba(0,0,0,0.06)' } }}>
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, #E4477D, #BE185D)',
                    borderTopLeftRadius: 12, borderTopRightRadius: 12
                }} />
                <CardContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{
                            width: 34, height: 34, borderRadius: 2,
                            backgroundColor: C.brandLight, color: C.brand,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CalculateIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{t('admin.pricing.costCalculator')}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: C.muted, mb: 2.5 }}>
                        {t('admin.pricing.costCalculatorSubtitle')}
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr) 140px' },
                        gap: 2,
                        mb: 2,
                        alignItems: 'end'
                    }}>
                        <TextField select label={t('admin.pricing.mode')} value={calcMode} onChange={(e) => setCalcMode(e.target.value)}>
                            {MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                        <TextField label={t('admin.pricing.cpuCores')} type="number" value={calcCpu} onChange={(e) => setCalcCpu(e.target.value)}
                            slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField label={t('admin.pricing.ramGb')} type="number" value={calcRam} onChange={(e) => setCalcRam(e.target.value)}
                            slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField label={t('admin.pricing.diskGb')} type="number" value={calcDisk} onChange={(e) => setCalcDisk(e.target.value)}
                            slotProps={{ htmlInput: { min: 0 } }} />
                        <MyCustomButton
                            onClick={handleCalculate}
                            disabled={calcLoading}
                            sx={{ height: 40, width: { xs: '100%', md: 'auto' } }}
                        >
                            {calcLoading ? t('admin.pricing.calculating') : t('admin.pricing.calculate')}
                        </MyCustomButton>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                        <TextField label={t('admin.pricing.networkGb')} type="number" value={calcNetwork} onChange={(e) => setCalcNetwork(e.target.value)}
                            slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField label={t('admin.pricing.backupGb')} type="number" value={calcBackup} onChange={(e) => setCalcBackup(e.target.value)}
                            slotProps={{ htmlInput: { min: 0 } }} />
                        <TextField label={t('admin.pricing.hoursMonthly')} type="number" value={calcHours} onChange={(e) => setCalcHours(e.target.value)}
                            slotProps={{ htmlInput: { min: 1, max: 744 } }} />
                        <Box />
                    </Box>

                    {/* Result */}
                    {calcResult && (
                        <Box sx={{ mt: 3.5, border: `1px solid ${C.border}`, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ px: 3, py: 2.25, backgroundColor: '#FDFCFF', borderBottom: `1px solid ${C.border}` }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>
                                    {t('admin.pricing.estimatedCost')}
                                </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2.5 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
                                    {calcBreakdown.map(b => (
                                        <Box
                                            key={b.label}
                                            sx={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.75,
                                                borderRadius: 2,
                                                background: `linear-gradient(135deg, ${b.bg} 0%, #FFFFFF 100%)`,
                                                border: `1px solid ${b.bg}`,
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 14px ${b.bg}55` }
                                            }}
                                        >
                                            <Typography sx={{ color: b.color, fontWeight: 600, fontSize: 14 }}>{b.label}</Typography>
                                            <Typography sx={{ color: b.color, fontWeight: 800, fontSize: 16 }}>${b.value.toFixed(2)}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                <Box sx={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2.5,
                                    borderRadius: 2,
                                    background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                                    boxShadow: `0 8px 20px ${C.brand}40`
                                }}>
                                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                                        {t('admin.pricing.totalHours', { hours: parseFloat(calcHours) || 0 })}
                                    </Typography>
                                    <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 26 }}>
                                        ${calcResult.totalCost.toFixed(2)}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: C.muted, display: 'block', mt: 1.25, textAlign: 'right' }}>
                                    ~${(calcResult.totalCost / (parseFloat(calcHours) || 1)).toFixed(4)}/h · ~${calcResult.totalCost.toFixed(2)}/mo
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
            </>)}
            
            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#F7DEE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚠</Box>
                    {t('admin.pricing.deleteThisPrice')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('admin.pricing.deleteConfirmation', { resourceType: deleteTarget?.resourceType, mode: deleteTarget?.mode })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} variant="outlined" sx={{ textTransform: 'none' }}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        sx={{ background: BTN.danger.gradient, fontWeight: 700, textTransform: 'none' }}
                    >
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PricingPage;
