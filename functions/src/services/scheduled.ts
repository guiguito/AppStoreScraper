import * as logger from 'firebase-functions/logger';
import { db } from '../index.js';
import { 
  fetchAppStoreCategories, 
  fetchPlayStoreCategories, 
  fetchStoreCollections, 
} from './storeData.js';
import { DateTime } from 'luxon';
import { STORES, COLLECTION_TYPES } from '../utils/stores.js';

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
// Import the fetchCollectionApps function from appStore.js
import { fetchCollectionApps } from './appStore.js';

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
    
    // Save individual App Store categories and their apps
    for (const category of appStoreCategories) {
      // Fetch and save apps for this category
      try {
        const categoryPath = `storesdata/${currentDate}/${STORES.APP_STORE}/category-${category.id}`;
        // Use US as the default country and English as the default language
        const categoryApps = await fetchCollectionApps(COLLECTION_TYPES.CATEGORY,
          STORES.APP_STORE, 'us', 'en', 200, category.id.toString());     
        if (categoryApps && categoryApps.length > 0) {
          savePromises.push(saveDocument(categoryPath, {
            ...category,
            apps: categoryApps,
            count: categoryApps.length,
          }));
        }else{
          savePromises.push(saveDocument(categoryPath, {
            ...category,
          }));
        }
      } catch (error) {
        logger.error(`Error fetching apps for App Store category ${category.id}:`, error);
        // Continue with other categories even if one fails
      }
    }
    
    // Save individual Play Store categories and their apps
    for (const category of playStoreCategories) {
      // Fetch and save apps for this category
      try {
        const categoryPath = `storesdata/${currentDate}/${STORES.PLAY_STORE}/category-${category.id}`;
        // Use US as the default country and English as the default language
        const categoryApps = await fetchCollectionApps(COLLECTION_TYPES.CATEGORY, STORES.PLAY_STORE,
          'us', 'en', 200, category.id);
   
        if (categoryApps && categoryApps.length > 0) {
          savePromises.push(saveDocument(categoryPath, {
            ...category,
            apps: categoryApps,
            count: categoryApps.length,
          }));
        }else{
          savePromises.push(saveDocument(categoryPath, {
            ...category,
          }));
        }
      } catch (error) {
        logger.error(`Error fetching apps for Play Store category ${category.id}:`, error);
        // Continue with other categories even if one fails
      }
    }
    
    // Save individual App Store collections
    for (const collection of collections[STORES.APP_STORE]) {
      const path = `storesdata/${currentDate}/${STORES.APP_STORE}/collection-${collection.id}`;
      try {
        // Fetch and save apps for this collection
        const collectionApps = await fetchCollectionApps(collection.id,
          STORES.APP_STORE, 'us', 'en', 200);
        
        if (collectionApps && collectionApps.length > 0) {
          savePromises.push(saveDocument(path, {
            ...collection,
            store: STORES.APP_STORE,
            apps: collectionApps,
            count: collectionApps.length,
          }));
        } else {
          savePromises.push(saveDocument(path, {
            ...collection,
            store: STORES.APP_STORE,
          }));
        }
      } catch (error) {
        logger.error(`Error fetching apps for App Store collection ${collection.id}:`, error);
        // Save the collection without apps if there's an error
        savePromises.push(saveDocument(path, {
          ...collection,
          store: STORES.APP_STORE,
        }));
      }
    }
    
    // Save individual Play Store collections
    for (const collection of collections[STORES.PLAY_STORE]) {
      const path = `storesdata/${currentDate}/${STORES.PLAY_STORE}/collection-${collection.id}`;
      try {
        // Fetch and save apps for this collection
        const collectionApps = await fetchCollectionApps(collection.id,
          STORES.PLAY_STORE, 'us', 'en', 200);
        
        if (collectionApps && collectionApps.length > 0) {
          savePromises.push(saveDocument(path, {
            ...collection,
            store: STORES.PLAY_STORE,
            apps: collectionApps,
            count: collectionApps.length,
          }));
        } else {
          savePromises.push(saveDocument(path, {
            ...collection,
            store: STORES.PLAY_STORE,
          }));
        }
      } catch (error) {
        logger.error(`Error fetching apps for Play Store collection ${collection.id}:`, error);
        // Save the collection without apps if there's an error
        savePromises.push(saveDocument(path, {
          ...collection,
          store: STORES.PLAY_STORE,
        }));
      }
    }
    
    // Execute all save operations
    await Promise.all(savePromises);
    
    logger.info(`Successfully completed store data sync for ${currentDate}`);
  } catch (error) {
    logger.error('Error in scheduled store data sync:', error);
    throw error;
  }
};
