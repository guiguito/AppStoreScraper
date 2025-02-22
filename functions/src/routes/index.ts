import { Router } from 'express';
import { searchRouter } from './search.js';
import { reviewsRouter } from './reviews.js';
import { appsRouter } from './apps.js';
import { corsMiddleware, validateCommonParams, errorHandler } from '../middleware.js';

const router = Router();

// Apply global middleware
router.use(corsMiddleware);
router.use(validateCommonParams);

// Mount route handlers
router.use(searchRouter);
router.use(reviewsRouter);
router.use(appsRouter);

// Error handling middleware should be last
router.use(errorHandler);

export default router;
