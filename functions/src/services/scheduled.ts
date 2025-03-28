import * as logger from 'firebase-functions/logger';
import { db } from '../index.js';
import { 
  fetchAppStoreCategories, 
  fetchPlayStoreCategories, 
  fetchStoreCollections, 
} from './storeData.js';
import { DateTime } from 'luxon';
import { STORES, COLLECTION_TYPES } from '../utils/stores.js';
import { TOP_30_COUNTRIES } from '../utils/countries.js';

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

export const storeDataSyncImplementation = async (context: any) => {
  // Log the context information for debugging purposes
  logger.info('Function triggered with context', { contextId: context?.eventId });
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
    
    // Get all country codes we support
    const countryCodes = Object.keys(TOP_30_COUNTRIES);
    const languages = ['en']; // Default language for now, can be expanded later
    
    logger.info(`Fetching data for ${countryCodes.length} countries: ${countryCodes.join(', ')}`);
    
    // Process each country
    for (const countryCode of countryCodes) {
      logger.info(`Processing country: ${countryCode} (${TOP_30_COUNTRIES[countryCode]})`);
      
      for (const language of languages) {
        // Save individual App Store categories and their apps for this country
        for (const category of appStoreCategories) {
          try {
            const categoryPath = `storesdata/${currentDate}/${STORES.APP_STORE}/${countryCode}/category/${category.id}`;
            
            logger.debug(`Fetching App Store category ${category.id} for ${countryCode}`);
            const categoryApps = await fetchCollectionApps(
              COLLECTION_TYPES.CATEGORY,
              STORES.APP_STORE, 
              countryCode.toLowerCase(), 
              language, 
              200, 
              category.id.toString()
            );
            
            if (categoryApps && categoryApps.length > 0) {
              savePromises.push(saveDocument(categoryPath, {
                ...category,
                country: countryCode,
                language,
                apps: categoryApps,
                count: categoryApps.length,
              }));
            } else {
              savePromises.push(saveDocument(categoryPath, {
                ...category,
                country: countryCode,
                language,
                count: 0,
              }));
            }
          } catch (error) {
            logger.error(
              `Error fetching apps for App Store category ${category.id} in ${countryCode}:`, 
              error
            );
            // Continue with other categories even if one fails
          }
        }
        
        // Save individual Play Store categories and their apps for this country
        for (const category of playStoreCategories) {
          try {
            const categoryPath = `storesdata/${currentDate}/${STORES.PLAY_STORE}/` +
              `${countryCode}/category/${category.id}`;
            
            logger.debug(`Fetching Play Store category ${category.id} for ${countryCode}`);
            const categoryApps = await fetchCollectionApps(
              COLLECTION_TYPES.CATEGORY, 
              STORES.PLAY_STORE,
              countryCode.toLowerCase(), 
              language, 
              200, 
              category.id
            );
            
            if (categoryApps && categoryApps.length > 0) {
              savePromises.push(saveDocument(categoryPath, {
                ...category,
                country: countryCode,
                language,
                apps: categoryApps,
                count: categoryApps.length,
              }));
            } else {
              savePromises.push(saveDocument(categoryPath, {
                ...category,
                country: countryCode,
                language,
                count: 0,
              }));
            }
          } catch (error) {
            logger.error(
              `Error fetching apps for Play Store category ${category.id} in ${countryCode}:`
              + ` ${error}`
            );
            // Continue with other categories even if one fails
          }
        }
        
        // Save individual App Store collections for this country
        for (const collection of collections[STORES.APP_STORE]) {
          const path = `storesdata/${currentDate}/${STORES.APP_STORE}/${countryCode}/collection/${collection.id}`;
          try {
            logger.debug(`Fetching App Store collection ${collection.id} for ${countryCode}`);
            const collectionApps = await fetchCollectionApps(
              collection.id,
              STORES.APP_STORE, 
              countryCode.toLowerCase(), 
              language, 
              200
            );
            
            if (collectionApps && collectionApps.length > 0) {
              savePromises.push(saveDocument(path, {
                ...collection,
                store: STORES.APP_STORE,
                country: countryCode,
                language,
                apps: collectionApps,
                count: collectionApps.length,
              }));
            } else {
              savePromises.push(saveDocument(path, {
                ...collection,
                store: STORES.APP_STORE,
                country: countryCode,
                language,
                count: 0,
              }));
            }
          } catch (error) {
            logger.error(`Error fetching apps for App Store collection ${collection.id} in ${countryCode}:`, error);
            // Save the collection without apps if there's an error
            savePromises.push(saveDocument(path, {
              ...collection,
              store: STORES.APP_STORE,
              country: countryCode,
              language,
              count: 0,
            }));
          }
        }
        
        // Save individual Play Store collections for this country
        for (const collection of collections[STORES.PLAY_STORE]) {
          const path = `storesdata/${currentDate}/${STORES.PLAY_STORE}/${countryCode}/collection/${collection.id}`;
          try {
            logger.debug(`Fetching Play Store collection ${collection.id} for ${countryCode}`);
            const collectionApps = await fetchCollectionApps(
              collection.id,
              STORES.PLAY_STORE, 
              countryCode.toLowerCase(), 
              language, 
              200
            );
            
            if (collectionApps && collectionApps.length > 0) {
              savePromises.push(saveDocument(path, {
                ...collection,
                store: STORES.PLAY_STORE,
                country: countryCode,
                language,
                apps: collectionApps,
                count: collectionApps.length,
              }));
            } else {
              savePromises.push(saveDocument(path, {
                ...collection,
                store: STORES.PLAY_STORE,
                country: countryCode,
                language,
                count: 0,
              }));
            }
          } catch (error) {
            logger.error(`Error fetching apps for Play Store collection ${collection.id} in ${countryCode}:`, error);
            // Save the collection without apps if there's an error
            savePromises.push(saveDocument(path, {
              ...collection,
              store: STORES.PLAY_STORE,
              country: countryCode,
              language,
              count: 0,
            }));
          }
        }
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
