import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import express from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

import { AppStoreClient, Country, Collection, Sort, Review } from 'app-store-client';
import type { category as PlayStoreCategory } from 'google-play-scraper';
import { Parser } from 'json2csv';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: google-play-scraper works with default import despite the type error
import gplay from 'google-play-scraper';

// Define custom interfaces
interface ValidatedRequest extends express.Request {
  validatedParams?: {
    lang: string;
    country: string;
  };
}

interface AppStoreResult {
  id: string;
  title: string;
  icon: string;
  developer: string;
  url: string;
  description: string;
  score: number;
}

// Interface for raw Google Play app data
interface GooglePlayReview {
  id: string;
  userName: string;
  text: string;
  score: number;
  version?: string;
  date: string;
}

interface UnifiedReview {
  id: string;
  userName: string;
  title: string;
  text: string;
  rating: number;
  score: number;
  version: string;
  updated: string;
  store: 'appstore' | 'playstore';
  userUrl: string;
  url: string;
}

interface GooglePlayApp {
  appId: string;
  title: string;
  url: string;
  summary?: string;
  icon: string;
  developer: string;
  developerId?: string;
  score: number;
}

interface PlayStoreResult {
  appId: string;
  title: string;
  icon: string;
  developer: string;
  developerId?: string;
  url: string;
  summary?: string;
  score: number;
}

interface UnifiedAppResult {
  id: string;
  title: string;
  icon: string;
  developer: string;
  url: string;
  description: string;
  score: number;
  store: 'appstore' | 'playstore';
}

// Initialize Firebase Admin
initializeApp();

const app = express();
const client = new AppStoreClient();
const db = getFirestore();

// Interface for cached sentiment analysis
interface CachedSentimentAnalysis {
  appId: string;
  country: string;
  analysis: SentimentAnalysisResponse;
  lastUpdated: Timestamp;
}

// CORS middleware for all requests
app.use((req, res, next) => {
  // Allow requests from any origin
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '3600');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Middleware for parsing JSON
app.use(express.json());

// Country utilities
// Map of supported ISO 3166-1 alpha-2 country codes to app-store-client Country enum
const countryMap: { [key: string]: Country } = {
  'US': Country.US,   // United States
  'GB': Country.GB,   // United Kingdom
  'FR': Country.FR,   // France
  'DE': Country.DE,   // Germany
  'IT': Country.IT,   // Italy
  'ES': Country.ES,   // Spain
  'CA': Country.CA,   // Canada
  'CN': Country.CN,   // China
  'JP': Country.JP,   // Japan
  'KR': Country.KR,   // South Korea
  'AU': Country.AU,   // Australia
  'BR': Country.BR,   // Brazil
  'MX': Country.MX,   // Mexico
  'NL': Country.NL,   // Netherlands
  'RU': Country.RU,   // Russia
  'CH': Country.CH,   // Switzerland
  'SE': Country.SE,   // Sweden
  'PL': Country.PL,   // Poland
  'BE': Country.BE,   // Belgium
  'IN': Country.IN,   // India
  'ID': Country.ID,   // Indonesia
  'TR': Country.TR,   // Turkey
  'TW': Country.TW,   // Taiwan
  'SA': Country.SA,   // Saudi Arabia
  'SG': Country.SG,   // Singapore
  'HK': Country.HK,   // Hong Kong
  'AE': Country.AE,   // United Arab Emirates
  'DK': Country.DK,   // Denmark
  'NO': Country.NO,   // Norway
  'FI': Country.FI,   // Finland
  'LU': Country.LU,   // Luxembourg
};

const getCountryCode = (userCountry = 'US'): Country => {
  const countryCode = userCountry.toUpperCase();
  if (!isValidCountry(countryCode)) {
    logger.warn(`Invalid country code: ${countryCode}, falling back to US`);
    return Country.US;
  }
  return countryMap[countryCode];
};

const isValidCountry = (countryCode: string): boolean => {
  const normalizedCode = countryCode.toUpperCase();
  return normalizedCode in countryMap && normalizedCode.length === 2;
};

// ISO 3166-1 alpha-2 country codes with their display names
const TOP_30_COUNTRIES: { [key: string]: string } = {
  'AE': 'United Arab Emirates',
  'AU': 'Australia',
  'BE': 'Belgium',
  'BR': 'Brazil',
  'CA': 'Canada',
  'CH': 'Switzerland',
  'CN': 'China',
  'DE': 'Germany',
  'DK': 'Denmark',
  'ES': 'Spain',
  'FI': 'Finland',
  'FR': 'France',
  'GB': 'United Kingdom',
  'HK': 'Hong Kong',
  'ID': 'Indonesia',
  'IN': 'India',
  'IT': 'Italy',
  'JP': 'Japan',
  'KR': 'South Korea',
  'MX': 'Mexico',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'PL': 'Poland',
  'RU': 'Russia',
  'SA': 'Saudi Arabia',
  'SE': 'Sweden',
  'SG': 'Singapore',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'US': 'United States',
  'LU': 'Luxembourg',
};
const fetchAvailableCountries = async (id: string): Promise<{code: string, name: string}[]> => {
  const available: {code: string, name: string}[] = [];
  await Promise.all(Object.entries(TOP_30_COUNTRIES).map(async ([code, name]) => {
    try {
      const response = await fetch(`https://itunes.apple.com/${code}/lookup?id=${id}`);
      const data = await response.json();
      if(data.resultCount > 0){
        available.push({ code, name });
      }
    } catch(err) {
      console.error(`Error checking availability for ${name}:`, err);
    }
  }));
  return available;
};

// Middleware
const validateCommonParams = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): express.Response | void => {
  const { lang = 'en', country = 'US' } = req.query;
  
  if (!isValidCountry(country.toString().toUpperCase())) {
    return res.status(400).json({ 
      error: `Invalid country code: ${country}. Please use a valid ISO 3166-1 alpha-2 country code.`, 
    });
  }

  (req as any).validatedParams = {
    lang: lang.toString(),
    country: country.toString().toUpperCase(),
  };

  next();
};

