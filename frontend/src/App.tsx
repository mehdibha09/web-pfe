import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Routes from './routes/routes';
import { C, BTN, R } from './theme/tokens';

const appTheme = createTheme({
    shape: {
        // Keep the historical base (12) so existing numeric `borderRadius` sx
        // values across pages are unchanged; explicit R.* tokens are used where
        // a specific control/card radius is set.
        borderRadius: 12
    },
    palette: {
        primary: {
            main: C.brand,
            dark: C.brandDark,
            light: C.brandLight,
            contrastText: '#FFFFFF'
        },
        error: {
            main: C.danger,
            light: C.dangerLight,
            contrastText: '#FFFFFF'
        },
        text: {
            primary: C.text,
            secondary: C.muted
        },
        divider: C.border
    },
    // Poppins is loaded globally (index.css). Wiring it here so MUI `variant`
    // typography uses it too, with weights aligned to the current usage
    // (page titles 800, sub-headers 700) — same look, consistent hierarchy.
    typography: {
        fontFamily: 'Poppins, sans-serif',
        h4: { fontWeight: 800 },
        h5: { fontWeight: 800 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 700 },
        subtitle2: { fontWeight: 700 },
        button: { fontWeight: 700, textTransform: 'none' }
    },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: ({ ownerState }) => ({
                    borderRadius: R.control,
                    textTransform: 'none',
                    fontWeight: 700,
                    '&.Mui-disabled': {
                        background: '#E5E7EB',
                        color: '#9CA3AF'
                    },
                    ...(ownerState.variant === 'contained' &&
                        (ownerState.color === 'primary' || ownerState.color === undefined) && {
                            background: BTN.primary.gradient,
                            '&:hover': { background: BTN.primary.gradientHover },
                            '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                        }),
                    ...(ownerState.variant === 'contained' &&
                        ownerState.color === 'error' && {
                            background: BTN.danger.gradient,
                            '&:hover': { background: BTN.danger.gradientHover }
                        })
                })
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: R.card,
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 8px 18px rgba(228, 71, 125, 0.06)',
                    backgroundColor: C.surface
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: C.brandDark,
                    backgroundColor: C.surfaceAlt,
                    borderBottom: `2px solid ${C.border}`
                },
                root: {
                    borderColor: C.border
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: { borderRadius: R.card }
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: C.text,
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 8,
                    padding: '6px 10px'
                },
                arrow: { color: C.text }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: C.surface,
                    borderRadius: R.control,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#F5CFE0'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#EC7AA7'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: C.brand,
                        borderWidth: 2
                    }
                },
                input: {
                    paddingTop: 12,
                    paddingBottom: 12
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: '#7A5A68',
                    '&.Mui-focused': {
                        color: '#C22F6B'
                    }
                }
            }
        }
    }
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
