import { Router } from 'express';
import { ValidatedRequest } from '../utils/types.js';
import { fetchAppDetails, fetchCollectionApps, fetchSimilarApps } from '../services/appStore.js';
import { isValidStore } from '../utils/stores.js';

export const appsRouter = Router();

// GET /similar/:store/:id - Get similar apps
appsRouter.get('/similar/:store/:id', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const apps = await fetchSimilarApps(id, store, country, lang);
    return res.json(apps);
  } catch (error) {
    return next(error);
  }
});

// GET /app/:store/:id - Get app details
appsRouter.get('/app/:store/:id', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const app = await fetchAppDetails(id, store, country, lang);
    return res.json(app);
  } catch (error) {
    return next(error);
  }
});

// GET /collection/:store/:type - Get apps from a collection
appsRouter.get('/collection/:store/:type', async (req: ValidatedRequest, res, next) => {
  try {
    const { store, type } = req.params;
    const { lang, country } = req.validatedParams!;
    const requestedLimit = req.query.limit?.toString();
    const limit = Math.min(parseInt(requestedLimit || '20'), 100);

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'Type parameter is required' });
    }

    const results = await fetchCollectionApps(type, store, country, lang, limit);
    // Skip success logging
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

// GET /developer-apps/:store/:id - Get apps by developer
appsRouter.get('/developer-apps/:store/:id', async (req: ValidatedRequest, res, next) => {
  try {
    const { id, store } = req.params;
    const { lang, country } = req.validatedParams!;

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    const results = await fetchCollectionApps('developer', store, country, lang, 100, id);
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

// GET /category-apps/:store - Get apps from a category
appsRouter.get('/category-apps/:store', async (req: ValidatedRequest, res, next) => {
  try {
    const { store } = req.params;
    const { lang, country } = req.validatedParams!;
    const { categoryId } = req.query;
    const requestedLimit = req.query.limit?.toString();
    const limit = Math.min(parseInt(requestedLimit || '20'), 100);

    if (!isValidStore(store)) {
      return res.status(400).json({ error: 'Invalid store specified' });
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({ error: 'categoryId parameter is required' });
    }

    const results = await fetchCollectionApps('category', store, country, lang, limit, categoryId);
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});
