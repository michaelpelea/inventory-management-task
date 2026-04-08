import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Layout from '@/components/Layout';
import api from '@/lib/api';

// Severity display config — single source of truth for colors and labels
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'error' },
  low:      { label: 'Low Stock', color: 'warning' },
  adequate: { label: 'Adequate', color: 'success' },
  overstocked: { label: 'Overstocked', color: 'info' },
};

const STATUS_CONFIG = {
  active:       { label: 'Active', color: 'default' },
  acknowledged: { label: 'Acknowledged', color: 'warning' },
  resolved:     { label: 'Resolved', color: 'success' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchAlerts = useCallback(async (days) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/alerts?leadTimeDays=${days}`);
      setAlerts(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load alerts. Please refresh.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(leadTimeDays);
  }, [fetchAlerts, leadTimeDays]);

  const handleLeadTimeChange = (e) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    setLeadTimeDays(val);
  };

  const handleAction = async (alert, newStatus) => {
    try {
      await api.put(`/api/alerts/${alert.productId}`, { status: newStatus });
      // Update local state immediately so the UI reflects the change without a full reload
      setAlerts(prev =>
        prev.map(a =>
          a.productId === alert.productId ? { ...a, status: newStatus } : a
        )
      );
      const label = newStatus === 'acknowledged' ? 'acknowledged' : 'resolved';
      setSnackbar({ open: true, message: `Alert for ${alert.productName} marked as ${label}.`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update alert. Please try again.', severity: 'error' });
    }
  };

  // Summary counts for the 4 cards at the top
  const counts = alerts.reduce(
    (acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; },
    { critical: 0, low: 0, adequate: 0, overstocked: 0 }
  );

  const summaryCards = [
    { key: 'critical',    label: 'Critical',    bgColor: 'error.main' },
    { key: 'low',         label: 'Low Stock',   bgColor: 'warning.main' },
    { key: 'adequate',    label: 'Adequate',    bgColor: 'success.main' },
    { key: 'overstocked', label: 'Overstocked', bgColor: 'info.main' },
  ];

  return (
    <Layout>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h4" component="h1">
            Stock Alerts
          </Typography>
        </Box>

        {/* Summary cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {summaryCards.map(({ key, label, bgColor }) => (
            <Card key={key} sx={{ bgcolor: bgColor, color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" fontWeight={700}>
                  {counts[key]}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Lead time control */}
        <Box sx={{ mb: 3, maxWidth: 260 }}>
          <TextField
            label="Reorder Lead Time (days)"
            type="number"
            value={leadTimeDays}
            onChange={handleLeadTimeChange}
            inputProps={{ min: 1 }}
            size="small"
            helperText="Days until a new order arrives — affects recommended order quantities"
            fullWidth
          />
        </Box>

        {/* Alerts table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : alerts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              All products are adequately stocked. No action needed.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Product</strong></TableCell>
                  <TableCell><strong>SKU</strong></TableCell>
                  <TableCell align="right"><strong>Total Stock</strong></TableCell>
                  <TableCell align="right"><strong>Reorder Point</strong></TableCell>
                  <TableCell><strong>Severity</strong></TableCell>
                  <TableCell align="right"><strong>Recommended Order</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map(alert => {
                  const sev = SEVERITY_CONFIG[alert.severity];
                  const sta = STATUS_CONFIG[alert.status] || STATUS_CONFIG.active;
                  // Highlight critical rows with a subtle red left border
                  const rowSx = alert.severity === 'critical'
                    ? { borderLeft: '4px solid', borderColor: 'error.main' }
                    : {};

                  return (
                    <TableRow key={alert.productId} sx={rowSx}>
                      <TableCell>{alert.productName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{alert.sku}</TableCell>
                      <TableCell align="right"><strong>{alert.totalStock.toLocaleString()}</strong></TableCell>
                      <TableCell align="right">{alert.reorderPoint.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={sev.label} color={sev.color} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        {alert.recommendedQuantity > 0
                          ? <strong>{alert.recommendedQuantity.toLocaleString()}</strong>
                          : <span style={{ color: '#aaa' }}>—</span>}
                      </TableCell>
                      <TableCell>
                        <Chip label={sta.label} color={sta.color} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {alert.status === 'active' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => handleAction(alert, 'acknowledged')}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleAction(alert, 'resolved')}
                            >
                              Resolve
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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
