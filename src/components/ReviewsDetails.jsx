import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../config';
import * as flags from 'country-flag-icons/react/3x2';
import CenteredLoader from './CenteredLoader';
import { useDataCache } from '../hooks/useDataCache';
import { normalizeCountryCode, isValidCountryCode } from '../utils/countryUtils';
import DailyReviewsChart from './DailyReviewsChart';
import SentimentAnalysis from './SentimentAnalysis';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Download, ArrowBack, Language, DateRange } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';

// Set Luxon's default locale to French
DateTime.local().setLocale('fr');

const fetchedReviews = {};

function ReviewsDetails() {
  const { getCachedData, setCachedData } = useDataCache();
  const { id, store } = useParams();
  const [sentimentData, setSentimentData] = useState(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [sentimentError, setSentimentError] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Prevent initial scroll
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle date changes with proper validation
  const handleStartDateChange = (newDate) => {
    if (newDate && !newDate.isValid) return;
    setStartDate(newDate);
  };

  const handleEndDateChange = (newDate) => {
    if (newDate && !newDate.isValid) return;
    setEndDate(newDate);
  };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const selectedCountry = normalizeCountryCode(searchParams.get('country') || 'US');
  const selectedLang = searchParams.get('lang') || 'en';

  // Calculate available date range and filtered reviews
  const { dateRange, filteredReviews } = useMemo(() => {
    if (!reviews.length) return { dateRange: { min: null, max: null }, filteredReviews: [] };
    
    const dates = reviews.map(review => DateTime.fromISO(review.updated));
    const range = {
      min: DateTime.min(...dates),
      max: DateTime.max(...dates)
    };

    // Filter reviews by date range if dates are selected
    const filtered = startDate && endDate
      ? reviews.filter(review => {
          const reviewDate = DateTime.fromISO(review.updated);
          return reviewDate >= startDate.startOf('day') && reviewDate <= endDate.endOf('day');
        })
      : reviews;

    return { dateRange: range, filteredReviews: filtered };
  }, [reviews, startDate, endDate]);

  // Initialize date range when reviews are loaded and no dates are set
  useEffect(() => {
    if (dateRange.min && dateRange.max && !startDate && !endDate) {
      // Only set initial date range if no dates are selected
      setStartDate(dateRange.min.startOf('day'));
      setEndDate(dateRange.max.endOf('day'));
    }
  }, [dateRange, startDate, endDate]); // Include startDate and endDate in dependencies

  // Fetch sentiment analysis
  useEffect(() => {
    const fetchSentiment = async () => {
      // Reset states at the start
      setSentimentData(null);
      setSentimentError(null);
      setLoadingSentiment(true);

      if (!reviews.length || !startDate || !endDate) {
        setLoadingSentiment(false);
        return;
      }
      
      // Format dates as ISO strings for the backend
      const params = {
        lang: selectedLang,
        country: selectedCountry,
        startDate: startDate?.toUTC().toISO(),  // Convert to UTC ISO string
        endDate: endDate?.toUTC().endOf('day').toISO()  // End of day in UTC
      };

      // Create URL with date range parameters
      const url = new URL(buildApiUrl(`/reviews/${store}/${id}/sentiment`));
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });



      // Create a cache key that includes the date range and store
      const cacheKey = `/reviews/${store}/${id}/sentiment/${startDate?.toISODate()}_${endDate?.toISODate()}`;
      const cached = getCachedData(cacheKey, params);
      if (cached) {
        setSentimentData(cached.data);
        setLoadingSentiment(false);
        return;
      }
      
      try {
        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error('Failed to fetch sentiment analysis');
        }

        const data = await response.json();
        // Parse the response if it's a string
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        setSentimentData(parsedData);
        // Cache the parsed data with date range in key
        setCachedData(cacheKey, params, parsedData);
      } catch (error) {

        setSentimentError(error.message);
      } finally {
        setLoadingSentiment(false);
      }
    };

    if (reviews.length > 0) {
      fetchSentiment();
    }
  }, [id, store, selectedLang, selectedCountry, reviews, getCachedData, setCachedData, startDate, endDate]);



  // Reset states when country or language changes
  useEffect(() => {
    setSentimentData(null);
    setSentimentError(null);
    setLoadingSentiment(false); // Start as false since we don't have reviews yet
    setLoading(true); // Indicate we're loading new data
    setStartDate(null); // Reset date range when country/language changes
    setEndDate(null);
  }, [selectedCountry, selectedLang]);

  // Fetch app details to get available countries
  useEffect(() => {
    const fetchAppDetails = async () => {
      const params = { lang: selectedLang, country: selectedCountry };
      const cached = getCachedData(`/app/${id}`, params);

      if (cached) {
        setAvailableCountries(cached.data.availableCountries || []);
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/app/${store}/${id}`, params));
        if (!response.ok) {
          throw new Error('Failed to fetch app details');
        }
        const data = await response.json();
        setAvailableCountries(data.availableCountries || []);
        setCachedData(`/app/${id}`, params, data);
      } catch (error) {

        setError(error.message);
      }
    };

    fetchAppDetails();
  }, [id, store, selectedLang, selectedCountry]);

  // Fetch reviews (up to 1000)
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      
      const params = {
        lang: selectedLang,
        country: selectedCountry,
        limit: 550
      };
      
      // Check cache first
      const cacheKey = `/reviews/${store}/${id}/all`;
      const cached = getCachedData(cacheKey, params);
      if (cached) {
        setReviews(cached.data);
        setTotalReviews(cached.data.length);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/reviews/${store}/${id}`, params));

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reviews');
        }

        const data = await response.json();
        console.log('Fetched data:', data);
        if (data) {
          setReviews(data);
          setTotalReviews(data.length);
          setCachedData(cacheKey, params, data);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();

    // Cleanup function to handle unmounting
    return () => {
      setReviews([]);
      setTotalReviews(0);
      setError(null);
    };
  }, [id, store, selectedLang, selectedCountry, getCachedData, setCachedData]);

  const handleDownloadReviews = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/reviews/${store}/${id}/csv`, {
          lang: selectedLang,
          country: selectedCountry
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to download reviews: ${response.statusText}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename=([^;]+)/);
      const filename = filenameMatch ? filenameMatch[1] : `reviews-${id}.csv`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading reviews:', error);
      setError(error.message);
    }
  };

  const handleCountryChange = (country) => {
    // Reset states before changing country
    setReviews([]);
    setSentimentData(null);
    setTotalReviews(0);
    setError(null);
    setLoading(true);
    setSentimentError(null);
    
    // Update URL with new country and prevent scroll
    const params = new URLSearchParams(searchParams);
    params.set('country', country);
    navigate(`/app/${store}/${id}/reviews?${params.toString()}`, { 
      preventScrollReset: true,
      replace: true // Replace instead of push to prevent scroll issues
    });
  };

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={4}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate(`/app/${store}/${id}`)}>
          Return to App Details
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => {
          const params = new URLSearchParams();
          params.set('country', selectedCountry);
          params.set('lang', selectedLang);
          navigate(`/app/${store}/${id}?${params.toString()}`, { 
            preventScrollReset: true,
            replace: true // Replace instead of push to prevent scroll issues
          });
        }}
        sx={{ mb: 2 }}
      >
        Back to App Details
      </Button>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={3}>
          <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Reviews Analysis
              </Typography>
              <Typography variant="body1" gutterBottom>
                Reviews: {filteredReviews.length} {startDate && endDate && filteredReviews.length !== reviews.length && `(filtered from ${reviews.length})`}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleDownloadReviews}
                fullWidth
                sx={{ mt: 2 }}
              >
                Download Reviews as CSV
              </Button>
            </Paper>

            {/* Available Countries - iOS only */}
            {store === 'appstore' && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Available Countries
                </Typography>
                <List dense>
                  {availableCountries.map((country) => {
                    const FlagIcon = flags[country.code];
                    return (
                      <ListItem
                        key={country.code}
                        button
                        selected={country.code === selectedCountry}
                        onClick={() => handleCountryChange(country.code)}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {FlagIcon ? (
                            <FlagIcon title={country.name} width={24} />
                          ) : (
                            <Language fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText primary={country.name} secondary={country.code} />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={9}>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                <DateRange sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Sentiment Analysis Period
              </Typography>
              <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="fr">
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    minDate={dateRange.min}
                    maxDate={endDate || dateRange.max}
                    disabled={!dateRange.min}
                    slotProps={{
                      textField: {
                        size: 'small',
                        helperText: dateRange.min ? null : 'No reviews available'
                      }
                    }}
                    format="dd/MM/yyyy"
                    closeOnSelect={false}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    minDate={startDate || dateRange.min}
                    maxDate={dateRange.max}
                    disabled={!dateRange.max}
                    slotProps={{
                      textField: {
                        size: 'small',
                        helperText: dateRange.max ? null : 'No reviews available'
                      }
                    }}
                    format="dd/MM/yyyy"
                    closeOnSelect={false}
                  />
                </Box>
              </LocalizationProvider>
            </Box>
            <SentimentAnalysis
              data={sentimentData}
              loading={loadingSentiment}
              error={sentimentError}
            />
          </Paper>
          <DailyReviewsChart reviews={reviews} />
          <Paper variant="outlined" sx={{ p: 2 }}>
            {loading ? (
              <CenteredLoader />
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Latest Reviews
                </Typography>
                {reviews.map((review, index) => (
                  <React.Fragment key={review.id || index}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Box display="flex" alignItems="center">
                        <Rating 
                          value={review.rating != null ? Number(review.rating) : review.score != null ? Number(review.score) : 0}
                          readOnly 
                          size="small"
                        />
                        <Typography variant="subtitle2" sx={{ ml: 1 }}>
                          {review.title || ''}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {review.userName} - Version {review.version} - {(review.updated ? new Date(review.updated) : new Date(review.date)).toLocaleDateString()} {(review.updated ? new Date(review.updated) : new Date(review.date)).toLocaleTimeString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {review.text}
                        </Typography>
                      </Box>
                    </Box>
                  </React.Fragment>
                ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ReviewsDetails;
