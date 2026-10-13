import type { ReactNode } from 'react';
import KpiCard from '../../components/KpiCard';

interface DashboardKpiCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: ReactNode;
    color: string;
    bgColor: string;
    onClick?: () => void;
}

// Thin wrapper over the shared KpiCard (stat variant) — kept for its existing
// import path/props; the visual output is identical to the previous inline card.
const DashboardKpiCard = (props: DashboardKpiCardProps) => (
    <KpiCard variant="stat" {...props} />
);

export default DashboardKpiCard;
