import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const CenteredLoader = ({ size }) => (
  <Box
    sx={{
      position: size === 'full' ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: size === 'full' ? '100vh' : '200px',
      backgroundColor: (theme) => size === 'full' ? theme.palette.background.default : 'transparent',
      zIndex: size === 'full' ? 1200 : 1
    }}
  >
    <CircularProgress size={size === 'full' ? 60 : 40} />
  </Box>
);

export default CenteredLoader;
