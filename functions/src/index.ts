import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import express from 'express';

import { AppStoreClient, Country, Collection, Sort, Review } from 'app-store-client';
import { Parser } from 'json2csv';

// Define custom interfaces
interface ValidatedRequest extends express.Request {
  validatedParams?: {
    lang: string;
    country: string;
  };
}

const app = express();
const client = new AppStoreClient();

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
const countryMap: { [key: string]: Country } = {
  'US': Country.US,
  'GB': Country.GB,
  'FR': Country.FR,
  'DE': Country.DE,
  'IT': Country.IT,
  'ES': Country.ES,
  'CA': Country.CA,
  'CN': Country.CN,
  'JP': Country.JP,
  'KR': Country.KR,
};

const getCountryCode = (userCountry = 'US'): Country => {
  const countryCode = userCountry.toUpperCase();
  return countryMap[countryCode] || Country.US;
};

const isValidCountry = (countryCode: string): boolean => {
  return countryCode in countryMap;
};

const TOP_30_COUNTRIES = {
  'US': 'United States', 'CN': 'China', 'JP': 'Japan', 'GB': 'United Kingdom',
  'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'CA': 'Canada',
  'KR': 'South Korea', 'AU': 'Australia', 'ES': 'Spain', 'BR': 'Brazil',
  'RU': 'Russia', 'IN': 'India', 'MX': 'Mexico', 'NL': 'Netherlands',
  'TR': 'Turkey', 'CH': 'Switzerland', 'SE': 'Sweden', 'PL': 'Poland',
  'BE': 'Belgium', 'TW': 'Taiwan', 'ID': 'Indonesia', 'SA': 'Saudi Arabia',
  'SG': 'Singapore', 'HK': 'Hong Kong', 'AE': 'United Arab Emirates',
  'DK': 'Denmark', 'NO': 'Norway', 'FI': 'Finland'
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

// Routes
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

    const results = await client.search({
      term: term.toString().trim(),
      num: 20,
      country: getCountryCode(country),
      language: lang,
    });

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.get('/app/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;

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
    });
  } catch (error) {
    logger.error('Error in app details endpoint:', error);
    return next(error);
  }
});

app.get('/collection/:type', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { type } = req.params;
    const { lang, country } = req.validatedParams!;
    
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

    const results = await client.list({
      collection,
      country: getCountryCode(country),
      language: lang,
      num: 100,
    });

    return res.json(results);
  } catch (error) {
    logger.error('Error in collection endpoint:', error);
    return next(error);
  }
});

app.get('/reviews/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;

    const results = await client.reviews({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang,
    });

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.get('/reviews/:id/csv', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;

    // Verify app exists first
    try {
      await client.app({
        id: id.toString(),
        country: getCountryCode(country),
      });
    } catch (error) {
      logger.error(`App ${id} not found:`, error);
      return res.status(404).json({
        error: `App with ID ${id} not found in the ${country} App Store`,
      });
    }

    // Array to store all reviews
    let allReviews: Review[] = [];
    let page = 0;
    let hasMore = true;
    const MAX_PAGES = 20; // Safety limit to prevent infinite loops

    logger.info(`Starting to fetch reviews for app ${id}`);
    logger.info(`Country: ${country}, Language: ${lang}`);

    // Fetch all pages
    while (hasMore && page <= MAX_PAGES) {
      try {
        logger.info(`Fetching page ${page} for app ${id}...`);
        const results = await client.reviews({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang,
          page,
          sort: Sort.RECENT,
        });

        logger.info(`Page ${page} received ${results?.length ?? 0} reviews`);

        if (results && results.length > 0) {
          allReviews = [...allReviews, ...results];
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
app.get('/developer-apps/:devId', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { devId } = req.params;
    const { lang, country } = req.validatedParams!;

    const results = await client.appsByDeveloper({
      devId: devId.toString(),
      country: getCountryCode(country),
      language: lang,
    });

    return res.json(results);
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
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  region: 'us-central1',
  cors: ['https://appstorescraper-372b7.web.app', 'http://localhost:5173'],
  invoker: 'public',
}, app);
