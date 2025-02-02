import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import express from 'express';
import cors from 'cors';
import { AppStoreClient, Country } from 'app-store-client';
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

// Enable CORS
app.use(cors());

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

    return res.json({ ...appData, ratings: ratingsData });
  } catch (error) {
    return next(error);
  }
});

app.get('/collection/:id', validateCommonParams, async (
  req: ValidatedRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams!;

    const results = await client.app({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang,
    });

    return res.json(results);
  } catch (error) {
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
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  region: 'us-central1',
}, app);
