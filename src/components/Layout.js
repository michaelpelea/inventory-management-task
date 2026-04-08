import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import InventoryIcon from '@mui/icons-material/Inventory';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Warehouses', href: '/warehouses' },
  { label: 'Stock', href: '/stock' },
  { label: 'Transfers', href: '/transfers' },
];

// Shared layout wrapper used by every page.
// Centralises the AppBar and navigation so adding/removing links
// only requires a change here, not in every page file.
export default function Layout({ children }) {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <InventoryIcon sx={{ mr: 1.5 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5 }}
          >
            GreenSupply Co
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {NAV_LINKS.map(({ label, href }) => {
              // Highlight the active route so managers always know where they are.
              const isActive =
                href === '/'
                  ? router.pathname === '/'
                  : router.pathname.startsWith(href);
              return (
                <Button
                  key={href}
                  color="inherit"
                  component={Link}
                  href={href}
                  sx={{
                    fontWeight: isActive ? 700 : 400,
                    borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                    borderRadius: 0,
                    px: 1.5,
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: { xs: 2, sm: 3 } }}>
        {children}
      </Box>
    </Box>
  );
}