const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: express.NextFunction
): express.Response => {
  logger.error('Error:', err);

  if (err.name === 'AppNotFoundError') {
    return res.status(404).json({ error: 'App not found' });
  }

  if (err.name === 'AppStoreAPIError') {
    return res.status(502).json({ error: 'App Store API error' });
  }

  return res.status(500).json({ error: 'Internal server error' });
};

// Helper function to fetch reviews for both appstore and playstore endpoints
async function fetchReviews(id: string, store: string, lang: string, country: string, limit: number): Promise<any[]> {
  if (store === 'appstore') {
    let reviews: any[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore && reviews.length < limit) {
      try {
        const results = await client.reviews({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
          page,
          sort: Sort.RECENT,
        });
        if (results && results.length > 0) {
          reviews = reviews.concat(results.map(review => ({
            ...review,
            store: 'appstore',
            rating: review.score, // Map App Store's 'score' to 'rating'
          })));
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        logger.error(`Error fetching App Store reviews page ${page}:`, error);
        break;
      }
    }
    return reviews;
  } else if (store === 'playstore') {
    try {
      logger.info(`Fetching Play Store reviews for app ${id} with limit ${limit}`);
      const REVIEWS_PER_PAGE = 100;
      const MAX_PLAY_STORE_BATCHES = 10;
      const batchSize = Math.min(limit, REVIEWS_PER_PAGE);
      const numBatches = Math.min(Math.ceil(limit / batchSize), MAX_PLAY_STORE_BATCHES);
      logger.info(`Will fetch ${numBatches} batches with ${batchSize} reviews per batch`);
      const batchPromises = [];
      for (let batch = 0; batch < numBatches; batch++) {
        batchPromises.push(
          gplay.reviews({
            appId: id,
            lang,
            country: country.toLowerCase(),
            num: batchSize,
            sort: gplay.sort.NEWEST,
            paginate: true,
            nextPaginationToken: batch > 0 ? batch.toString() : undefined,
          })
        );
      }
      const batches = await Promise.all(batchPromises);
      const reviews = batches.reduce((acc: UnifiedReview[], batchResult: { data: any[] }) => {
        const transformedReviews = batchResult.data.map((review: any): UnifiedReview => ({
          id: review.id,
          userName: review.userName,
          title: '',  // Google Play reviews don't have titles
          text: review.text,
          rating: review.score,
          score: review.score,
          version: review.version || '',
          updated: review.date,
          store: 'playstore',
          userUrl: review.url || '',  // Use review URL if available
          url: review.url || '',  // Use review URL if available
        }));
        return acc.concat(transformedReviews);
      }, []);
      return reviews;
    } catch (error) {
      logger.error(`Error fetching Play Store reviews for app ${id}:`, error);
      return [];
    }
  } else {
    return [];
  }
}

// Routes
app.get('/category-apps/:store', validateCommonParams, async (req: ValidatedRequest, res: express.Response) => {
  try {
    const { lang, country } = req.validatedParams!;
    const { store } = req.params;
    const categoryId = req.query.categoryId as string;
    const limit = Math.min(parseInt(req.query.limit?.toString() || '20'), 100);

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    logger.info(`Fetching ${store} category apps - Category: ${categoryId}, Limit: ${limit}`);

    if (store === 'playstore') {
      try {
        const apps = await gplay.list({
          category: categoryId as PlayStoreCategory,
          collection: gplay.collection.TOP_FREE,
          country: country.toLowerCase(),
          lang: lang,
          num: limit,
          fullDetail: false,
        });

        const results = apps.slice(0, limit).map((app: GooglePlayApp) => ({
          id: app.appId,
          title: app.title,
          icon: app.icon,
          developer: app.developer,
          url: app.url,
          description: app.summary || '',
          score: app.score,
          store: 'playstore',
        }));

        logger.info(`Successfully fetched ${results.length} Play Store category apps`);
        return res.json(results);
      } catch (error) {
        logger.error('Error fetching Play Store category apps:', error);
        return res.status(500).json({
          error: 'Failed to fetch Play Store category apps',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else if (store === 'appstore') {
      try {
        const apps = await client.list({
          category: parseInt(categoryId),
          country: getCountryCode(country),
          language: lang,
          num: limit,
        });

        const results = apps.slice(0, limit).map(app => ({
          id: app.id,
          title: app.title,
          icon: app.icon,
          developer: app.developer,
          url: app.url,
          description: app.description,
          score: app.score,
          store: 'appstore',
        }));

        logger.info(`Successfully fetched ${results.length} App Store category apps`);
        return res.json(results);
      } catch (error) {
        logger.error('Error fetching App Store category apps:', error);
        return res.status(500).json({
          error: 'Failed to fetch App Store category apps',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return res.status(400).json({ error: 'Invalid store parameter' });
  } catch (error) {
    logger.error('Error in category apps endpoint:', error);
    return res.status(500).json({ error: 'Failed to fetch category apps' });
  }
});

app.get('/search', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { term } = req.query;
    const { lang, country } = req.validatedParams!;

    if (!term || term.toString().trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = term.toString().trim();

    try {
      const [appStoreResults, playStoreResults] = await Promise.allSettled([
        client.search({
          term: searchTerm,
          num: 10, // Reduced to show equal number from both stores
          country: getCountryCode(country),
          language: lang,
        }),
        gplay.search({
          term: searchTerm,
          country: country.toLowerCase(),
          lang: lang,
          num: 10, // Reduced to show equal number from both stores
        }),
      ]);

      const results = [];
      
      if (appStoreResults.status === 'fulfilled') {
        results.push(...(appStoreResults.value as AppStoreResult[]).map(app => ({
          ...app,
          store: 'appstore',
        })));
      }

      if (playStoreResults.status === 'fulfilled') {
        results.push(...(playStoreResults.value as PlayStoreResult[]).map(app => ({
          id: app.appId,
          title: app.title,
          icon: app.icon,
          developer: app.developer,
          url: app.url,
          description: app.summary || '',
          score: app.score,
          store: 'playstore',
        } as UnifiedAppResult)));
      }

      // Interleave results from both stores
      const interleaved = [];
      const maxLength = Math.max(
        results.filter(r => r.store === 'appstore').length,
        results.filter(r => r.store === 'playstore').length
      );

      for (let i = 0; i < maxLength; i++) {
        const appStore = results.filter(r => r.store === 'appstore')[i];
        const playStore = results.filter(r => r.store === 'playstore')[i];
        if (appStore) interleaved.push(appStore);
        if (playStore) interleaved.push(playStore);
      }

      return res.json(interleaved);
    } catch (error) {
      logger.error('Search error:', error);
      return res.status(500).json({ error: 'Failed to perform search' });
    }
  } catch (error) {
    return next(error);
  }
});

app.get('/app/:store/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (store === 'appstore') {
      // Fetch app data first - if this fails, we want to return an error
      const appData = await client.app({
        id: id.toString(),
        country: getCountryCode(country),
        language: lang,
      });

      // Fetch ratings and privacy data in parallel, handle errors individually
      const [ratingsData, privacyData] = await Promise.allSettled([
        client.ratings({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
        }),
        client.privacy({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
        }),
      ]);

      // Process ratings data if available
      let ratingsWithPercentages = {
        total: 0,
        average: appData.score || 0,
        histogram: {},
      };

      if (ratingsData.status === 'fulfilled') {
        const rData = ratingsData.value;
        const totalRatings = rData.ratings || 0;
        const histogram = rData.histogram || {};
        const histogramWithPercentages = Object.entries(histogram).reduce((acc, [rating, count]) => {
          acc[rating] = {
            count,
            percentage: totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) + '%' : '0.0%',
          };
          return acc;
        }, {} as Record<string, { count: number; percentage: string }>);

        ratingsWithPercentages = {
          total: totalRatings,
          average: appData.score || 0,
          histogram: histogramWithPercentages,
        };
      } else {
        logger.warn('Failed to fetch ratings:', ratingsData.reason);
      }

      // Process privacy data if available
      let privacyInfo = {};
      if (privacyData.status === 'fulfilled') {
        privacyInfo = privacyData.value;
      } else {
        logger.warn('Failed to fetch privacy data:', privacyData.reason);
      }

      const availableCountries = await fetchAvailableCountries(id.toString());
      return res.json({ 
        ...appData, 
        ratings: ratingsWithPercentages,
        ...privacyInfo,
        availableCountries,
        store: 'appstore',
      });
    } else if (store === 'playstore') {
      const appData = await gplay.app({
        appId: id,
        country: country.toLowerCase(),
        lang: lang,
      });

      // Format Play Store data to match our unified format
      const formattedData = {
        id: appData.appId,
        title: appData.title,
        description: appData.description,
        releaseNotes: appData.recentChanges,
        version: appData.version,
        released: appData.released,
        updated: appData.updated,
        size: appData.size,
        androidVersion: appData.androidVersion,
        contentRating: appData.contentRating,
        contentRatingDescription: appData.contentRatingDescription,
        developer: appData.developer,
        developerUrl: appData.developerWebsite,
        icon: appData.icon,
        screenshots: appData.screenshots,
        score: appData.score,
        ratings: {
          total: appData.ratings || 0,
          average: appData.score || 0,
          histogram: Object.entries(appData.histogram || {}).reduce<
            Record<string, { count: number; percentage: string }>
          >((acc, [rating, count]) => {
            const numericCount = typeof count === 'number' ? count : 0;
            acc[rating] = {
              count: numericCount,
              percentage: appData.ratings > 0 ? ((numericCount / appData.ratings) * 100).toFixed(1) + '%' : '0.0%',
            };
            return acc;
          }, {}),
        },
        price: appData.priceText === 'Free' ? 0 : parseFloat(appData.priceText?.replace('$', '') || '0'),
        url: appData.url,
        installs: appData.installs,
        genres: appData.genreId ? [appData.genreId] : [],
        store: 'playstore',
      };

      return res.json(formattedData);
    }
  } catch (error) {
    logger.error('Error in app details endpoint:', error);
    return next(error);
  }
});

app.get('/collection/:store/:type', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { type, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const requestedLimit = req.query.limit?.toString();
    const limit = Math.min(parseInt(requestedLimit || '20'), 100);
    logger.info(`Collection request - Store: ${store},
      Type: ${type}, Requested limit: ${requestedLimit}, Final limit: ${limit}`);

    if (store === 'playstore') {
      try {
        let collection;
        switch (type) {
        case 'topselling_free':
          collection = gplay.collection.TOP_FREE;
          break;
        case 'topselling_paid':
          collection = gplay.collection.TOP_PAID;
          break;
        case 'topgrossing':
          collection = gplay.collection.GROSSING;
          break;
        default:
          return res.status(400).json({
            error: 'Invalid collection type for Play Store',
            validTypes: ['topselling_free', 'topselling_paid', 'topgrossing'],
          });
        }

        logger.info(`Fetching Play Store collection: ${type} for country: ${country}`);
        const apps = await gplay.list({
          collection,
          country: country.toLowerCase(),
          lang: lang,
          num: limit,
          fullDetail: false,
        });

        logger.info(`Fetched ${apps?.length || 0} apps from Play Store collection`);

        if (!apps || !Array.isArray(apps)) {
          logger.error('Invalid response from Play Store API:', apps);
          return res.status(500).json({
            error: 'Invalid response from Play Store API',
          });
        }

        // Map and limit results
        const results: PlayStoreResult[] = apps
          .slice(0, limit)
          .map((app: GooglePlayApp) => ({
            appId: app.appId,
            title: app.title,
            icon: app.icon,
            developer: app.developer,
            developerId: app.developerId,
            url: app.url,
            summary: app.summary,
            score: app.score,
          }));

        logger.info(`Successfully fetched and limited to ${results.length} apps from Play Store collection: ${type}`);
        return res.json(results);
      } catch (error) {
        logger.error('Error fetching Play Store collection:', error);
        return res.status(500).json({
          error: 'Failed to fetch Play Store collection',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // App Store collections
    let collection;
    switch (type) {
    // iOS Apps
    case 'topfreeapplications':
      collection = Collection.TOP_FREE_IOS;
      break;
    case 'topgrossingapplications':
      collection = Collection.TOP_GROSSING_IOS;
      break;
    case 'toppaidapplications':
      collection = Collection.TOP_PAID_IOS;
      break;
    case 'newapplications':
      collection = Collection.NEW_IOS;
      break;
    case 'newfreeapplications':
      collection = Collection.NEW_FREE_IOS;
      break;
    case 'newpaidapplications':
      collection = Collection.NEW_PAID_IOS;
      break;

      // iPad Apps
    case 'topfreeipadapplications':
      collection = Collection.TOP_FREE_IPAD;
      break;
    case 'topgrossingipadapplications':
      collection = Collection.TOP_GROSSING_IPAD;
      break;
    case 'toppaidipadapplications':
      collection = Collection.TOP_PAID_IPAD;
      break;

      // Mac Apps (if needed)
    case 'topmacapplications':
      collection = Collection.TOP_MAC;
      break;
    case 'topfreemacapplications':
      collection = Collection.TOP_FREE_MAC;
      break;
    case 'topgrossingmacapplications':
      collection = Collection.TOP_GROSSING_MAC;
      break;
    case 'toppaidmacapplications':
      collection = Collection.TOP_PAID_MAC;
      break;

    default:
      return res.status(400).json({ 
        error: 'Invalid collection type',
        validTypes: [
          // iOS
          'topfreeapplications',
          'topgrossingapplications',
          'toppaidapplications',
          'newapplications',
          'newfreeapplications',
          'newpaidapplications',
          // iPad
          'topfreeipadapplications',
          'topgrossingipadapplications',
          'toppaidipadapplications',
          // Mac
          'topmacapplications',
          'topfreemacapplications',
          'topgrossingmacapplications',
          'toppaidmacapplications',
        ],
      });
    }

    const apps = await client.list({
      collection,
      country: getCountryCode(country),
      language: lang,
      num: limit,
    });

    // Map and limit results
    const results = apps.slice(0, limit).map(app => ({
      id: app.id,
      title: app.title,
      icon: app.icon,
      developer: app.developer,
      url: app.url,
      description: app.description,
      score: app.score,
    }));

    logger.info(`Successfully fetched and limited to ${results.length} apps from App Store collection: ${type}`);
    return res.json(results);
  } catch (error) {
    logger.error('Error in collection endpoint:', error);
    return next(error);
  }
});

app.get('/reviews/:store/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const limit = parseInt(req.query.limit?.toString() || '50');

    const reviews = await fetchReviews(id, store, lang, country, limit);
    return res.json(reviews);
  } catch (error) {
    logger.error('Error in reviews endpoint:', error);
    return next(error);
  }
});

// Sentiment analysis endpoint
app.get('/reviews/:store/:id/sentiment', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    if (store !== 'appstore' && store !== 'playstore') {
      return res.status(400).json({ error: 'Invalid store parameter. Must be either "appstore" or "playstore"' });
    }

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Fetch reviews first
    const allReviews: UnifiedReview[] = [];
    const MAX_REVIEWS = 500; // Maximum number of reviews to analyze

    const dateRange = `${startDate?.toISOString() || 'all'} - ${endDate?.toISOString() || 'all'}`;
    logger.info(`Fetching reviews with date range: ${dateRange}`);

    if (store === 'appstore') {
      let page = 0;
      let hasMore = true;

      while (hasMore && page < 20 && allReviews.length < MAX_REVIEWS) {
        try {
          const results = await client.reviews({
            id: id.toString(),
            country: getCountryCode(country),
            language: lang,
            page,
            sort: Sort.RECENT,
          });

          if (!results || results.length === 0) {
            hasMore = false;
            break;
          }

          // Filter reviews by date range
          for (const review of results) {
            const reviewDate = new Date(review.updated);
            
            // Stop if we've gone past the start date (reviews are in descending order)
            if (startDate && reviewDate < startDate) {
              hasMore = false;
              break;
            }

            // Only add reviews within the date range
            if ((!startDate || reviewDate >= startDate) && 
                (!endDate || reviewDate <= endDate)) {
              allReviews.push({
                id: review.id,
                userName: review.userName,
                title: review.title,
                text: review.text,
                rating: review.score,
                score: review.score,
                version: review.version,
                updated: review.updated,
                store: 'appstore',
                userUrl: review.userUrl,
                url: review.url,
              });
              
              // Stop if we've reached the maximum number of reviews
              if (allReviews.length >= MAX_REVIEWS) {
                hasMore = false;
                break;
              }
            }
          }

          page++;
        } catch (error) {
          logger.error(`Error fetching App Store reviews page ${page}:`, error);
          break;
        }
      }
    } else { // playstore
      try {
        const results = await gplay.reviews({
          appId: id,
          lang,
          country: country.toLowerCase(),
          sort: gplay.sort.NEWEST,
          num: MAX_REVIEWS, // Request maximum number of reviews
        });

        if (results && results.data) {
          // Filter and format Play Store reviews
          for (const review of results.data) {
            const reviewDate = new Date(review.date);
            
            // Only add reviews within the date range
            if ((!startDate || reviewDate >= startDate) && 
                (!endDate || reviewDate <= endDate)) {
              allReviews.push({
                id: review.id,
                title: '', // Play Store reviews don't have titles
                userName: review.userName,
                rating: review.score,
                score: review.score,
                text: review.text || '',
                updated: reviewDate.toISOString(),
                store: 'playstore',
                version: review.version || '',
                userUrl: '',
                url: '',
              });
              
              // Stop if we've reached the maximum number of reviews
              if (allReviews.length >= MAX_REVIEWS) {
                break;
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error fetching Google Play Store reviews:', error);
        throw error;
      }
    }

    logger.info(`Analyzing sentiment for ${allReviews.length} filtered reviews`);

    // Perform sentiment analysis on the filtered reviews
    const analysis = await analyzeSentiment(
      id.toString(),
      country,
      allReviews,
      startDate,
      endDate
    );
    return res.json(analysis);
  } catch (error) {
    return next(error);
  }
});

app.get('/reviews/:id/all', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;
    const limit = parseInt(req.query.limit?.toString() || '550');

    // Array to store all reviews
    let allReviews: Review[] = [];
    let page = 0;
    let hasMore = true;
    const MAX_PAGES = Math.ceil(limit / 50); // Each page has 50 reviews

    // Fetch all pages until limit is reached
    while (hasMore && page < MAX_PAGES && allReviews.length < limit) {
      try {
        const results = await client.reviews({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
          page,
          sort: Sort.RECENT,
        });

        if (results && results.length > 0) {
          allReviews = [...allReviews, ...results];
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        logger.error(`Error fetching page ${page}:`, error);
        break;
      }
    }

    // Trim to limit if we got more reviews than requested
    if (allReviews.length > limit) {
      allReviews = allReviews.slice(0, limit);
    }

    return res.json({
      reviews: allReviews,
      total: allReviews.length,
      hasMore: hasMore && allReviews.length === limit,
    });
  } catch (error) {
    return next(error);
  }
});

// Similar apps endpoint
app.get('/similar/:store/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (store === 'appstore') {
      try {
        const similarApps = await client.similarApps({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
        });

        return res.json(similarApps.map(app => ({
          ...app,
          store: 'appstore',
        })));
      } catch (error) {
        logger.info(`No similar apps found in App Store for ${id}`);
        return res.json([]);
      }
    } else if (store === 'playstore') {
      try {
        const similarApps = await gplay.similar({
          appId: id,
          country: country.toLowerCase(),
          lang: lang,
        });

        // For Play Store, map fields to match App Store format
        return res.json(similarApps.map((app: GooglePlayApp) => ({
          id: app.appId,
          title: app.title,
          url: app.url,
          description: app.summary || '',
          icon: app.icon,
          developer: app.developer,
          developerId: app.developerId || '',
          score: app.score,
          store: 'playstore',
        })));
      } catch (error) {
        logger.info(`No similar apps found in Play Store for ${id}`);
        return res.json([]);
      }
    } else {
      return res.status(400).json({ error: 'Invalid store parameter. Use appstore or playstore.' });
    }
  } catch (error) {
    logger.error('Error in similar apps endpoint:', error);
    return next(error);
  }
});

app.get('/reviews/:store/:id/csv', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (store !== 'appstore' && store !== 'playstore') {
      return res.status(400).json({ error: 'Invalid store parameter. Use appstore or playstore.' });
    }

    // Verify app exists first
    try {
      if (store === 'appstore') {
        await client.app({
          id: id.toString(),
          country: getCountryCode(country),
        });
      } else {
        await gplay.app({ appId: id });
      }
    } catch (error) {
      logger.error(`App ${id} not found in ${store}:`, error);
      return res.status(404).json({
        error: `App with ID ${id} not found in the ${store} for ${country}`,
      });
    }

    // Array to store all reviews
    let allReviews: any[] = [];
    let page = 0;
    let hasMore = true;
    const MAX_PAGES = 20; // Safety limit to prevent infinite loops
    const REVIEWS_PER_PAGE = 100;

    logger.info(`Starting to fetch reviews for app ${id} from ${store}`);
    logger.info(`Country: ${country}, Language: ${lang}`);

    // Fetch all pages
    while (hasMore && page <= MAX_PAGES) {
      try {
        logger.info(`Fetching page ${page} for app ${id}...`);
        let results;

        if (store === 'appstore') {
          results = await client.reviews({
            id: id.toString(),
            country: getCountryCode(country),
            language: lang,
            page,
            sort: Sort.RECENT,
          });
        } else {
          logger.info(`Fetching Play Store reviews in batches for app ${id}`);
          const batchPromises = [];
          
          // Create multiple batch requests
          for (let batch = 0; batch < MAX_PLAY_STORE_BATCHES; batch++) {
            logger.info(`Preparing batch ${batch + 1} of ${MAX_PLAY_STORE_BATCHES}`);
            batchPromises.push(
              gplay.reviews({
                appId: id,
                country: country.toLowerCase(),
                lang: lang,
                sort: gplay.sort.NEWEST,
                num: REVIEWS_PER_PAGE,
                paginate: true,
                nextPaginationToken: batch > 0 ? batch.toString() : undefined,
              })
            );
          }

          logger.info('Waiting for all review batches to complete...');
          const batchResults = await Promise.all(batchPromises);
          logger.info('Processing review batches...');
          
          // Combine all review data
          results = batchResults.reduce((allReviews: GooglePlayReview[],
            batch: { data?: GooglePlayReview[] }, index: number) => {
            if (batch && batch.data) {
              logger.info(`Batch ${index + 1}: Processing ${batch.data.length} reviews`);
              return [...allReviews, ...batch.data];
            }
            logger.warn(`Batch ${index + 1}: No reviews found`);
            return allReviews;
          }, []);

          const initialCount = results.length;
          // Remove any duplicate reviews based on review ID
          results = Array.from(new Map(results.map((review: GooglePlayReview) => [review.id, review])).values());
          logger.info(`Removed ${initialCount - results.length} duplicate reviews`);
          
          // Sort reviews by date (newest first)
          results = (results as GooglePlayReview[]).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime());
          logger.info(`Final result: ${results.length} unique reviews sorted by date`);
          
          // Play Store has no more pages after these batches
          hasMore = false;
        }

        logger.info(`Page ${page} received ${results?.length ?? 0} reviews`);

        if (results && results.length > 0) {
          // Format reviews to a common structure
          const formattedReviews = store === 'appstore' ? results : results.map((review: any) => ({
            ...review,
            store: 'playstore',
          }));

          allReviews = [...allReviews, ...formattedReviews];
          logger.info(`Total reviews collected: ${allReviews.length} (after page ${page})`);
          page++;
        } else {
          logger.info(`No more reviews found at page ${page}, stopping pagination`);
          hasMore = false;
        }
      } catch (error) {
        logger.error(`Error fetching page ${page}:`, error);
        if (error instanceof Error) {
          logger.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
        }
        hasMore = false;
      }
    }

    // If we have no reviews at all, return a 404
    if (allReviews.length === 0) {
      return res.status(404).json({
        error: `No reviews found for app ${id} in ${country} with language ${lang}`,
      });
    }

    if (page >= MAX_PAGES) {
      logger.warn(`Reached maximum page limit (${MAX_PAGES}) for app ${id}`);
    }

    try {
      logger.info(`Converting ${allReviews.length} total reviews to CSV for app ${id}`);
      const parser = new Parser();
      const csv = parser.parse(allReviews);

      const filename = `reviews-${id}-${allReviews.length}-reviews.csv`;
      logger.info(`Sending CSV file: ${filename}`);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(csv);
    } catch (error) {
      logger.error('Error converting reviews to CSV:', error);
      return res.status(500).json({
        error: 'Failed to generate CSV file',
      });
    }
  } catch (error) {
    logger.error('Unexpected error in CSV endpoint:', error);
    if (error instanceof Error) {
      return res.status(500).json({
        error: `An unexpected error occurred: ${error.message}`,
      });
    }
    return res.status(500).json({
      error: 'An unexpected error occurred',
    });
  }
});

