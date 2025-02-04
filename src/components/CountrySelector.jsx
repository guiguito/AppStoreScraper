import React from 'react';
import { Select, MenuItem, Box } from '@mui/material';
import Flag from 'react-world-flags';

// Map of countries with their codes and names
const countries = {
  'US': 'United States',
  'CN': 'China',
  'JP': 'Japan',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'CA': 'Canada',
  'KR': 'South Korea',
  'AU': 'Australia',
  'ES': 'Spain',
  'BR': 'Brazil',
  'RU': 'Russia',
  'IN': 'India',
  'MX': 'Mexico',
  'NL': 'Netherlands',
  'TR': 'Turkey',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'PL': 'Poland',
  'BE': 'Belgium',
  'TW': 'Taiwan',
  'ID': 'Indonesia',
  'SA': 'Saudi Arabia',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'AE': 'United Arab Emirates',
  'DK': 'Denmark',
  'NO': 'Norway',
  'FI': 'Finland'
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
