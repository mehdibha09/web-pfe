export const currencySymbol = (): string => {
    if (typeof window !== 'undefined' && window.location?.pathname) {
        const lang = localStorage.getItem('i18nextLng');
        return lang?.startsWith('fr') ? '€' : '$';
    }
    return '$';
};

export const formatMoney = (value: number, decimals?: number): string => {
    const symbol = currencySymbol();
    const frac = decimals ?? (Math.abs(value) > 0 && Math.abs(value) < 0.01 ? 4 : 2);
    return `${symbol}${value.toLocaleString(undefined, {
        minimumFractionDigits: frac,
        maximumFractionDigits: frac
    })}`;
};

export const fmtDate = (iso?: string | null): string | null => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const fmtDateTime = (iso?: string | null): string | null => {
    if (!iso) return null;
    return new Date(iso).toLocaleString();
};

export const fmtCurrency = (value: number): string =>
    formatMoney(value, 2);

export const fmtNumber = (value: number, decimals = 0): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtPct = (value: number, decimals = 1): string => `${value.toFixed(decimals)}%`;

export const fmtBps = (bps: number): string => {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    if (bps < 1024 * 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    return `${(bps / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
};

export const truncate = (text: string, maxLen: number): string =>
    text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
