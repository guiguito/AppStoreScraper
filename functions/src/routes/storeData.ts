import express from 'express';
import * as logger from 'firebase-functions/logger';
import { db } from '../index.js';
import { 
  fetchAllStoreData, 
  fetchAppStoreCategories, 
  fetchPlayStoreCategories, 
  fetchStoreCollections 
} from '../services/storeData.js';
import { DateTime } from 'luxon';
import { ValidatedRequest } from '../utils/types.js';
import { STORES, StoreType } from '../utils/stores.js';

const storeDataRouter = express.Router();

/**
 * Saves a document to Firestore with timestamp information
 * @param path The document path
 * @param data The data to save
 */
async function saveDocument(path: string, data: any) {
  const dataToSave = {
    ...data,
    timestamp: new Date(),
    lastUpdated: DateTime.now().toISO(),
  };
  
  await db.doc(path).set(dataToSave, { merge: true });
  logger.info(`Successfully saved data to ${path}`);
}

// GET /store-data - Get all store data (categories and collections)
storeDataRouter.get('/', async (req: ValidatedRequest, res) => {
  try {
    // Get the latest document (today's date)
    const currentDate = DateTime.now().toFormat('yyyy-MM-dd');
    const docRef = db.doc(`storesdata/${currentDate}/summary`);
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // If today's document doesn't exist, fetch the data
      const storeData = await fetchAllStoreData();
      return res.status(200).json(storeData);
    }
    
    return res.status(200).json(doc.data());
  } catch (error) {
    logger.error('Error retrieving store data:', error);
    return res.status(500).json({ error: 'Failed to retrieve store data' });
  }
});

// GET /store-data/categories/:store - Get categories for a specific store
storeDataRouter.get('/categories/:store', async (req: ValidatedRequest, res) => {
  try {
    const { store } = req.params;
    
    if (!Object.values(STORES).includes(store as StoreType)) {
      return res.status(400).json({ error: 'Invalid store. Use "appstore" or "playstore"' });
    }
    
    // Get the latest document (today's date)
    const currentDate = DateTime.now().toFormat('yyyy-MM-dd');
    const collectionRef = db.collection(`storesdata/${currentDate}/${store}/categories`);
    
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      // If categories don't exist, fetch them
      let categories;
      if (store === STORES.APP_STORE) {
        categories = await fetchAppStoreCategories();
      } else {
        categories = await fetchPlayStoreCategories();
      }
      return res.status(200).json(categories);
    }
    
    const categories = snapshot.docs.map(doc => doc.data());
    return res.status(200).json(categories);
  } catch (error) {
    logger.error('Error retrieving categories:', error);
    return res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// GET /store-data/collections/:store - Get collections for a specific store
storeDataRouter.get('/collections/:store', async (req: ValidatedRequest, res) => {
  try {
    const { store } = req.params;
    
    if (!Object.values(STORES).includes(store as StoreType)) {
      return res.status(400).json({ error: 'Invalid store. Use "appstore" or "playstore"' });
    }
    
    // Get the latest document (today's date)
    const currentDate = DateTime.now().toFormat('yyyy-MM-dd');
    const collectionRef = db.collection(`storesdata/${currentDate}/${store}/collections`);
    
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      // If collections don't exist, fetch them
      const collections = await fetchStoreCollections();
      return res.status(200).json(collections[store as StoreType]);
    }
    
    const storeCollections = snapshot.docs.map(doc => doc.data());
    return res.status(200).json(storeCollections);
  } catch (error) {
    logger.error('Error retrieving collections:', error);
    return res.status(500).json({ error: 'Failed to retrieve collections' });
  }
});

// POST /store-data/sync - Manually trigger store data sync
storeDataRouter.post('/sync', async (req: ValidatedRequest, res) => {
  try {
    // Get current date in YYYY-MM-DD format for document paths
    const currentDate = DateTime.now().toFormat('yyyy-MM-dd');
    
    // Fetch all data
    const [appStoreCategories, playStoreCategories, collections] = await Promise.all([
      fetchAppStoreCategories(),
      fetchPlayStoreCategories(),
      fetchStoreCollections(),
    ]);
    
    // Create a batch of promises for saving documents
    const savePromises = [];
    
    // Save summary document with all data
    const summaryPath = `storesdata/${currentDate}/summary`;
    savePromises.push(saveDocument(summaryPath, {
      categories: {
        [STORES.APP_STORE]: appStoreCategories,
        [STORES.PLAY_STORE]: playStoreCategories,
      },
      collections,
      manualSync: true,
    }));
    
    // Save individual App Store categories
    for (const category of appStoreCategories) {
      const path = `storesdata/${currentDate}/${STORES.APP_STORE}/categories/${category.id}`;
      savePromises.push(saveDocument(path, {
        ...category,
        store: STORES.APP_STORE,
      }));
    }
    
    // Save individual Play Store categories
    for (const category of playStoreCategories) {
      const path = `storesdata/${currentDate}/${STORES.PLAY_STORE}/categories/${category.id}`;
      savePromises.push(saveDocument(path, {
        ...category,
        store: STORES.PLAY_STORE,
      }));
    }
    
    // Save individual App Store collections
    for (const collection of collections[STORES.APP_STORE]) {
      const path = `storesdata/${currentDate}/${STORES.APP_STORE}/collections/${collection.id}`;
      savePromises.push(saveDocument(path, {
        ...collection,
        store: STORES.APP_STORE,
      }));
    }
    
    // Save individual Play Store collections
    for (const collection of collections[STORES.PLAY_STORE]) {
      const path = `storesdata/${currentDate}/${STORES.PLAY_STORE}/collections/${collection.id}`;
      savePromises.push(saveDocument(path, {
        ...collection,
        store: STORES.PLAY_STORE,
      }));
    }
    
    // Execute all save operations
    await Promise.all(savePromises);
    
    logger.info(`Successfully completed store data sync for ${currentDate}`);
    return res.status(200).json({ 
      success: true, 
      message: `Store data saved for ${currentDate}`,
      path: `storesdata/${currentDate}`,
    });
  } catch (error) {
    logger.error('Error in manual store data sync:', error);
    return res.status(500).json({ error: 'Failed to sync store data' });
  }
});

export default storeDataRouter;
