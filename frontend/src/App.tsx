import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Routes from './routes/routes';

const appTheme = createTheme({
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #F5D8E4',
          boxShadow: '0 8px 18px rgba(228, 71, 125, 0.06)',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F5CFE0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#EC7AA7',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E4477D',
            borderWidth: 2,
          },
        },
        input: {
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#7A5A68',
          '&.Mui-focused': {
            color: '#C22F6B',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Router>
        <Routes />
        <ToastContainer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
