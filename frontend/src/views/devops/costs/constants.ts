export const BREAKDOWN_TYPES = ['COMPUTE', 'STORAGE', 'NETWORK', 'BACKUP', 'OS'] as const;

export interface BreakdownRow {
    type: string;
    unitCost: number;
    quantity: number;
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export const filterLabel: Record<PeriodFilter, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time'
};

export const getPeriodRange = (filter: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now);
    let start: Date;

    switch (filter) {
        case 'today': {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        }
        case 'week': {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            break;
        }
        case 'month': {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        case 'year': {
            start = new Date(now.getFullYear(), 0, 1);
            break;
        }
        default: {
            start = new Date(2020, 0, 1);
            break;
        }
    }

    return { start, end };
};
