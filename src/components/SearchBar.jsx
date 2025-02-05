import React, { useState, useEffect } from 'react';
import CenteredLoader from './CenteredLoader';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Avatar,
  Stack,
} from '@mui/material';
import CountrySelector from './CountrySelector';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';

function SearchBar({ country, onCountryChange }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setOptions([]);
      return undefined;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const url = buildApiUrl('/search', {
          term: inputValue,
          lang: 'en',
          country: country
        });
        const response = await fetch(url);
        const data = await response.json();
        if (active) {
          setOptions(data);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchData, 300);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [inputValue]);

  return (
    <Stack 
      direction="row" 
      spacing={2} 
      alignItems="center" 
      sx={{ 
        width: '100%',
        maxWidth: '70%',
        mx: 'auto',
        mb: 6
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Autocomplete
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
            },
            '&.Mui-focused': {
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
            }
          }
        }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => option.title}
      options={options}
      loading={loading}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(event, newValue) => {
        if (newValue) {
          navigate(`/app/${newValue.id}?lang=en&country=${country}`);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search App Store"
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CenteredLoader size="small" /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
          <Avatar 
            src={option.icon} 
            variant="rounded" 
            sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: 2, 
              bgcolor: 'background.paper', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              mr: 2
            }} 
          />
          {option.title}
        </Box>
      )}
    />
      </Box>
      <CountrySelector
        value={country}
        onChange={onCountryChange}
      />
    </Stack>
  );
}

export default SearchBar;
