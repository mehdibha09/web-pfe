import type { SxProps, Theme } from '@mui/material';
import { Button } from '@mui/material';
import type { ReactNode } from 'react';

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
        backgroundColor: '#e4477d',
        fontWeight: 'bold',
        textTransform: 'capitalize',
        '&:hover': {
          backgroundColor: '#c31f58',
        },
        ...sx, // Allow additional styles to be passed
      }}
      variant="contained"
      {...otherProps}
    >
      {children}
    </Button>
  );
};

export default MyCustomButton;
