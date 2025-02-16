import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import AndroidIcon from '@mui/icons-material/Android';

function StoreSelector({ selectedStore, onStoreChange }) {
  return (
    <ToggleButtonGroup
      value={selectedStore}
      exclusive
      onChange={(e, newStore) => {
        if (newStore !== null) {
          onStoreChange(newStore);
        }
      }}
      aria-label="store platform"
      sx={{
        gap: 2,
        '& .MuiToggleButton-root': {
          px: 3,
          py: 1,
          borderRadius: '20px !important',
          '&.Mui-selected': {
            color: 'white',
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          },
        },
      }}
    >
      <ToggleButton value="appstore" aria-label="App Store">
        <AppleIcon sx={{ mr: 1 }} /> App Store
      </ToggleButton>
      <ToggleButton value="playstore" aria-label="Play Store">
        <AndroidIcon sx={{ mr: 1 }} /> Play Store
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default StoreSelector;
