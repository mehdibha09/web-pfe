import { Box, Button, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import { C } from '../theme/tokens';

interface PaginationBarProps {
    page: number;
    pageCount: number;
    total: number;
    onPageChange: (page: number) => void;
    label?: string;
}

const PaginationBar = ({ page, pageCount, total, onPageChange, label = 'page(s)' }: PaginationBarProps) => {
    if (pageCount <= 1) return null;

    const from = (page - 1) * 10 + 1;
    const to = Math.min(page * 10, total);

    const btnSx = {
        minWidth: 36,
        height: 36,
        borderRadius: 2,
        fontWeight: 700,
        fontSize: 14,
        color: C.text,
        borderColor: C.border,
        '&:hover': { backgroundColor: C.brandLight, borderColor: C.brand },
        '&.Mui-disabled': { opacity: 0.35 }
    };

    const activePageSx = {
        minWidth: 36,
        height: 36,
        borderRadius: 2,
        fontWeight: 700,
        fontSize: 14,
        backgroundColor: C.brand,
        color: '#FFFFFF',
        '&:hover': { backgroundColor: C.brandDark }
    };

    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pageCount, page + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderRadius: 3,
            backgroundColor: '#FAFAFF',
            border: `1px solid ${C.border}`,
            mt: 3
        }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: C.muted }}>
                {from}–{to} / {total} résultat{total > 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page <= 1}
                    onClick={() => onPageChange(1)}
                    sx={btnSx}
                >
                    <FirstPageIcon sx={{ fontSize: 18 }} />
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    sx={btnSx}
                >
                    <KeyboardArrowLeftIcon sx={{ fontSize: 18 }} />
                </Button>
                {pages.map((p) => (
                    <Button
                        key={p}
                        size="small"
                        variant={p === page ? 'contained' : 'outlined'}
                        onClick={() => onPageChange(p)}
                        sx={p === page ? activePageSx : btnSx}
                    >
                        {p}
                    </Button>
                ))}
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                    sx={btnSx}
                >
                    <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(pageCount)}
                    sx={btnSx}
                >
                    <LastPageIcon sx={{ fontSize: 18 }} />
                </Button>
            </Box>
        </Box>
    );
};

export default PaginationBar;
