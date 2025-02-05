import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Container, Box, ThemeProvider, CssBaseline, Typography, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { createAppTheme } from './theme';
import SearchBar from './components/SearchBar';
import AppDetails from './components/AppDetails';

import AppCollections from './components/AppCollections';
import ReviewsDetails from './components/ReviewsDetails';
import ErrorBoundary from './components/ErrorBoundary';
import CategoryChips from './components/CategoryChips';
import { countries } from './components/CountrySelector';

function HomePage({ country, onCountryChange }) {
  return (
    <Box sx={{ my: 4 }}>
      <SearchBar country={country} onCountryChange={onCountryChange} />
      <CategoryChips country={country} />
      <AppCollections country={country} />
    </Box>
  );
}

// Get country from browser locale, defaulting to US if not found
const getInitialCountry = () => {
  try {
    const browserLocale = navigator.language || navigator.userLanguage;
    const countryCode = browserLocale.split('-')[1] || browserLocale.toUpperCase();
    // Check if the country is in our supported list
    return countries[countryCode] ? countryCode : 'US';
  } catch (error) {
    return 'US';
  }
};

function App() {
  const [selectedCountry, setSelectedCountry] = useState(getInitialCountry());
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('theme-mode');
    return savedMode || 'light';
  });

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    // Update URL with new country
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('country', country);
    window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`);
  };

  // Initialize country from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const countryParam = params.get('country');
    if (countryParam) {
      setSelectedCountry(countryParam);
    }
  }, []);

  return (
    <ThemeProvider theme={createAppTheme(mode)}>
      <CssBaseline />
      <BrowserRouter>
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src="/assets/icon-low.png" alt="AppScope Logo" style={{ height: 40 }} />
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                fontSize: '1.5rem',
                background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                '&:hover': { 
                  cursor: 'pointer',
                  opacity: 0.85
                }
              }}
              onClick={() => window.location.href = '/'}
            >
              AppScope
            </Typography>
          </Box>
          <IconButton onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
        <Box sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          pt: { xs: 2, sm: 3 },
          pb: { xs: 4, sm: 6 }
        }}>
          <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 } }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage country={selectedCountry} onCountryChange={handleCountryChange} />} />
                <Route path="/app/:id" element={<AppDetails country={selectedCountry} />} />
                <Route path="/app/:id/reviews" element={<ReviewsDetails />} />
              </Routes>
            </ErrorBoundary>
          </Container>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
