import { createTheme } from '@mui/material/styles';

// Eco-friendly green palette for GreenSupply Co.
// White-first design with green accents — readability over heavy branding.
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32', // forest green
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    success: { main: '#388E3C' },
    info: { main: '#1976D2' },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // touch-friendly minimum
          textTransform: 'none', // plain language, no all-caps
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
      },
    },
  },
});

export default theme;
