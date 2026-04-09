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
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import Layout from '@/components/Layout';
import api from '@/lib/api';

export default function EditWarehouse() {
  const [warehouse, setWarehouse] = useState({
    name: '',
    location: '',
    code: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      api.get(`/api/warehouses/${id}`).then((res) => {
        setWarehouse(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    setWarehouse({ ...warehouse, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/api/warehouses/${id}`, warehouse);
      router.push('/warehouses');
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
            Edit Warehouse
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Warehouse Code"
              name="code"
              value={warehouse.code}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Warehouse Name"
              name="name"
              value={warehouse.name}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Location"
              name="location"
              value={warehouse.location}
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
                {submitting ? 'Saving...' : 'Update Warehouse'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                href="/warehouses"
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
