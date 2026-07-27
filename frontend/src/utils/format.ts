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
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
