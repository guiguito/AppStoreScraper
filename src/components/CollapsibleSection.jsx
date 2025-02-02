import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

function CollapsibleSection({ title, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ my: 3 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          borderRadius: 1,
          p: 1,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          {title}
        </Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

export default CollapsibleSection;
