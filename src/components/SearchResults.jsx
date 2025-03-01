import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Rating, 
  Pagination, 
  Chip,
  CircularProgress,
  Container,
  Stack,
  Button
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAppStore, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import SearchBar from './SearchBar';
import { buildApiUrl } from '../config';
import CenteredLoader from './CenteredLoader';

const ITEMS_PER_PAGE = 10;

function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchState = location.state?.searchState;
  
  // Use search state from navigation or URL params
  const queryParams = new URLSearchParams(location.search);
  const searchTerm = searchState?.term || queryParams.get('term') || '';
  const country = searchState?.country || queryParams.get('country') || 'US';
  const lang = searchState?.lang || queryParams.get('lang') || 'en';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appStorePage, setAppStorePage] = useState(searchState?.appStorePage || 1);
  const [playStorePage, setPlayStorePage] = useState(searchState?.playStorePage || 1);
  
  // Update URL if coming from search state
  useEffect(() => {
    if (searchState) {
      const params = new URLSearchParams();
      params.set('term', searchState.term);
      params.set('country', searchState.country);
      params.set('lang', searchState.lang);
      navigate(`/search?${params.toString()}`, { replace: true, state: null });
    }
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchTerm) {
        setResults({ appStore: [], playStore: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const url = buildApiUrl('/search', {
          term: searchTerm,
          lang,
          country
        });
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error fetching search results: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        // Check if data is an array (old format) or object with store properties (new format)
        if (!data) {
          setResults([]);
        } else if (Array.isArray(data)) {
          setResults(data);
        } else if (data.appStore || data.playStore) {
          // Handle object format with store properties
          const combinedResults = [
            ...(data.appStore || []),
            ...(data.playStore || [])
          ];
          setResults(combinedResults);
        } else {
          // Unexpected format
          console.error('Unexpected data format:', data);
          setResults([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching search results:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchTerm, country, lang]);

  const handlePageChange = (type) => (_, value) => {
    if (type === 'appstore') {
      setAppStorePage(value);
    } else {
      setPlayStorePage(value);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAppClick = (app) => {
    // Create search state object with current search parameters
    const searchState = {
      term: searchTerm,
      country,
      lang,
      appStorePage,
      playStorePage
    };
    
    navigate(
      `/app/${app.store}/${app.id}?lang=${lang}&country=${country}`,
      { state: { searchState } }
    );
  };

  // Split results by store
  const appStoreResults = Array.isArray(results) ? 
    results.filter(app => app.store === 'appstore') : 
    (results.appStore || []);

  const playStoreResults = Array.isArray(results) ? 
    results.filter(app => app.store === 'playstore') : 
    (results.playStore || []);

  const appStorePages = useMemo(() => Math.ceil(appStoreResults.length / ITEMS_PER_PAGE), [appStoreResults]);
  const playStorePages = useMemo(() => Math.ceil(playStoreResults.length / ITEMS_PER_PAGE), [playStoreResults]);

  const currentAppStoreItems = appStoreResults.slice(
    (appStorePage - 1) * ITEMS_PER_PAGE,
    appStorePage * ITEMS_PER_PAGE
  );

  const currentPlayStoreItems = playStoreResults.slice(
    (playStorePage - 1) * ITEMS_PER_PAGE,
    playStorePage * ITEMS_PER_PAGE
  );

  const renderAppCard = (app) => (
    <Card
      key={`${app.store}-${app.id}`}
      sx={{
        display: 'flex',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
      onClick={() => handleAppClick(app)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', width: '100%' }}>
        <CardMedia
          component="img"
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            mr: 2,
            flexShrink: 0
          }}
          image={app.icon}
          alt={app.title}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Typography variant="subtitle1" component="div" noWrap>
            {app.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {app.developer}
          </Typography>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <SearchBar 
          country={country} 
          onCountryChange={(newCountry) => {
            navigate(`/search?term=${searchTerm}&country=${newCountry}&lang=${lang}`);
          }}
          initialSearchTerm={searchTerm}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
          {appStoreResults.length + playStoreResults.length} apps found ({appStoreResults.length} App Store, {playStoreResults.length} Play Store)
        </Typography>
      </Box>

      {loading ? (
        <CenteredLoader />
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Box>
      ) : appStoreResults.length === 0 && playStoreResults.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">
            No results found for "{searchTerm}"
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Try a different search term or country
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* App Store Column */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faAppStore} style={{ marginRight: '8px' }} />
                App Store Results
              </Typography>
            </Box>
            <Stack spacing={2}>
              {currentAppStoreItems.map(renderAppCard)}
            </Stack>
            {appStorePages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={appStorePages}
                  page={appStorePage}
                  onChange={handlePageChange('appstore')}
                  color="primary"
                  size="medium"
                />
              </Box>
            )}
          </Grid>

          {/* Play Store Column */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faGooglePlay} style={{ marginRight: '8px' }} />
                Play Store Results
              </Typography>
            </Box>
            <Stack spacing={2}>
              {currentPlayStoreItems.map(renderAppCard)}
            </Stack>
            {playStorePages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={playStorePages}
                  page={playStorePage}
                  onChange={handlePageChange('playstore')}
                  color="primary"
                  size="medium"
                />
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default SearchResults;
