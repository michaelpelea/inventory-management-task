import { useState, useEffect } from 'react';
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
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Layout from '@/components/Layout';
import api from '@/lib/api';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/products'),
      api.get('/api/warehouses'),
      api.get('/api/stock'),
      api.get('/api/alerts'),
    ]).then(([productsRes, warehousesRes, stockRes, alertsRes]) => {
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
      setStock(stockRes.data);
      setAlerts(alertsRes.data);
    });
  }, []);

  // Items that need the manager's attention
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const lowCount = alerts.filter(a => a.severity === 'low').length;
  const attentionCount = criticalCount + lowCount;

  // Calculate total inventory value
  const totalValue = stock.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unitCost * item.quantity : 0);
  }, 0);

  // Get products with stock across all warehouses
  const inventoryOverview = products.map(product => {
    const productStock = stock.filter(s => s.productId === product.id);
    const totalQuantity = productStock.reduce((sum, s) => sum + s.quantity, 0);
    return {
      ...product,
      totalQuantity,
      isLowStock: totalQuantity < product.reorderPoint,
    };
  });

  return (
    <Layout>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>

        {/* Stock Alerts card — shown first because it drives immediate action */}
        <Card
          sx={{
            mb: 3,
            bgcolor: criticalCount > 0 ? 'error.main' : 'success.main',
            color: 'white',
          }}
        >
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {attentionCount > 0
                ? <WarningAmberIcon sx={{ fontSize: 36 }} />
                : <CheckCircleIcon sx={{ fontSize: 36 }} />}
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {attentionCount > 0
                    ? `${attentionCount} item${attentionCount > 1 ? 's' : ''} need attention`
                    : 'All stock healthy'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {criticalCount > 0
                    ? `${criticalCount} critical, ${lowCount} low stock`
                    : attentionCount > 0
                      ? `${lowCount} low stock`
                      : 'No critical or low stock alerts'}
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              href="/alerts"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'white' } }}
            >
              View Alerts →
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Total Products</Typography>
                </Box>
                <Typography variant="h3">{products.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarehouseIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Warehouses</Typography>
                </Box>
                <Typography variant="h3">{warehouses.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Total Inventory Value</Typography>
                </Box>
                <Typography variant="h3">${totalValue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Inventory Overview Table */}
        <Typography variant="h5" gutterBottom>
          Inventory Overview
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell align="right"><strong>Total Stock</strong></TableCell>
                <TableCell align="right"><strong>Reorder Point</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventoryOverview.map((item) => (
                <TableRow
                  key={item.id}
                  sx={{
                    backgroundColor: item.isLowStock ? '#fff3e0' : 'inherit'
                  }}
                >
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">{item.totalQuantity}</TableCell>
                  <TableCell align="right">{item.reorderPoint}</TableCell>
                  <TableCell>
                    {item.isLowStock ? (
                      <Typography color="warning.main" fontWeight="bold">
                        Low Stock
                      </Typography>
                    ) : (
                      <Typography color="success.main">
                        In Stock
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Layout>
  );
}
