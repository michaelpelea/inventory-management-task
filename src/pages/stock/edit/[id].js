import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import Layout from '@/components/Layout';
import api from '@/lib/api';

export default function EditStock() {
  const [stock, setStock] = useState({
    productId: '',
    warehouseId: '',
    quantity: '',
  });
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      Promise.all([
        api.get(`/api/stock/${id}`),
        api.get('/api/products'),
        api.get('/api/warehouses'),
      ]).then(([stockRes, productsRes, warehousesRes]) => {
        setStock(stockRes.data);
        setProducts(productsRes.data);
        setWarehouses(warehousesRes.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    setStock({ ...stock, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/api/stock/${id}`, {
        productId:   parseInt(stock.productId),
        warehouseId: parseInt(stock.warehouseId),
        quantity:    parseInt(stock.quantity),
      });
      router.push('/stock');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            Edit Stock Record
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              select
              label="Product"
              name="productId"
              value={stock.productId}
              onChange={handleChange}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="normal"
              required
              fullWidth
              select
              label="Warehouse"
              name="warehouseId"
              value={stock.warehouseId}
              onChange={handleChange}
            >
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Quantity"
              name="quantity"
              type="number"
              inputProps={{ min: '0' }}
              value={stock.quantity}
              onChange={handleChange}
            />
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Update Stock'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                href="/stock"
                disabled={submitting}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={6000}
        onClose={() => setErrorMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
