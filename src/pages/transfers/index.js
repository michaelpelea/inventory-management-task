import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { transferSchemaWithRefine } from '@/lib/schemas/transfers';
import dayjs from 'dayjs';

const EMPTY_FORM = {
  productId: '',
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  quantity: '',
  notes: '',
};

export default function Transfers() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    Promise.all([
      api.get('/api/products'),
      api.get('/api/warehouses'),
      api.get('/api/stock'),
      api.get('/api/transfers'),
    ]).then(([productsRes, warehousesRes, stockRes, transfersRes]) => {
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
      setStock(stockRes.data);
      setTransfers(transfersRes.data);
    });
  }, []);

  // Compute available quantity when both product and source warehouse are selected
  const availableQty = (() => {
    if (!form.productId || !form.sourceWarehouseId) return null;
    const record = stock.find(
      s => s.productId === Number(form.productId) && s.warehouseId === Number(form.sourceWarehouseId)
    );
    return record ? record.quantity : 0;
  })();

  // Destination options exclude the currently selected source to prevent same-to-same
  const destOptions = warehouses.filter(w => w.id !== Number(form.sourceWarehouseId));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field as they type
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    // Clear destination if source changes (to avoid stale selection)
    if (name === 'sourceWarehouseId') {
      setForm(prev => ({ ...prev, sourceWarehouseId: value, destinationWarehouseId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side Zod validation before hitting the API
    const parsed = transferSchemaWithRefine.safeParse({
      productId: Number(form.productId),
      sourceWarehouseId: Number(form.sourceWarehouseId),
      destinationWarehouseId: Number(form.destinationWarehouseId),
      quantity: Number(form.quantity),
      notes: form.notes || undefined,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const res = await api.post('/api/transfers', parsed.data);
      const newTransfer = res.data;

      // Prepend to history table (newest first)
      setTransfers(prev => [newTransfer, ...prev]);

      // Update local stock state so "Available: X" helper reflects the change immediately
      setStock(prev => {
        const updated = prev.map(s => {
          if (s.productId === parsed.data.productId && s.warehouseId === parsed.data.sourceWarehouseId) {
            return { ...s, quantity: s.quantity - parsed.data.quantity };
          }
          if (s.productId === parsed.data.productId && s.warehouseId === parsed.data.destinationWarehouseId) {
            return { ...s, quantity: s.quantity + parsed.data.quantity };
          }
          return s;
        });
        // If destination record didn't exist in local state yet, add it
        const destExists = updated.some(
          s => s.productId === parsed.data.productId && s.warehouseId === parsed.data.destinationWarehouseId
        );
        if (!destExists) {
          updated.push({
            id: Date.now(), // temporary local ID
            productId: parsed.data.productId,
            warehouseId: parsed.data.destinationWarehouseId,
            quantity: parsed.data.quantity,
          });
        }
        return updated;
      });

      // Plain-language success message
      const productName = products.find(p => p.id === parsed.data.productId)?.name || 'Product';
      const sourceName = warehouses.find(w => w.id === parsed.data.sourceWarehouseId)?.name || 'source';
      const destName = warehouses.find(w => w.id === parsed.data.destinationWarehouseId)?.name || 'destination';
      setSnackbar({
        open: true,
        message: `Transfer complete! ${parsed.data.quantity} units of ${productName} moved from ${sourceName} to ${destName}.`,
        severity: 'success',
      });

      setForm(EMPTY_FORM);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Transfer failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve product/warehouse IDs to names for the history table
  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getWarehouseName = (id) => warehouses.find(w => w.id === id)?.name || 'Unknown';

  return (
    <Layout>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Stock Transfers
        </Typography>

        {/* Transfer Form */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SwapHorizIcon color="primary" />
              <Typography variant="h6" fontWeight={600} gutterBottom>Transfer Stock Between Warehouses</Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                {/* Product */}
                <TextField
                  required
                  fullWidth
                  select
                  label="Product"
                  name="productId"
                  value={form.productId}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.productId)}
                  helperText={fieldErrors.productId?.[0] || ' '}
                >
                  {products.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </TextField>

                {/* Source Warehouse */}
                <TextField
                  required
                  fullWidth
                  select
                  label="From Warehouse"
                  name="sourceWarehouseId"
                  value={form.sourceWarehouseId}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.sourceWarehouseId)}
                  helperText={fieldErrors.sourceWarehouseId?.[0] || ' '}
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} — {w.location}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Destination Warehouse */}
                <TextField
                  required
                  fullWidth
                  select
                  label="To Warehouse"
                  name="destinationWarehouseId"
                  value={form.destinationWarehouseId}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.destinationWarehouseId)}
                  helperText={fieldErrors.destinationWarehouseId?.[0] || ' '}
                  disabled={!form.sourceWarehouseId}
                >
                  {destOptions.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} — {w.location}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                {/* Quantity — shows available stock as helper text */}
                <TextField
                  required
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: availableQty ?? undefined }}
                  error={Boolean(fieldErrors.quantity)}
                  helperText={
                    fieldErrors.quantity?.[0] ||
                    (availableQty !== null
                      ? `Available in source warehouse: ${availableQty} units`
                      : 'Select a product and source warehouse first')
                  }
                />

                {/* Notes (optional) */}
                <TextField
                  fullWidth
                  label="Notes (optional)"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  helperText="Reason for transfer, e.g. 'Restocking West Coast'"
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SwapHorizIcon />}
                  sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}
                >
                  {submitting ? 'Transferring…' : 'Transfer Stock'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Transfer History Table */}
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Transfer History
        </Typography>

        {transfers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No transfers yet. Use the form above to move stock between warehouses.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 300 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Product</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>From → To</strong></TableCell>
                  <TableCell align="right"><strong>Qty</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>Status</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Notes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {/* Short date on mobile, full timestamp on desktop */}
                      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>{dayjs(t.createdAt).format('MMM D')}</Box>
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{dayjs(t.createdAt).format('MMM D, YYYY h:mm A')}</Box>
                    </TableCell>
                    <TableCell>{getProductName(t.productId)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {getWarehouseName(t.sourceWarehouseId)}
                      {' → '}
                      {getWarehouseName(t.destinationWarehouseId)}
                    </TableCell>
                    <TableCell align="right"><strong>{t.quantity}</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label="Completed" color="success" size="small" />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>{t.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
