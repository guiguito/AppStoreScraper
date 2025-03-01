import { Collection, Country } from 'app-store-client';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: google-play-scraper works with default import despite the type error
import gplay from 'google-play-scraper';
import * as logger from 'firebase-functions/logger';
import { appStoreClient } from '../index.js';
import { STORES } from '../utils/stores.js';

// App Store collection mapping
const APP_STORE_COLLECTIONS = {
  'newapplications': Collection.NEW_IOS,
  'newpaidapplications': Collection.NEW_PAID_IOS,
  'newfreeapplications': Collection.NEW_FREE_IOS,
  'topgrossingapplications': Collection.TOP_GROSSING_IOS,
  'toppaidapplications': Collection.TOP_PAID_IOS,
  'topfreeapplications': Collection.TOP_FREE_IOS,
};

// Play Store collection mapping
const PLAY_STORE_COLLECTIONS = {
  'topselling_free': gplay.collection.TOP_FREE,
  'topselling_paid': gplay.collection.TOP_PAID,
  'topgrossing': gplay.collection.GROSSING,
};

// Excluded App Store category IDs (magazines)
const EXCLUDED_APP_STORE_CATEGORIES = [6021]; // 6021 is for Magazines & Newspapers

/**
 * Fetches all App Store categories
 * @returns Array of App Store categories
 */
export const fetchAppStoreCategories = async () => {
  try {
    // App Store categories need to be fetched from the API
    // We'll use the list endpoint with a specific collection to get categories
    const results = await appStoreClient.list({
      collection: Collection.TOP_FREE_IOS,
      country: Country.US,
      language: 'en',
    });

    // Extract unique categories from the results
    const categories = new Map();
    
    if (results && Array.isArray(results)) {
      for (const app of results) {
        if (app.genreIds && app.genres) {
          for (let i = 0; i < app.genreIds.length; i++) {
            const id = parseInt(app.genreIds[i]);
            // Skip excluded categories (magazines)
            if (!EXCLUDED_APP_STORE_CATEGORIES.includes(id)) {
              categories.set(id, app.genres[i]);
            }
          }
        }
      }
    }

    // Convert Map to array of objects
    return Array.from(categories).map(([id, name]) => ({
      id,
      name,
    }));
  } catch (error) {
    logger.error('Error fetching App Store categories:', error);
    return [];
  }
};

/**
 * Fetches all Play Store categories
 * @returns Array of Play Store categories
 */
export const fetchPlayStoreCategories = async () => {
  try {
    const categories = await gplay.categories();
    
    // Filter out any magazine-related categories
    const filteredCategories = categories.filter((category: string) => 
      !category.toLowerCase().includes('magazine') && 
      !category.toLowerCase().includes('news')
    );
    
    // Convert to objects with id and name
    return filteredCategories.map((category: string) => ({
      id: category,
      name: category.split('_')
        .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' '),
    }));
  } catch (error) {
    logger.error('Error fetching Play Store categories:', error);
    return [];
  }
};

/**
 * Fetches all store collections
 * @returns Object containing collections for both stores
 */
export const fetchStoreCollections = () => {
  try {
    // Format App Store collections
    const appStoreCollections = Object.entries(APP_STORE_COLLECTIONS).map(([id, value]) => ({
      id,
      name: id
        .replace(/applications/g, '')
        .split(/(?=[A-Z])/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim(),
      value,
    }));

    // Format Play Store collections
    const playStoreCollections = Object.entries(PLAY_STORE_COLLECTIONS).map(([id, value]) => ({
      id,
      name: id
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim(),
      value,
    }));

    return {
      [STORES.APP_STORE]: appStoreCollections,
      [STORES.PLAY_STORE]: playStoreCollections,
    };
  } catch (error) {
    logger.error('Error fetching store collections:', error);
    return {
      [STORES.APP_STORE]: [],
      [STORES.PLAY_STORE]: [],
    };
  }
};

/**
 * Fetches all store data (categories and collections)
 * @returns Object containing all store data
 */
export const fetchAllStoreData = async () => {
  try {
    const [appStoreCategories, playStoreCategories, collections] = await Promise.all([
      fetchAppStoreCategories(),
      fetchPlayStoreCategories(),
      fetchStoreCollections(),
    ]);

    return {
      categories: {
        [STORES.APP_STORE]: appStoreCategories,
        [STORES.PLAY_STORE]: playStoreCategories,
      },
      collections,
    };
  } catch (error) {
    logger.error('Error fetching all store data:', error);
    throw error;
  }
};
