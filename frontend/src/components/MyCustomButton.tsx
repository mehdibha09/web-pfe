import type { SxProps, Theme } from '@mui/material';
import { Button } from '@mui/material';
import { memo, type ReactNode } from 'react';

interface MyCustomButtonProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
  [key: string]: any;
}

// Primary action button. Styling (brand gradient, radius, disabled state,
// text-transform) now comes from the shared theme (MuiButton), so this stays a
// thin, consistent wrapper — callers can still pass `sx`/props to extend it.
const MyCustomButton = ({ children, sx = {}, ...otherProps }: MyCustomButtonProps) => {
  return (
    <Button variant="contained" sx={sx} {...otherProps}>
      {children}
    </Button>
  );
};

export default memo(MyCustomButton);