// Get apps by developer ID
app.get('/developer-apps/:store/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (store === 'appstore') {
      try {
        const results = await client.appsByDeveloper({
          devId: id.toString(),
          country: getCountryCode(country),
          language: lang,
        });

        return res.json(results.map(app => ({
          ...app,
          store: 'appstore',
        })));
      } catch (error) {
        logger.info(`No developer apps found in App Store for ${id}`);
        return res.json([]);
      }
    } else if (store === 'playstore') {
      try {
        const results = await gplay.developer({ devId: id });
        return res.json(results.map((app: PlayStoreResult) => ({
          id: app.appId,
          title: app.title,
          url: app.url,
          description: app.summary || '',
          icon: app.icon,
          developer: app.developer,
          score: app.score,
          store: 'playstore',
        })));
      } catch (error) {
        logger.info(`No developer apps found in Play Store for ${id}`);
        return res.json([]);
      }
    } else {
      return res.status(400).json({ error: 'Invalid store parameter. Use appstore or playstore.' });
    }
  } catch (error) {
    logger.error('Error in developer-apps endpoint:', error);
    return next(error);
  }
});

// Get similar apps
app.get('/similar/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;

    const results = await client.similarApps({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang,
    });

    return res.json(results);
  } catch (error) {
    logger.error('Error in similar apps endpoint:', error);
    return next(error);
  }
});

