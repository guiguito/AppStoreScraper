import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const CenteredLoader = ({ size }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: size === 'full' ? '100vh' : 'auto',
      my: size === 'full' ? 0 : 4
    }}
  >
    <CircularProgress />
  </Box>
);

export default CenteredLoader;
