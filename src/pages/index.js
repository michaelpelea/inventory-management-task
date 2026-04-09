import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  Skeleton,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import Layout from '@/components/Layout';
import api from '@/lib/api';

// Eco-themed chart palette — matches theme.js green tokens + status colors
const CHART_COLORS = ['#2E7D32', '#1976D2', '#F57C00', '#8D6E63', '#388E3C'];

// Status chip config — maps alert severity to MUI Chip props
const SEVERITY_CHIP = {
  critical:    { label: 'Critical',    color: 'error' },
  low:         { label: 'Low Stock',   color: 'warning' },
  adequate:    { label: 'In Stock',    color: 'success' },
  overstocked: { label: 'Overstocked', color: 'info' },
};

// Left border color for problem rows in the inventory table
const ROW_BORDER = {
  critical:    '#D32F2F',
  low:         '#F57C00',
  adequate:    'transparent',
  overstocked: 'transparent',
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [products, setProducts]       = useState([]);
  const [warehouses, setWarehouses]   = useState([]);
  const [stock, setStock]             = useState([]);
  const [alerts, setAlerts]           = useState([]);
  const [transfers, setTransfers]     = useState([]);
  const [search, setSearch]           = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/api/products'),
      api.get('/api/warehouses'),
      api.get('/api/stock'),
      api.get('/api/alerts'),
      api.get('/api/transfers'),
    ])
      .then(([prodRes, whRes, stockRes, alertRes, xferRes]) => {
        setProducts(prodRes.data);
        setWarehouses(whRes.data);
        setStock(stockRes.data);
        setAlerts(alertRes.data);
        setTransfers(xferRes.data);
      })
      .catch(() => setError('Unable to load dashboard data. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived values ────────────────────────────────────────────────────────

  const criticalCount   = alerts.filter(a => a.severity === 'critical').length;
  const lowCount        = alerts.filter(a => a.severity === 'low').length;
  const attentionCount  = criticalCount + lowCount;

  const totalValue = stock.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unitCost * item.quantity : 0);
  }, 0);

  // Chart data: sum stock per category
  const categoryChartData = products.reduce((acc, product) => {
    const qty = stock
      .filter(s => s.productId === product.id)
      .reduce((s, r) => s + r.quantity, 0);
    const entry = acc.find(e => e.name === product.category);
    if (entry) entry.value += qty;
    else acc.push({ name: product.category, value: qty });
    return acc;
  }, []);

  // Chart data: sum stock per warehouse, use city (short) as label
  const warehouseChartData = warehouses.map(wh => ({
    // Show city only to keep the bar chart y-axis readable on narrow screens
    name: wh.location.split(',')[0],
    fullName: wh.name,
    units: stock
      .filter(s => s.warehouseId === wh.id)
      .reduce((sum, s) => sum + s.quantity, 0),
  }));

  // 5 most recent transfers, names resolved from loaded data
  const recentTransfers = transfers.slice(0, 5).map(t => ({
    ...t,
    productName: products.find(p => p.id === t.productId)?.name   || `Product #${t.productId}`,
    sourceName:  warehouses.find(w => w.id === t.sourceWarehouseId)?.location.split(',')[0]      || `Wh #${t.sourceWarehouseId}`,
    destName:    warehouses.find(w => w.id === t.destinationWarehouseId)?.location.split(',')[0] || `Wh #${t.destinationWarehouseId}`,
  }));

  // Inventory overview: add severity from alerts for status chips + row highlighting
  const alertSeverity = (productId) =>
    alerts.find(a => a.productId === productId)?.severity || 'adequate';

  const inventoryRows = products
    .map(product => {
      const totalQuantity = stock
        .filter(s => s.productId === product.id)
        .reduce((sum, s) => sum + s.quantity, 0);
      return { ...product, totalQuantity, severity: alertSeverity(product.id) };
    })
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    });

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Layout>
        <Container sx={{ mt: 4 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={loadData}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Dashboard
        </Typography>

        {/* ── Metric cards ───────────────────────────────────────────────── */}
        {/* Mobile: 2-up (xs=6), then full-width for value card.
            Desktop: all 4 side-by-side (lg=3).
            Alert card is always first — drives immediate action. */}
        <Grid container spacing={2} sx={{ mb: 3 }}>

          {/* Stock Alerts — colored background, links to /alerts */}
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rounded" height={130} /> : (
              <Card
                component={Link}
                href="/alerts"
                sx={{
                  height: '100%',
                  textDecoration: 'none',
                  display: 'block',
                  bgcolor: criticalCount > 0
                    ? 'error.main'
                    : attentionCount > 0
                      ? 'warning.main'
                      : 'success.main',
                  color: 'white',
                  '&:hover': { opacity: 0.9, cursor: 'pointer' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {attentionCount > 0
                      ? <WarningAmberIcon fontSize="small" />
                      : <CheckCircleIcon fontSize="small" />}
                    <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9 }}>
                      Stock Alerts
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                    {attentionCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                    {attentionCount === 0
                      ? 'All stock healthy'
                      : `${criticalCount} critical · ${lowCount} low`}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Inventory Value */}
          <Grid item xs={12} sm={6} lg={3}>
            {loading ? <Skeleton variant="rounded" height={130} /> : (
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <InventoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Inventory Value
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Across all warehouses
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Products */}
          <Grid item xs={6} lg={3}>
            {loading ? <Skeleton variant="rounded" height={130} /> : (
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CategoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Products
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                    {products.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    SKUs in catalog
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Warehouses */}
          <Grid item xs={6} lg={3}>
            {loading ? <Skeleton variant="rounded" height={130} /> : (
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <WarehouseIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Warehouses
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                    {warehouses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Active locations
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        {/* Mobile: stacked full-width. Desktop: side-by-side (md=6). */}
        <Grid container spacing={2} sx={{ mb: 3 }}>

          {/* Donut chart — stock by category */}
          <Grid item xs={12} md={6}>
            {loading ? <Skeleton variant="rounded" height={320} /> : (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Stock by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                        isAnimationActive={false}
                      >
                        {categoryChartData.map((entry, i) => (
                          <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [value.toLocaleString() + ' units', 'Stock']}
                      />
                      <Legend iconType="circle" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Horizontal bar chart — stock per warehouse */}
          <Grid item xs={12} md={6}>
            {loading ? <Skeleton variant="rounded" height={320} /> : (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Stock by Warehouse
                  </Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={warehouseChartData}
                      layout="vertical"
                      margin={{ left: 4, right: 20, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => v.toLocaleString()}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 13 }}
                      />
                      <RechartsTooltip
                        formatter={(value, _name, props) => [
                          value.toLocaleString() + ' units',
                          props.payload.fullName,
                        ]}
                      />
                      <Bar dataKey="units" fill="#2E7D32" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* ── Recent Transfers ───────────────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Recent Transfers
              </Typography>
              <Button component={Link} href="/transfers" size="small">
                View All →
              </Button>
            </Box>

            {loading ? (
              <Box>
                {[0, 1, 2].map(i => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}
              </Box>
            ) : recentTransfers.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No transfers yet.{' '}
                <Link href="/transfers" style={{ color: 'inherit' }}>
                  Create the first transfer →
                </Link>
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <strong>Route</strong>
                      </TableCell>
                      <TableCell align="right"><strong>Qty</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTransfers.map(t => (
                      <TableRow key={t.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{t.productName}</TableCell>
                        <TableCell
                          sx={{
                            color: 'text.secondary',
                            fontSize: '0.82rem',
                            display: { xs: 'none', sm: 'table-cell' },
                          }}
                        >
                          {t.sourceName} → {t.destName}
                        </TableCell>
                        <TableCell align="right">
                          <strong>{t.quantity.toLocaleString()}</strong>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Inventory Overview ─────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Inventory Overview
          </Typography>
          <TextField
            size="small"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220 }}
          />
        </Box>

        {loading ? (
          <Skeleton variant="rounded" height={240} />
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            {/* Tighter cell padding on mobile so all 3 visible columns fit without scrolling */}
            <Table sx={{ minWidth: 300, '& .MuiTableCell-root': { px: { xs: 1, sm: 2 } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>SKU</strong></TableCell>
                  <TableCell><strong>Product Name</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <strong>Category</strong>
                  </TableCell>
                  <TableCell align="right"><strong>Stock / Reorder</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No products match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryRows.map(item => {
                    const chip = SEVERITY_CHIP[item.severity] || SEVERITY_CHIP.adequate;
                    return (
                      <TableRow
                        key={item.id}
                        sx={{
                          // Colored left border signals problem rows at a glance
                          borderLeft: `4px solid ${ROW_BORDER[item.severity] || 'transparent'}`,
                        }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', display: { xs: 'none', sm: 'table-cell' } }}>
                          {item.sku}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {item.category}
                        </TableCell>
                        <TableCell align="right">
                          <strong>{item.totalQuantity.toLocaleString()}</strong>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {' '}/ {item.reorderPoint.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={chip.label} color={chip.color} size="small" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Layout>
  );
}