// Error handling
app.use(errorHandler);

// Get the port from environment variable or use 8080 as default
const port = process.env.PORT || 8080;

// Start the server if we're running in development mode and not through Firebase Functions
if (process.env.NODE_ENV === 'development') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// Export the Express app for local development
export { app };

// Export the Express app as a Firebase Function
// Configure Cloud Function with CORS settings
// Sentiment Analysis types
interface SentimentAnalysisResponse {
  SentimentDistribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  TopIssues: Array<{
    Issue: string;
    Mentions: number;
    Description: string;
  }>;
  Insights: {
    OverallSentiment: string;
    KeyPatterns: string[];
  };
}

// Review fetching configuration
const MAX_PLAY_STORE_BATCHES = 3; // Number of batches to fetch for Play Store

const MISTRAL_API_KEY = 'bR19XOC1oWhJ0NtW9GxQlUKoCh9blDeg';

async function analyzeSentiment(
  appId: string,
  country: string,
  reviews: any[],
  startDate: Date | null,
  endDate: Date | null
): Promise<SentimentAnalysisResponse> {
  // Create cache key that includes the date range
  // Create a date-based cache key if dates are provided
  const startKey = startDate?.toISOString().split('T')[0] || '';
  const endKey = endDate?.toISOString().split('T')[0] || '';
  const dateKey = startDate && endDate ? `_${startKey}_${endKey}` : '';
  const cacheRef = db.collection('sentimentAnalysis').doc(`${appId}_${country}${dateKey}`);
  const cacheDoc = await cacheRef.get();
  
  if (cacheDoc.exists) {
    const cachedData = cacheDoc.data() as CachedSentimentAnalysis;
    const fiveDaysAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
    
    // Return cached data if it's less than 5 days old
    if (cachedData.lastUpdated.toDate() > fiveDaysAgo.toDate()) {
      logger.info('Using cached sentiment analysis', { appId, country });
      return cachedData.analysis;
    }
  }
  const reviewTexts = reviews.map(review => review.text || review.content).filter(Boolean);
  const prompt = `You are a Mobile Product Manager conducting a comprehensive sentiment analysis on the reviews below.
  Your task is to: Categorize with your own analysis (no external code and library)
  sentiment into three distinct groups:Positive, Negative, and Neutral based on the text reviews.
  Count the number of reviews falling into each sentiment category and present the results
  in a structured format. Identify the top 5 recurring issues from negative and neutral reviews.
  Summarize each issue and provide the number of occurrences.
  Provide insights on the overall sentiment distribution and any notable patterns found in the dataset.
  Please provide your answers in english.

Reviews to analyze:
${reviewTexts.map((text, i) => `Review ${i + 1}: ${text}`).join('\n')}`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You will analyze app store reviews and provide sentiment analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            schema: {
              title: 'SentimentAnalysis',
              type: 'object',
              properties: {
                SentimentDistribution: {
                  title: 'Sentiment Distribution',
                  type: 'object',
                  properties: {
                    Positive: { title: 'Positive Reviews', type: 'integer', minimum: 0 },
                    Neutral: { title: 'Neutral Reviews', type: 'integer', minimum: 0 },
                    Negative: { title: 'Negative Reviews', type: 'integer', minimum: 0 },
                  },
                  required: ['Positive', 'Neutral', 'Negative'],
                  additionalProperties: false,
                },
                TopIssues: {
                  title: 'Top Issues',
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Issue: { title: 'Issue', type: 'string' },
                      Mentions: { title: 'Mentions Count', type: 'integer', minimum: 1 },
                      Description: { title: 'Issue Description', type: 'string' },
                    },
                    required: ['Issue', 'Mentions', 'Description'],
                    additionalProperties: false,
                  },
                },
                Insights: {
                  title: 'Insights',
                  type: 'object',
                  properties: {
                    OverallSentiment: { title: 'Overall Sentiment Summary', type: 'string' },
                    KeyPatterns: { title: 'Key Patterns', type: 'array', items: { type: 'string' } },
                  },
                  required: ['OverallSentiment', 'KeyPatterns'],
                  additionalProperties: false,
                },
              },
              required: ['SentimentDistribution', 'TopIssues', 'Insights'],
              additionalProperties: false,
            },
            name: 'sentiment_analysis',
            strict: true,
          },
        },
        max_tokens: 1024,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Mistral API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorBody,
        requestBody: {
          model: 'mistral-small-2501',
          messages: [
            { role: 'system', content: '...' },  // Omitting full content for logs
            { role: 'user', content: '...' },
          ],
          response_format: 'json_schema',
          max_tokens: 1024,
          temperature: 0,
        },
      });
      throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    logger.info('Mistral API response:', { result });
    
    if (!result.choices?.[0]?.message?.content) {
      logger.error('Unexpected Mistral API response format:', { result });
      throw new Error('Unexpected response format from Mistral API');
    }
    
    const analysis = result.choices[0].message.content;

    // Cache the results
    await cacheRef.set({
      appId,
      country,
      analysis,
      lastUpdated: Timestamp.now(),
    });

    return analysis;
  } catch (error) {
    logger.error('Error analyzing sentiment:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      appId,
      country,
      reviewCount: reviews.length,
    });
    throw error;
  }
}

export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  region: 'us-central1',
  cors: ['https://appstorescraper-372b7.web.app', 'http://localhost:5173'],
  invoker: 'public',
}, app);
