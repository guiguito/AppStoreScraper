import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAppStore, faGooglePlay } from '@fortawesome/free-brands-svg-icons';

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
        <FontAwesomeIcon icon={faAppStore} style={{ marginRight: '8px' }} /> App Store
      </ToggleButton>
      <ToggleButton value="playstore" aria-label="Play Store">
        <FontAwesomeIcon icon={faGooglePlay} style={{ marginRight: '8px' }} /> Play Store
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default StoreSelector;
