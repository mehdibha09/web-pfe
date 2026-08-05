export const stripLeadingZeros = (raw: string): string => {
    if (!raw) return '';
    let s = raw.trim();
    const negative = s.startsWith('-');
    if (negative) s = s.slice(1);
    while (s.length > 1 && s.startsWith('0') && s[1] !== '.') {
        s = s.slice(1);
    }
    return negative ? `-${s}` : s;
};

export const numericFieldValue = (raw: string): string => {
    if (/^\d+$/.test(raw)) return stripLeadingZeros(raw);
    if (/^-?\d/.test(raw)) {
        const bare = stripLeadingZeros(raw.replace('-', ''));
        return raw.startsWith('-') ? `-${bare}` : bare;
    }
    return raw;
};