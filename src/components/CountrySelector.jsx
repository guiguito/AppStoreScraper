import React from 'react';
import { Select, MenuItem, Box } from '@mui/material';
import Flag from 'react-world-flags';

// Map of countries with their codes and names
const countries = {
  US: 'United States',
  FR: 'France',
  GB: 'United Kingdom',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  AU: 'Australia',
  CA: 'Canada',
  BR: 'Brazil',
  RU: 'Russia',
  IN: 'India',
  MX: 'Mexico'
};

function CountrySelector({ value, onChange }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ 
        minWidth: 120,
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }
      }}
      size="small"
    >
      {Object.entries(countries).map(([code, name]) => (
        <MenuItem key={code} value={code} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 16, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <Flag code={code} height="16" />
          </Box>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
}

export default CountrySelector;
