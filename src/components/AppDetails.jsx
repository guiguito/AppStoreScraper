import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import ScreenshotGallery from './ScreenshotGallery';
import RatingsHistogram from './RatingsHistogram';
import Flag from 'react-world-flags';
import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Button,
  Grid,
  Box,
  Avatar,
  Rating,
  Chip,
  Divider,
  CircularProgress,
  Container,
} from '@mui/material';
import { Download, PhoneIphone, ArrowBack, Language } from '@mui/icons-material';
import CollapsibleSection from './CollapsibleSection';

function AppDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [similarApps, setSimilarApps] = useState([]);
  const [developerApps, setDeveloperApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedCountry, setSelectedCountry] = useState('US');

  // Set initial language from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    const countryParam = params.get('country');
    if (langParam) {
      setSelectedLang(langParam);
    }
    if (countryParam) {
      setSelectedCountry(countryParam);
    }
  }, []);

  // Fetch app details and similar apps
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);

      try {
        // Fetch app details, similar apps, and developer apps in parallel
        const responses = await Promise.all([
          fetch(buildApiUrl(`/app/${id}`, { lang: selectedLang, country: selectedCountry }), { signal }),
          fetch(buildApiUrl(`/similar/${id}`, { lang: selectedLang, country: selectedCountry }), { signal }),
          fetch(buildApiUrl(`/developer-apps/${id}`, { lang: selectedLang, country: selectedCountry }), { signal })
        ]);

        // Check if any response is not ok
        const errorResponse = responses.find(response => !response.ok);
        if (errorResponse) {
          const errorData = await errorResponse.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }

        // Parse all responses in parallel
        const [detailsData, similarData, developerData] = await Promise.all(
          responses.map(response => response.json())
        );

        // Only update state if not aborted
        if (!signal.aborted) {
          setDetails(detailsData);
          setSimilarApps(similarData);
          setDeveloperApps(developerData);
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error fetching data:', error);
          setError(error.message || 'Failed to load data. Please try again.');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function to abort fetch on unmount or deps change
    return () => controller.abort();
  }, [id, selectedLang, selectedCountry]);

  // Fetch reviews with pagination
  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const response = await fetch(
          buildApiUrl(`/reviews/${id}`, {
            lang: selectedLang,
            country: selectedCountry,
            page: reviewPage
          }),
          { signal }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reviews');
        }

        const reviewsData = await response.json();

        if (!signal.aborted) {
          setReviews(prevReviews => reviewPage === 1 ? reviewsData : [...prevReviews, ...reviewsData]);
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error fetching reviews:', error);
        }
      } finally {
        if (!signal.aborted) {
          setLoadingReviews(false);
        }
      }
    };

    fetchReviews();

    return () => controller.abort();
  }, [id, selectedLang, selectedCountry, reviewPage]); // Only re-run if id, selectedLang, or selectedCountry changes

  const handleDownloadReviews = () => {
    window.location.href = `/api/reviews/${id}/csv?lang=${selectedLang}&country=${selectedCountry}`;
  };

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={4}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Return to Search
        </Button>
      </Box>
    );
  }

  if (loading || !details) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Card>
        <CardContent>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ mb: 2 }}
          >
            Back to Search
          </Button>

          <Grid container spacing={3}>
            {/* Left Column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 24 }}>
                {/* App Icon and Basic Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  {details.icon && (
                    <Avatar
                      src={details.icon}
                      alt={details.title}
                      variant="rounded"
                      sx={{ width: 120, height: 120, mb: 2 }}
                    />
                  )}
                  <Typography 
                    variant="h5" 
                    align="center" 
                    gutterBottom 
                    component="a"
                    href={details.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      fontWeight: 'bold',
                      '&:hover': { color: 'primary.main' } 
                    }}
                  >
                    {details.title}
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    color="text.secondary" 
                    align="center" 
                    gutterBottom
                    component="a"
                    href={details.developerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      textDecoration: 'none', 
                      '&:hover': { color: 'primary.main' } 
                    }}
                  >
                    {details.developer}
                  </Typography>
                  {details.genres && details.genres.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 2 }}>
                      {details.genres.map((genre) => (
                        <Chip
                          key={genre}
                          label={genre}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* App Info */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Price: {details.price === 0 ? 'Free' : `$${details.price.toFixed(2)}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Version: {details.version}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Required OS Version: {details.requiredOsVersion}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Content Rating: {details.contentRating}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Released: {new Date(details.released).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Updated: {new Date(details.updated).toLocaleDateString()}
                  </Typography>
                </Paper>

                {/* Ratings */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ mr: 1 }}>
                      {details?.ratings?.average?.toFixed(1) || '0.0'}
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'warning.main' }}>
                      ★
                    </Typography>
                  </Box>
                  <Typography variant="body2" align="center" sx={{ mb: 2 }}>
                    ({details?.ratings?.total?.toLocaleString() || 0} ratings)
                  </Typography>
                  <RatingsHistogram histogram={details?.ratings?.histogram || {}} />
                </Paper>

                {/* Languages - Collapsible */}
                {details.languages && details.languages.length > 0 && (
                  <CollapsibleSection 
                    title={`Languages (${new Intl.DisplayNames([details.currentLanguage || 'en'], { type: 'language' }).of(details.currentLanguage || 'en')})`} 
                    defaultExpanded={false}
                    titleVariant="subtitle1"
                  >
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={1}>
                        {details.languages.map((language) => (
                          <Grid item key={language}>
                            <Chip
                              icon={<Language />}
                              label={new Intl.DisplayNames([details.currentLanguage || 'en'], { type: 'language' }).of(language)}
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </CollapsibleSection>
                )}

                {/* Privacy - Collapsible */}
                {details.privacyTypes && details.privacyTypes.length > 0 && (
                  <CollapsibleSection 
                    title="Privacy" 
                    defaultExpanded={false}
                    titleVariant="subtitle1"
                  >
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {details.privacyTypes.map((privacyType) => (
                        <Box key={privacyType.identifier} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {privacyType.privacyType}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {privacyType.description}
                          </Typography>
                          {privacyType.purposes.map((purpose) => (
                            <Box key={purpose.identifier} sx={{ mb: 2, pl: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium' }}>
                                {purpose.purpose}
                              </Typography>
                              {purpose.dataCategories.map((category) => (
                                <Box key={category.identifier} sx={{ mb: 1, pl: 2 }}>
                                  <Typography variant="body2" gutterBottom>
                                    {category.dataCategory}:
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                                    {category.dataTypes.join(', ')}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ))}
                        </Box>
                      ))}
                      {details.managePrivacyChoicesUrl && (
                        <Button 
                          href={details.managePrivacyChoicesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          Manage Privacy Choices
                        </Button>
                      )}
                    </Paper>
                  </CollapsibleSection>
                )}

                {/* Supported Devices - Collapsible */}
                {details?.supportedDevices && details.supportedDevices.length > 0 && (
                  <CollapsibleSection title="Supported Devices" defaultExpanded={false} titleVariant="subtitle1">
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <List dense disablePadding>
                        {details.supportedDevices.map((device, index) => (
                          <ListItem key={index} sx={{ px: 1 }}>
                            <ListItemIcon>
                              <PhoneIphone fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={device}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </CollapsibleSection>
                )}

                {/* Developer's Other Apps */}
                {developerApps.length > 0 && !(developerApps.length === 1 && developerApps[0].id.toString() === id.toString()) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }} gutterBottom>
                      More by {details.developer}
                    </Typography>
                    <Grid container spacing={1}>
                      {developerApps.map((app) => (
                        <Grid item xs={12} key={app.id}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                            onClick={() => navigate(`/app/${app.id}`)}
                          >
                            <CardContent sx={{ p: 1.5 }}>
                              <Box display="flex" alignItems="center">
                                <Avatar
                                  src={app.icon}
                                  alt={app.title}
                                  variant="rounded"
                                  sx={{ width: 40, height: 40, mr: 1.5 }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" noWrap>
                                    {app.title}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" color="warning.main">★</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {app.score?.toFixed(1) || 'N/A'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={8}>
              {/* Screenshots Sections */}
              {details?.screenshots && details.screenshots.length > 0 && (
                <CollapsibleSection title="iPhone Screenshots" defaultExpanded={true}>
                  <ScreenshotGallery screenshots={details.screenshots} />
                </CollapsibleSection>
              )}

              {details?.ipadScreenshots && details.ipadScreenshots.length > 0 && (
                <CollapsibleSection title="iPad Screenshots" defaultExpanded={false}>
                  <ScreenshotGallery screenshots={details.ipadScreenshots} />
                </CollapsibleSection>
              )}

              {/* What's New */}
              {details?.releaseNotes && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    What's New
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {details.releaseNotes}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Description */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {details?.description}
                  </Typography>
                </Paper>
              </Box>

              {/* Reviews */}
              {reviews.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      Reviews
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={handleDownloadReviews}
                      size="small"
                    >
                      Download Reviews
                    </Button>
                  </Box>
                  <Paper variant="outlined">
                    <List disablePadding>
                      {reviews.map((review, index) => (
                        <ListItem
                          key={review.id}
                          divider={index < reviews.length - 1}
                          sx={{ px: 2, py: 1.5 }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center">
                                <Rating value={review.score} readOnly size="small" />
                                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                                  {review.title}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {review.userName} - Version {review.version} - {new Date(review.updated).toLocaleDateString()} {new Date(review.updated).toLocaleTimeString()}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {review.text}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setReviewPage(prev => prev + 1)}
                      disabled={loadingReviews || reviews.length < 10}
                    >
                      Load More Reviews
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Similar Apps */}
              {similarApps.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Similar Apps
                  </Typography>
                  <Grid container spacing={2}>
                    {similarApps.slice(0, 8).map((app) => (
                      <Grid item xs={6} sm={4} md={3} key={app.id}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                          onClick={() => navigate(`/app/${app.id}`)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box display="flex" alignItems="center">
                              <Avatar
                                src={app.icon}
                                alt={app.title}
                                variant="rounded"
                                sx={{ width: 40, height: 40, mr: 1.5 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap>
                                  {app.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {app.developer}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}

export default AppDetails;
