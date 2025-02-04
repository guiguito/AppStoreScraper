import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../config';
import * as flags from 'country-flag-icons/react/3x2';
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
import { Download, ArrowBack, Language } from '@mui/icons-material';

function ReviewsDetails() {
  const [sentimentData, setSentimentData] = useState(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [sentimentError, setSentimentError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const selectedCountry = normalizeCountryCode(searchParams.get('country') || 'US');
  const selectedLang = searchParams.get('lang') || 'en';

  // Fetch sentiment analysis
  useEffect(() => {
    // Reset sentiment data when country changes
    setSentimentData(null);
    setSentimentError(null);
    setLoadingSentiment(false);

    const fetchSentiment = async () => {
      if (!reviews.length || loadingSentiment) return;
      
      setLoadingSentiment(true);
      setSentimentError(null);
      
      try {
        const response = await fetch(
          buildApiUrl(`/reviews/${id}/sentiment`, {
            lang: selectedLang,
            country: selectedCountry,
          })
        );

        if (!response.ok) {
          throw new Error('Failed to fetch sentiment analysis');
        }

        const data = await response.json();
        // Parse the response if it's a string
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        setSentimentData(parsedData);
      } catch (error) {
        console.error('Error fetching sentiment:', error);
        setSentimentError(error.message);
      } finally {
        setLoadingSentiment(false);
      }
    };

    fetchSentiment();
  }, [id, selectedLang, selectedCountry, reviews]);

  // Fetch app details to get available countries
  useEffect(() => {
    const fetchAppDetails = async () => {
      try {
        const response = await fetch(buildApiUrl(`/app/${id}`, { lang: selectedLang, country: selectedCountry }));
        if (!response.ok) {
          throw new Error('Failed to fetch app details');
        }
        const data = await response.json();
        setAvailableCountries(data.availableCountries || []);
      } catch (error) {
        console.error('Error fetching app details:', error);
        setError(error.message);
      }
    };

    fetchAppDetails();
  }, [id, selectedLang, selectedCountry]);

  // Fetch reviews (up to 1000)
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          buildApiUrl(`/reviews/${id}/all`, {
            lang: selectedLang,
            country: selectedCountry,
            limit: 1000
          })
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reviews');
        }

        const data = await response.json();
        if (data && data.reviews) {
          setReviews(data.reviews);
          setTotalReviews(data.total);
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
  }, [id, selectedLang, selectedCountry]);

  const handleDownloadReviews = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/reviews/${id}/csv`, {
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
    // Reset sentiment data when country changes
    setSentimentData(null);
    setSentimentError(null);
    setLoadingSentiment(false);

    const params = new URLSearchParams(searchParams);
    params.set('country', country);
    navigate(`/app/${id}/reviews?${params.toString()}`);
  };

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={4}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate(`/app/${id}`)}>
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
          navigate(`/app/${id}?${params.toString()}`);
        }}
        sx={{ mb: 2 }}
      >
        Back to App Details
      </Button>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={3}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Reviews Analysis
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total Reviews Fetched: {totalReviews}
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
          </Box>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={9}>
          <SentimentAnalysis
            data={sentimentData}
            loading={loadingSentiment}
            error={sentimentError}
          />
          <DailyReviewsChart reviews={reviews} />
          <Paper variant="outlined" sx={{ p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Latest Reviews
                </Typography>
                {reviews.map((review, index) => (
                  <React.Fragment key={review.id || index}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Rating value={review.score || review.rating} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {new Date(review.updated).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2">{review.title}</Typography>
                      <Typography variant="body2" paragraph>
                        {review.text || review.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Version: {review.version}
                      </Typography>
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
