import { Request, Response, NextFunction } from 'express';
import * as logger from 'firebase-functions/logger';
import { ValidatedRequest } from './utils/types.js';
import { isValidCountry } from './utils/countries.js';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

export const validateCommonParams = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const validatedReq = req as ValidatedRequest;
  const country = (req.query.country || 'US') as string;
  const lang = (req.query.lang || 'en') as string;

  if (!isValidCountry(country)) {
    return res.status(400).json({
      error: `Invalid country code: ${country}. Please use a valid ISO 3166-1 alpha-2 country code.`,
    });
  }

  validatedReq.validatedParams = { country, lang };
  next();
};

interface ApiError extends Error {
  response?: {
    status?: number;
  };
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  logger.error('Error in request:', err);

  if (err.response?.status === 404) {
    return res.status(404).json({
      error: 'Resource not found',
    });
  }

  return res.status(500).json({
    error: err.message || 'An unexpected error occurred',
  });
};
