import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import express from 'express';

import { AppStoreClient, Country, Collection } from 'app-store-client';
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

    const [appData, ratingsData] = await Promise.all([
      client.app({
        id: id.toString(),
        country: getCountryCode(country),
        language: lang,
      }),
      client.ratings({
        id: id.toString(),
        country: getCountryCode(country),
        language: lang,
      }),
    ]);

    // Calculate total ratings and percentages
    const totalRatings = ratingsData.ratings || 0;
    const histogram = ratingsData.histogram || {};
    const histogramWithPercentages = Object.entries(histogram).reduce((acc, [rating, count]) => {
      acc[rating] = {
        count,
        percentage: totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) + '%' : '0.0%',
      };
      return acc;
    }, {} as Record<string, { count: number; percentage: string }>);

    // Add ratings data to the response
    const ratingsWithPercentages = {
      total: totalRatings,
      average: appData.score,
      histogram: histogramWithPercentages,
    };

    return res.json({ ...appData, ratings: ratingsWithPercentages });
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

    const parser = new Parser();
    const csv = parser.parse(results);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reviews-${id}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
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
