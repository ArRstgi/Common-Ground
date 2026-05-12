import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

export default function PageShell({ loading, error, children }) {
  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flex: 1, p: '32px 36px', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return children;
}
