import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Container, Box, ThemeProvider, CssBaseline, Typography, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { createAppTheme } from './theme';
import SearchBar from './components/SearchBar';
import AppDetails from './components/AppDetails';
import StoreSelector from './components/StoreSelector';

import AppCollections from './components/AppCollections';
import ReviewsDetails from './components/ReviewsDetails';
import ErrorBoundary from './components/ErrorBoundary';
import CategoryChips from './components/CategoryChips';
import { countries } from './components/CountrySelector';

function HomePage({ country, onCountryChange }) {
  const [selectedStore, setSelectedStore] = useState('appstore');
  return (
    <Box sx={{ mb: 4 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          mb: 8
        }}
      >
        <img 
          src="/assets/icon.png" 
          alt="AppScope Logo" 
          style={{ 
            height: 160,
            marginBottom: '2rem',
            filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))'
          }} 
        />
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 3,
            fontSize: { xs: '3rem', sm: '4.5rem' }
          }}
        >
          AppScope
        </Typography>
      </Box>
      <Box mb={4}>
        <SearchBar country={country} onCountryChange={onCountryChange} selectedStore={selectedStore} />
      </Box>
      <Box display="flex" justifyContent="center" mb={2}>
        <StoreSelector selectedStore={selectedStore} onStoreChange={setSelectedStore} />
      </Box>
      <CategoryChips country={country} selectedStore={selectedStore} />
      <AppCollections country={country} selectedStore={selectedStore} />
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

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

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
      <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: !isHome ? 1 : 0,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {!isHome ? (
              <Link 
                to="/" 
                style={{ 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
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
                      opacity: 0.85
                    }
                  }}
                >
                  AppScope
                </Typography>
              </Link>
            ) : (
              <div /> /* Empty div to maintain spacing when logo is hidden */
            )}
            <IconButton 
              onClick={toggleColorMode} 
              color="inherit"
              sx={{ ml: 'auto' }}
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>

        </Box>
        <Box sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          pt: isHome ? { xs: 2, sm: 3 } : 0,
          pb: { xs: 4, sm: 6 }
        }}>
          <Container maxWidth="lg" sx={{ mt: isHome ? { xs: 2, sm: 4 } : 0 }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage country={selectedCountry} onCountryChange={handleCountryChange} />} />
                <Route path="/app/:store/:id" element={<AppDetails country={selectedCountry} />} />
                <Route path="/app/:store/:id/reviews" element={<ReviewsDetails />} />
              </Routes>
            </ErrorBoundary>
          </Container>
        </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
