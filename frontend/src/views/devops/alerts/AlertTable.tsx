import {
    Button,
    Card,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import type { AlertResponse } from '../../../services/cloudPricerService';
import { SEVERITY_COLORS, ALERT_STATUS_COLORS, C } from '../../../theme/tokens';
import { fmtDateTime } from '../../../utils/format';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from 'react-i18next';

interface AlertTableProps {
    alerts: AlertResponse[];
    onAcknowledge: (id: string) => void;
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
}

const severityIcon: Record<string, React.ReactNode> = {
    CRITICAL: <ErrorOutlineOutlinedIcon sx={{ fontSize: 15 }} />,
    WARN: <WarningAmberIcon sx={{ fontSize: 15 }} />,
    INFO: <InfoOutlinedIcon sx={{ fontSize: 15 }} />
};

const severityGradient: Record<string, string> = {
    CRITICAL: 'linear-gradient(135deg, #F7DEE3, #F7DEE3)',
    WARN: 'linear-gradient(135deg, #F7ECD6, #F7ECD6)',
    INFO: 'linear-gradient(135deg, #E4EEF7, #BFDBFE)'
};

const statusIcon: Record<string, React.ReactNode> = {
    OPEN: <RadioButtonUncheckedIcon sx={{ fontSize: 15 }} />,
    ACK: <PauseCircleOutlinedIcon sx={{ fontSize: 15 }} />,
    RESOLVED: <CheckCircleOutlinedIcon sx={{ fontSize: 15 }} />
};

const statusGradient: Record<string, string> = {
    OPEN: 'linear-gradient(135deg, #F7DEE3, #F7DEE3)',
    ACK: 'linear-gradient(135deg, #F7ECD6, #F7ECD6)',
    RESOLVED: 'linear-gradient(135deg, #E0F1E6, #BBF7D0)'
};

const severityLabel: Record<string, string> = {
    CRITICAL: 'alerts.severityCritical',
    WARN: 'alerts.severityWarn',
    INFO: 'alerts.severityInfo'
};

const statusLabel: Record<string, string> = {
    OPEN: 'alerts.statusOpen',
    ACK: 'alerts.statusAck',
    RESOLVED: 'alerts.statusResolved'
};

const AlertTable = ({ alerts, onAcknowledge, onResolve, onDelete }: AlertTableProps) => {
    const { t } = useTranslation();

    const columns = [
        t('alerts.severity'),
        t('alerts.type'),
        t('alerts.metric'),
        t('alerts.threshold'),
        t('alerts.actualValue'),
        t('alerts.status'),
        t('alerts.message'),
        t('alerts.columnCreated'),
        t('alerts.columnActions')
    ];

    return (
        <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ background: 'linear-gradient(135deg, #F8F5FA, #F8F5FA)' }}>
                            {columns.map((h) => (
                                <TableCell key={h} sx={{ fontWeight: 700, color: '#334155', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${C.border}` }}>
                                    {h}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                <TableBody>
                    {alerts.map((a) => (
                        <TableRow
                            key={a.id}
                            hover
                            sx={{
                                '&:hover': {
                                    backgroundColor: '#F8F5FA !important',
                                    transition: 'background-color 0.15s ease'
                                },
                                '& td': { borderBottom: '1px solid #F1F5F9' }
                            }}
                        >
                            <TableCell>
                                <Chip
                                    icon={severityIcon[a.severity] as React.ReactElement}
                                    label={t(severityLabel[a.severity] || a.severity)}
                                    size="small"
                                    sx={{
                                        background: severityGradient[a.severity] || '#E2E8F0',
                                        color: SEVERITY_COLORS[a.severity]?.color || '#334155',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        '& .MuiChip-icon': { color: 'inherit' }
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{a.type === 'QUOTA' ? t('alerts.typeQuota') : a.type === 'BUDGET' ? t('alerts.typeBudget') : a.type}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography sx={{ color: '#334155', fontSize: 13 }}>{a.metric}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: 13, fontFamily: 'monospace' }}>{a.threshold}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography sx={{ fontWeight: 600, color: a.severity === 'CRITICAL' ? '#C95B6E' : '#475569', fontSize: 13, fontFamily: 'monospace' }}>{a.actualValue}</Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    icon={statusIcon[a.status] as React.ReactElement}
                                    label={t(statusLabel[a.status] || a.status)}
                                    size="small"
                                    sx={{
                                        background: statusGradient[a.status] || '#E2E8F0',
                                        color: ALERT_STATUS_COLORS[a.status]?.color || '#334155',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        '& .MuiChip-icon': { color: 'inherit' }
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <Typography sx={{ color: '#475569', fontSize: 13 }}>{a.message}</Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                <Typography sx={{ color: C.muted, fontSize: 12 }}>{fmtDateTime(a.createdAt)}</Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {a.status === 'OPEN' && (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => onAcknowledge(a.id)}
                                        sx={{
                                            mr: 0.5,
                                            fontWeight: 700,
                                            fontSize: 11,
                                            background: 'linear-gradient(135deg, #8A6A2E, #8A6A2E)',
                                            boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
                                            '&:hover': { boxShadow: '0 4px 10px rgba(245,158,11,0.4)' }
                                        }}
                                    >
                                        {t('alerts.actionAck')}
                                    </Button>
                                )}
                                {(a.status === 'OPEN' || a.status === 'ACK') && (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => onResolve(a.id)}
                                        sx={{
                                            mr: 0.5,
                                            fontWeight: 700,
                                            fontSize: 11,
                                            background: 'linear-gradient(135deg, #3F9B66, #2F8553)',
                                            boxShadow: '0 2px 6px rgba(34,197,94,0.3)',
                                            '&:hover': { boxShadow: '0 4px 10px rgba(34,197,94,0.4)' }
                                        }}
                                    >
                                        {t('alerts.actionResolve')}
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => onDelete(a.id)}
                                    sx={{ fontWeight: 700, fontSize: 11 }}
                                >
                                    {t('alerts.actionDelete')}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Card>
    );
};

export default AlertTable;
