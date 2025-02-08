import React from 'react';
import { Box, Container, Grid } from '@mui/material';
import { keyframes } from '@mui/system';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const Skeleton = ({ width, height, sx = {} }) => (
  <Box
    sx={{
      width,
      height,
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
      borderRadius: 1,
      background: 'linear-gradient(to right, #f6f7f8 8%, #edeef1 38%, #f6f7f8 54%)',
      backgroundSize: '1000px 100%',
      animation: `${shimmer} 2s infinite linear`,
      ...sx
    }}
  />
);

function AppDetailsShimmer() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 2, width: 100 }}>
        <Skeleton width={100} height={36} /> {/* Back button */}
      </Box>
      
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={4}>
          <Box>
            <Skeleton width={128} height={128} sx={{ mb: 2 }} /> {/* App icon */}
            <Skeleton width="80%" height={28} sx={{ mb: 1 }} /> {/* App name */}
            <Skeleton width="60%" height={20} sx={{ mb: 2 }} /> {/* Developer name */}
            <Skeleton width="100%" height={48} sx={{ mb: 2 }} /> {/* Download button */}
            <Skeleton width="100%" height={100} sx={{ mb: 2 }} /> {/* Ratings box */}
          </Box>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={8}>
          {/* Screenshots */}
          <Box sx={{ 
            mb: 4, 
            display: 'flex', 
            gap: 2,
            width: '100%',
            overflow: 'hidden' // Hide scrollbar
          }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 2,
              width: { xs: '100%', md: 'auto' } // Full width on mobile, auto on desktop
            }}>
              {[1, 2, 3].map((i) => (
                <Skeleton 
                  key={i} 
                  width={240} 
                  height={400} 
                  sx={{ 
                    flexShrink: 0,
                    width: { xs: 'calc(100vw - 48px)', md: 240 } // Responsive width
                  }} 
                />
              ))}
            </Box>
          </Box>

          {/* Description */}
          <Box sx={{ mb: 4 }}>
            <Skeleton width="40%" height={24} sx={{ mb: 2 }} /> {/* Section title */}
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height={16} sx={{ mb: 1 }} />
            ))}
          </Box>

          {/* Information */}
          <Box sx={{ mb: 4 }}>
            <Skeleton width="40%" height={24} sx={{ mb: 2 }} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="70%" height={20} sx={{ mb: 1 }} />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AppDetailsShimmer;
