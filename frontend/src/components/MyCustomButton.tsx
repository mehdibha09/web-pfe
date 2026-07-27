import type { SxProps, Theme } from '@mui/material';
import { Button } from '@mui/material';
import type { ReactNode } from 'react';
import { C, BTN } from '../theme/tokens';

interface MyCustomButtonProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
  [key: string]: any;
}

const MyCustomButton = ({ children, sx = {}, ...otherProps }: MyCustomButtonProps) => {
  return (
    <Button
      sx={{
        p: 1,
        borderRadius: '5px',
        background: BTN.primary.gradient,
        fontWeight: 'bold',
        textTransform: 'capitalize',
        '&:hover': {
          background: BTN.primary.gradientHover,
        },
        '&.Mui-disabled': {
          background: '#E5E7EB',
          color: '#9CA3AF',
        },
        ...sx,
      }}
      variant="contained"
      {...otherProps}
    >
      {children}
    </Button>
  );
};

export default MyCustomButton;
