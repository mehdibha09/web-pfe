import { Skeleton, TableCell, TableRow } from '@mui/material';

interface TableSkeletonProps {
    rows?: number;
    columns: number;
}

/** Consistent loading placeholder for tables — render inside a <TableBody>.
 *  Usage: {loading ? <TableSkeleton rows={5} columns={6} /> : rows.map(...)} */
const TableSkeleton = ({ rows = 5, columns }: TableSkeletonProps) => (
    <>
        {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                    <TableCell key={c}>
                        <Skeleton variant="text" height={22} />
                    </TableCell>
                ))}
            </TableRow>
        ))}
    </>
);

export default TableSkeleton;
