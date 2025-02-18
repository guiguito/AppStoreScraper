import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import ScreenshotGallery from './ScreenshotGallery';
import AppDetailsShimmer from './ShimmerEffect';
import RatingsHistogram from './RatingsHistogram';
import * as flags from 'country-flag-icons/react/3x2';
import { normalizeCountryCode, isValidCountryCode } from '../utils/countryUtils';
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
import { Download, PhoneIphone, ArrowBack, Language, Public, Apple, Google } from '@mui/icons-material';
import CollapsibleSection from './CollapsibleSection';

function AppDetails({ country: initialCountry }) {
  const { id, store } = useParams();
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
  const [availableCountries, setAvailableCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // Set initial language and country from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    const countryParam = params.get('country');
    
    // Update URL if initial country is provided but not in URL
    if (!countryParam && initialCountry) {
      const normalizedCountry = normalizeCountryCode(initialCountry);
      params.set('country', normalizedCountry);
      navigate(`${window.location.pathname}?${params.toString()}`, { replace: true });
    }

    setSelectedLang(langParam || 'en');
    setSelectedCountry(normalizeCountryCode(countryParam || initialCountry || 'US'));
  }, [initialCountry, navigate]);

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
          fetch(buildApiUrl(`/app/${store}/${id}`, { lang: selectedLang, country: selectedCountry }), { signal }),
          fetch(buildApiUrl(`/similar/${store}/${id}`, { lang: selectedLang, country: selectedCountry }), { signal }),
          fetch(buildApiUrl(`/developer-apps/${store}/${details?.developerId || id}`, { lang: selectedLang, country: selectedCountry }), { signal })
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
          setAvailableCountries(detailsData.availableCountries || []);
          setLoadingCountries(false);
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

  // Fetch initial reviews (max 10)
  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const response = await fetch(
          buildApiUrl(`/reviews/${store}/${id}`, {
            lang: selectedLang,
            country: selectedCountry,
            limit: 10,
            sort: 'recent'
          }),
          { signal }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reviews');
        }

        const reviewsData = await response.json();

        if (!signal.aborted) {
          setReviews(reviewsData);
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
  }, [id, selectedLang, selectedCountry]);

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={4}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => {
          localStorage.setItem('selectedStore', store);
          navigate('/');
        }}>
          Return to Search
        </Button>
      </Box>
    );
  }

  if (loading || !details) {
    return <AppDetailsShimmer />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Card>
        <CardContent>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              localStorage.setItem('selectedStore', store);
              navigate('/');
            }}
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
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    {details.icon && (
                      <Avatar
                        src={details.icon}
                        alt={details.title}
                        variant="rounded"
                        sx={{ width: 120, height: 120 }}
                        imgProps={{
                          referrerPolicy: 'no-referrer',
                          crossOrigin: 'anonymous',
                          onError: (e) => {
                            if (e.target.getAttribute('referrerPolicy') === 'no-referrer') {
                              e.target.setAttribute('referrerPolicy', 'origin');
                              e.target.src = details.icon;
                            }
                          }
                        }}
                      />
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -10,
                        right: -10,
                        bgcolor: 'background.paper',
                        borderRadius: '50%',
                        padding: 0.5,
                        boxShadow: 1
                      }}
                    >
                      {details.store === 'appstore' ? (
                        <Apple sx={{ fontSize: 24, color: 'text.secondary' }} />
                      ) : (
                        <Google sx={{ fontSize: 24, color: 'text.secondary' }} />
                      )}
                    </Box>
                  </Box>
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
                    Required OS Version: {details.store === 'appstore' ? details.requiredOsVersion : details.androidVersion || 'Varies with device'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Content Rating: {details.contentRating || details.contentRatingDescription || 'Not specified'}
                  </Typography>
                  {details.released && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Released: {new Date(details.released).toLocaleDateString()}
                    </Typography>
                  )}
                  {details.updated && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Updated: {new Date(details.updated).toLocaleDateString()}
                    </Typography>
                  )}
                  {details.store === 'playstore' && details.size && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Size: {details.size}
                    </Typography>
                  )}
                  {details.store === 'playstore' && details.installs && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Installs: {details.installs}
                    </Typography>
                  )}
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

                {/* Countries - Collapsible (iOS only) */}
                {details.store === 'appstore' && (
                  <CollapsibleSection
                    title={`${availableCountries.length} available countries (${availableCountries.find(c => c.code === selectedCountry)?.name || 'Unknown'})`}
                    icon={<Public />}
                    defaultExpanded={false}
                    titleVariant="subtitle1"
                  >
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {loadingCountries ? (
                        <Box display="flex" justifyContent="center" p={2}>
                          <CenteredLoader size="small" />
                        </Box>
                      ) : (
                        <Grid container spacing={1}>
                          {availableCountries.map(({ code, name }) => {
                            const FlagComponent = flags[code];
                            return (
                              <Grid item key={code}>
                                <Chip
                                  icon={FlagComponent ? <FlagComponent style={{ width: '16px', marginLeft: '8px' }} /> : null}
                                  label={name}
                                  variant={code === selectedCountry ? "filled" : "outlined"}
                                  size="small"
                                  onClick={() => {
                                    if (!isValidCountryCode(code)) {
                                      console.warn(`Invalid country code: ${code}, ignoring click`);
                                      return;
                                    }
                                    setSelectedCountry(code);
                                    const searchParams = new URLSearchParams(window.location.search);
                                    searchParams.set('country', normalizeCountryCode(code));
                                    navigate(`/app/${store}/${id}?${searchParams.toString()}`);
                                  }}
                                />
                              </Grid>
                            );
                          })}
                        </Grid>
                      )}
                    </Paper>
                  </CollapsibleSection>
                )}

                {/* Languages - Collapsible (iOS only) */}
                {details.store === 'appstore' && details.languages && details.languages.length > 0 && (
                  <CollapsibleSection 
                    title={`Languages (${new Intl.DisplayNames([details.currentLanguage || 'en'], { type: 'language' }).of(details.currentLanguage || 'en')})`} 
                    defaultExpanded={false}
                    titleVariant="subtitle1"
                  >
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={1}>
                        {details.languages.map((language) => {
                          // Map language codes to country codes for flags
                          const countryCode = language === 'en' ? 'GB' : 
                                            language === 'ja' ? 'JP' :
                                            language === 'ko' ? 'KR' :
                                            language === 'zh' ? 'CN' :
                                            language.toUpperCase();
                          const FlagComponent = flags[countryCode];
                          return (
                            <Grid item key={language}>
                              <Chip
                                icon={FlagComponent ? <FlagComponent style={{ width: '16px', marginLeft: '8px' }} /> : <Language />}
                                label={new Intl.DisplayNames([details.currentLanguage || 'en'], { type: 'language' }).of(language)}
                                variant={language === selectedLang ? "filled" : "outlined"}
                                size="small"
                                onClick={() => {
                                  setSelectedLang(language);
                                  const searchParams = new URLSearchParams(window.location.search);
                                  searchParams.set('lang', language);
                                  navigate(`/app/${store}/${id}?${searchParams.toString()}`);
                                }}
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                  },
                                }}
                              />
                            </Grid>
                          );
                        })}
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
                            onClick={() => navigate(`/app/${store}/${app.id}`)}
                          >
                            <CardContent sx={{ p: 1.5 }}>
                              <Box display="flex" alignItems="center">
                                <Avatar
                                  src={app.icon}
                                  alt={app.title}
                                  variant="rounded"
                                  sx={{ width: 40, height: 40, mr: 1.5 }}
                                  imgProps={{
                                    referrerPolicy: 'no-referrer',
                                    crossOrigin: 'anonymous',
                                    onError: (e) => {
                                      if (e.target.getAttribute('referrerPolicy') === 'no-referrer') {
                                        e.target.setAttribute('referrerPolicy', 'origin');
                                        e.target.src = app.icon;
                                      }
                                    }
                                  }}
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
                <CollapsibleSection 
                  title={details.store === 'appstore' ? 'iPhone Screenshots' : 'Screenshots'} 
                  defaultExpanded={true}
                >
                  <ScreenshotGallery screenshots={details.screenshots} />
                </CollapsibleSection>
              )}

              {details?.ipadScreenshots && details.ipadScreenshots.length > 0 && details.store === 'appstore' && (
                <CollapsibleSection title="iPad Screenshots" defaultExpanded={false}>
                  <ScreenshotGallery screenshots={details.ipadScreenshots} />
                </CollapsibleSection>
              )}

              {/* What's New */}
              {(details?.releaseNotes || details?.recentChanges) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    What's New
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {details.releaseNotes || details.recentChanges}
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
                      Latest Reviews
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/app/${store}/${id}/reviews?country=${selectedCountry}&lang=${selectedLang}`)}
                      size="small"
                    >
                      View Full Analysis
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
                            secondaryTypographyProps={{ component: 'div' }}
                            secondary={
                              <React.Fragment>
                                <Typography variant="caption" color="text.secondary" display="block" component="div">
                                  {review.userName} - Version {review.version} - {new Date(review.updated).toLocaleDateString()} {new Date(review.updated).toLocaleTimeString()}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }} component="div">
                                  {review.text}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/app/${store}/${id}/reviews?country=${selectedCountry}&lang=${selectedLang}`)}
                    >
                      View All Reviews
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
                          onClick={() => navigate(`/app/${store}/${app.id}`)}
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
