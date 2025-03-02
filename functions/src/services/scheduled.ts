import * as logger from 'firebase-functions/logger';
import { db } from '../index.js';
import { 
  fetchAppStoreCategories, 
  fetchPlayStoreCategories, 
  fetchStoreCollections, 
} from './storeData.js';
import { DateTime } from 'luxon';
import { STORES } from '../utils/stores.js';

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

/**
 * Implementation of the scheduled function that runs every hour to save App Store and Play Store
 * categories and collections to Firestore
 */
export const storeDataSyncImplementation = async () => {
  try {
    logger.info('Starting scheduled store data sync');
    
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
  } catch (error) {
    logger.error('Error in scheduled store data sync:', error);
    throw error;
  }
};
