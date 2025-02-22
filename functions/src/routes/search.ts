import { Router } from 'express';
import { ValidatedRequest } from '../utils/types.js';
import { searchApps } from '../services/appStore.js';

export const searchRouter = Router();

searchRouter.get('/search', async (req: ValidatedRequest, res, next) => {
  try {
    const { term } = req.query;
    const { lang, country } = req.validatedParams!;

    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const results = await searchApps(term.toString(), country, lang);
    // Skip success logging
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});
