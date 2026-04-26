import { Button } from '@mui/material';
import PropTypes from 'prop-types';
const MyCustomButton = ({ children, sx = {}, ...otherProps }) => {
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
MyCustomButton.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};

export default MyCustomButton;
