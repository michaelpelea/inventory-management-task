import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import InventoryIcon from '@mui/icons-material/Inventory';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_LINKS = [
  { label: 'Dashboard',  href: '/' },
  { label: 'Products',   href: '/products' },
  { label: 'Warehouses', href: '/warehouses' },
  { label: 'Stock',      href: '/stock' },
  { label: 'Transfers',  href: '/transfers' },
  { label: 'Alerts',     href: '/alerts' },
];

// Shared layout wrapper used by every page.
// Centralises the AppBar and navigation so adding/removing links
// only requires a change here, not in every page file.
export default function Layout({ children }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

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

          {/* Desktop nav — hidden on mobile */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Button
                key={href}
                color="inherit"
                component={Link}
                href={href}
                sx={{
                  fontWeight: isActive(href) ? 700 : 400,
                  borderBottom: isActive(href) ? '2px solid white' : '2px solid transparent',
                  borderRadius: 0,
                  px: 1.5,
                }}
              >
                {label}
              </Button>
            ))}
          </Box>

          {/* Hamburger button — shown on mobile only */}
          <IconButton
            color="inherit"
            edge="end"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'flex', md: 'none' } }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile slide-out drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 220, pt: 1 }} role="navigation">
          <List>
            {NAV_LINKS.map(({ label, href }) => (
              <ListItem key={href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  selected={isActive(href)}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
                >
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontWeight: isActive(href) ? 700 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ p: { xs: 2, sm: 3 } }}>
        {children}
      </Box>
    </Box>
  );
}
