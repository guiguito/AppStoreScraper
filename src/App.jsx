import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Container, Box, ThemeProvider, CssBaseline, Typography } from '@mui/material';
import { theme } from './theme';
import SearchBar from './components/SearchBar';
import AppDetails from './components/AppDetails';
import AppHeader from './components/AppHeader';
import AppCollections from './components/AppCollections';

function HomePage({ country, onCountryChange }) {
  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        App Store Explorer
      </Typography>
      <SearchBar country={country} onCountryChange={onCountryChange} />
      <AppCollections country={country} />
    </Box>
  );
}

function App() {
  const [selectedCountry, setSelectedCountry] = useState('US');

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          pt: { xs: 2, sm: 3 },
          pb: { xs: 4, sm: 6 }
        }}>
          <AppHeader />
          <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 } }}>
            <Routes>
              <Route path="/" element={<HomePage country={selectedCountry} onCountryChange={handleCountryChange} />} />
              <Route path="/app/:id" element={<AppDetails country={selectedCountry} />} />
            </Routes>
          </Container>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
