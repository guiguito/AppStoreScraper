import { Router } from 'express';
import { Parser } from 'json2csv';
import { ValidatedRequest } from '../utils/types.js';
import { fetchReviews } from '../services/appStore.js';
import { analyzeSentiment } from '../services/sentiment.js';
import { isValidStore } from '../utils/stores.js';

export const reviewsRouter = Router();

reviewsRouter.get('/reviews/:store/:id', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const requestedLimit = req.query.limit?.toString();
    const limit = Math.min(parseInt(requestedLimit || '20'), 100);

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const reviews = await fetchReviews(id, store, lang, country, limit);
    // Skip success logging
    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
});

reviewsRouter.get('/reviews/:store/:id/sentiment', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const requestedLimit = req.query.limit?.toString();
    const limit = Math.min(parseInt(requestedLimit || '100'), 200);

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const reviews = await fetchReviews(id, store, lang, country, limit);
    const analysis = await analyzeSentiment(id, country, reviews, startDate, endDate);
    
    return res.json(analysis);
  } catch (error) {
    return next(error);
  }
});

reviewsRouter.get('/reviews/:store/:id/csv', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;
    const limit = 200;

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const reviews = await fetchReviews(id, store, lang, country, limit);
    
    const parser = new Parser({
      fields: ['id', 'userName', 'title', 'text', 'rating', 'version', 'updated', 'store'],
    });
    
    const csv = parser.parse(reviews);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`${id}-reviews.csv`);
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
});
