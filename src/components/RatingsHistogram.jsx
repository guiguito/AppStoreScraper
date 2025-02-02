import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

function RatingsHistogram({ histogram = {} }) {
  // Convert histogram values to numbers
  const validHistogram = {
    5: histogram['5']?.count || 0,
    4: histogram['4']?.count || 0,
    3: histogram['3']?.count || 0,
    2: histogram['2']?.count || 0,
    1: histogram['1']?.count || 0
  };

  // Calculate total from histogram
  const total = Object.values(validHistogram).reduce((sum, count) => sum + count, 0);

  return (
    <Box sx={{ width: '100%' }}>
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = validHistogram[rating];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        return (
          <Box key={rating} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
              <Typography variant="body2" sx={{ mr: 0.5 }}>
                {rating}
              </Typography>
              <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                mx: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                flex: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: rating >= 4 ? 'success.main' :
                                 rating >= 3 ? 'warning.main' : 'error.main'
                }
              }}
            />
            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
              {percentage.toFixed(1)}%
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default RatingsHistogram;
