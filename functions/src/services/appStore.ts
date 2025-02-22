import { Collection, Sort } from 'app-store-client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: google-play-scraper works with default import despite the type error
import gplay from 'google-play-scraper';
import type { collection as PlayStoreCollection, category as PlayStoreCategory } from 'google-play-scraper';
import * as logger from 'firebase-functions/logger';
import { unifyAppStoreResults, unifyReviews } from '../utils/utils.js';
import { getCountryCode } from '../utils/countries.js';
import { appStoreClient } from '../index.js';
import { UnifiedReview } from '../utils/types.js';
import { STORES } from '../utils/stores.js';

export const fetchAppStoreReviews = async (id: string, country: string, lang: string, limit: number):
  Promise<UnifiedReview[]> => {
  try {
    let reviews: UnifiedReview[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore && reviews.length < limit) {
      const results = await appStoreClient.reviews({
        id: id.toString(),
        country: getCountryCode(country),
        language: lang,
        page,
        sort: Sort.RECENT,
      });
      if (results && results.length > 0) {
        reviews = reviews.concat(results.map(review => ({
          ...review,
          store: STORES.APP_STORE,
          rating: review.score, // Map App Store's 'score' to 'rating'
        })));
        page++;
      } else {
        hasMore = false;
      }
    }
    return reviews;
  } catch (error) {
    logger.error('Error fetching App Store reviews:', error);
    throw error;
  }
};

export const fetchPlayStoreReviews = async (id: string, lang: string, limit: number): Promise<UnifiedReview[]> => {
  try {
    const reviews = await gplay.reviews({
      appId: id,
      lang,
      num: limit,
    });
    return reviews.data.map((review: { id: string; userName: string; text: string;
      score: number; version?: string; date: string; url?: string }): UnifiedReview => ({
      id: review.id,
      userName: review.userName,
      text: review.text,
      score: review.score,
      version: review.version,
      updated: review.date,
      userUrl: review.url,
      title: '',
      rating: review.score,
      store: 'playstore' as const,
    }));
  } catch (error) {
    logger.error('Error fetching Play Store reviews:', error);
    throw error;
  }
};

export const fetchReviews = async (id: string, store: string, lang: string,
  country: string, limit: number): Promise<UnifiedReview[]> => {
  if (store === 'appstore') {
    const reviews = await fetchAppStoreReviews(id, country, lang, limit);
    return unifyReviews(reviews, 'appstore');
  } else if (store === 'playstore') {
    const reviews = await fetchPlayStoreReviews(id, lang, limit);
    return unifyReviews(reviews, 'playstore');
  }
  throw new Error('Invalid store specified');
};

export const searchApps = async (term: string, country: string, lang: string) => {
  try {
    const [appStoreResults, playStoreResults] = await Promise.all([
      appStoreClient.search({ 
        term, 
        country: getCountryCode(country), 
        language: lang, 
      }).catch((error: unknown) => {
        logger.error('Error searching App Store:', error);
        return [];
      }),
      gplay.search({ 
        term, 
        lang, 
        country,
        num: 50, // Limit results to 50 apps
      }).catch((error: unknown) => {
        logger.error('Error searching Play Store:', error);
        return [];
      }),
    ]);

    // Combine results from both stores into a single array
    return [
      ...unifyAppStoreResults(appStoreResults || [], 'appstore'),
      ...unifyAppStoreResults(playStoreResults || [], 'playstore'),
    ];
  } catch (error) {
    logger.error('Error in search:', error);
    throw error;
  }
};

export const fetchSimilarApps = async (id: string, store: string, country: string, lang: string) => {
  try {
    if (store === STORES.APP_STORE) {
      // Get app details first to get the genre
      const app = await appStoreClient.app({ id, country: getCountryCode(country), language: lang });
      if (!app) {
        throw new Error('App not found');
      }

      // Get similar apps from the same genre
      // Since we can't get the genre directly, we'll just get top free apps
      const similarApps = await appStoreClient.list({
        collection: Collection.TOP_FREE_IOS,
        country: getCountryCode(country),
        language: lang,
      });

      // Filter out the original app and return the first 10 similar apps
      return unifyAppStoreResults(
        similarApps.filter(a => a.id !== id).slice(0, 10),
        'appstore'
      );
    } else if (store === STORES.PLAY_STORE) {
      const similarApps = await gplay.similar({
        appId: id,
        lang,
        country,
      });
      return unifyAppStoreResults(similarApps.slice(0, 10), 'playstore');
    }
    throw new Error('Invalid store specified');
  } catch (error) {
    logger.error('Error fetching similar apps:', error);
    throw error;
  }
};

// Helper function to estimate rating distribution based on average rating
function calculateEstimatedDistribution(total: number, average: number): number[] {
  if (total === 0 || average === 0) return [0, 0, 0, 0, 0];
  
  // This is a simple estimation algorithm that creates a bell curve around the average
  const distribution = new Array(5).fill(0);
  const avgIndex = Math.round(average) - 1;
  
  // Distribute ratings in a bell curve pattern
  const totalToDistribute = total;
  const weights = [0.1, 0.2, 0.4, 0.2, 0.1]; // Bell curve weights
  
  // Shift weights based on average rating
  const shift = avgIndex - 2; // 2 is the middle index
  const shiftedWeights = weights.map((_, i) => {
    const newIndex = i - shift;
    if (newIndex < 0 || newIndex >= weights.length) return 0.1;
    return weights[newIndex];
  });
  
  // Apply weights
  for (let i = 0; i < 5; i++) {
    distribution[i] = Math.round(totalToDistribute * shiftedWeights[i]);
  }
  
  // Adjust to match total
  const currentTotal = distribution.reduce((a, b) => a + b, 0);
  if (currentTotal !== total) {
    const diff = total - currentTotal;
    distribution[avgIndex] += diff; // Add/subtract difference from the average rating bucket
  }
  
  return distribution;
}

export const fetchAppDetails = async (id: string, store: string, country: string, lang: string) => {
  try {
    if (store === STORES.APP_STORE) {
      // Fetch app details and ratings
      logger.info('Fetching App Store details for:', { id, country: getCountryCode(country), language: lang });
      
      const appResponse = await appStoreClient.app({ id, country: getCountryCode(country), language: lang });
      
      // Debug log the raw response
      logger.info('Raw App Store response:', JSON.stringify(appResponse));
      
      // Process ratings data
      const appData = appResponse as any;
      
      // Try different paths where ratings might be found
      const possiblePaths = [
        appData?.attributes,
        appData?.data?.attributes,
        appData?.results?.[0],
        appData,
      ];
      
      let ratingData = null;
      for (const path of possiblePaths) {
        if (path?.userRating || path?.averageUserRating) {
          ratingData = path;
          break;
        }
      }
      
      logger.info('Found rating data at:', ratingData);
      
      // Extract ratings from the response
      const totalRatings = ratingData?.userRatingCount || ratingData?.ratingCount || 0;
      const average = ratingData?.averageUserRating || ratingData?.averageRating || 0;
      
      // Since we don't have distribution data, we'll estimate it based on the average
      // This is not ideal but better than showing all zeros
      const estimatedDistribution = calculateEstimatedDistribution(totalRatings, average);
      
      // Convert distribution to our standard format
      const histogramWithPercentages = {} as Record<string, { count: number; percentage: string }>;
      
      // App Store ratings are 1-5 stars
      for (let i = 1; i <= 5; i++) {
        const count = estimatedDistribution[i - 1];
        histogramWithPercentages[i] = {
          count,
          percentage: totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) + '%' : '0.0%',
        };
      }

      const ratings = {
        total: totalRatings,
        average,
        histogram: histogramWithPercentages,
      };

      // Create a unified app object with ratings
      const appWithRatings = {
        ...appResponse,
        ratings,
      };
      
      return unifyAppStoreResults([appWithRatings], 'appstore')[0];
    } else if (store === STORES.PLAY_STORE) {
      const app = await gplay.app({
        appId: id,
        lang,
        country,
        throttle: 10, // Add small delay to avoid rate limiting
      });

      // Process ratings data
      const totalRatings = app.ratings || 0;
      const score = app.score || 0;
      
      // Convert Play Store histogram (1-5 keys) to match format
      const histogram = app.histogram || {};
      const histogramWithPercentages = Object.entries(histogram).reduce((acc, [rating, count]) => {
        const numericCount = typeof count === 'number' ? count : 0;
        acc[rating] = {
          count: numericCount,
          percentage: totalRatings > 0 ? ((numericCount / totalRatings) * 100).toFixed(1) + '%' : '0.0%',
        };
        return acc;
      }, {} as Record<string, { count: number; percentage: string }>);

      // Ensure we have all rating levels (1-5)
      for (let i = 1; i <= 5; i++) {
        if (!histogramWithPercentages[i]) {
          histogramWithPercentages[i] = {
            count: 0,
            percentage: '0.0%',
          };
        }
      }

      const appWithRatings = {
        ...app,
        score,
        ratings: {
          total: totalRatings,
          average: score,
          histogram: histogramWithPercentages,
        },
      };

      return unifyAppStoreResults([appWithRatings], 'playstore')[0];
    }
    throw new Error('Invalid store specified');
  } catch (error) {
    logger.error('Error fetching app details:', error);
    throw error;
  }
};

// Map our collection types to app-store-client collection types
const APP_STORE_COLLECTION_MAP = {
  'newapplications': Collection.NEW_IOS,
  'newpaidapplications': Collection.NEW_PAID_IOS,
  'newfreeapplications': Collection.NEW_FREE_IOS,
  'topgrossingapplications': Collection.TOP_GROSSING_IOS,
  'toppaidapplications': Collection.TOP_PAID_IOS,
  'topfreeapplications': Collection.TOP_FREE_IOS,
} as const;

// Map our collection types to google-play-scraper collection types
const PLAY_STORE_COLLECTION_MAP: Record<string, PlayStoreCollection> = {
  'topselling_free': gplay.collection.TOP_FREE,
  'topselling_paid': gplay.collection.TOP_PAID,
  'topgrossing': gplay.collection.GROSSING,
};

export const fetchCollectionApps = async (type: string, store: string,
  country: string, lang: string, limit: number, developerId?: string) => {
  try {
    if (store === STORES.APP_STORE) {
      if (type === 'developer' && developerId) {
        const apps = await appStoreClient.appsByDeveloper({
          devId: developerId,
          country: getCountryCode(country),
          language: lang,
        });
        // Only log error cases for developer apps
        // Skip debug logging
        return unifyAppStoreResults(apps?.slice(0, limit) || [], STORES.APP_STORE);
      }

      if (type === 'category' && developerId) {
        const apps = await appStoreClient.list({
          collection: Collection.TOP_FREE_IOS,
          country: getCountryCode(country),
          language: lang,
          category: parseInt(developerId),
        });
        return unifyAppStoreResults(apps?.slice(0, limit) || [], STORES.APP_STORE);
      }

      // Map the collection type to app-store-client format
      const mappedType = APP_STORE_COLLECTION_MAP[type as keyof typeof APP_STORE_COLLECTION_MAP];
      if (!mappedType) {
        logger.error(`Invalid App Store collection type: ${type}. Available types:`,
          Object.keys(APP_STORE_COLLECTION_MAP));
        throw new Error(`Invalid App Store collection type: ${type}`);
      }

      const collection = mappedType as Collection;
      // Skip info logging for collection fetching
      
      try {
        const apps = await appStoreClient.list({
          collection,
          country: getCountryCode(country),
          language: lang,
        });
        // Skip info logging for collection results
        
        if (!apps || !Array.isArray(apps)) {
          logger.error('Invalid response from app store client:', apps);
          throw new Error('Invalid response from app store client');
        }
        
        if (apps.length === 0) {
          logger.warn('No apps returned from collection');
          return [];
        }
        
        // Skip debug logging of responses
        
        return unifyAppStoreResults(apps.slice(0, limit), STORES.APP_STORE);
      } catch (error) {
        logger.error('Error fetching from app store client:', error);
        throw error;
      }
    } else if (store === STORES.PLAY_STORE) {
      if (type === 'developer' && developerId) {
        try {
          const apps = await gplay.developer({ devId: developerId, country, lang, num: limit });
          if (!apps || !Array.isArray(apps)) {
            logger.error('Invalid response from Play Store developer API:', apps);
            return [];
          }
          return unifyAppStoreResults(apps, STORES.PLAY_STORE);
        } catch (error) {
          // If developer not found, return empty array instead of throwing
          if (error && typeof error === 'object' && 'message' in error && 
              (error.message as string).includes('not found')) {
            logger.warn(`Developer ${developerId} not found in Play Store`);
            return [];
          }
          throw error;
        }
      }

      if (type === 'category' && developerId) {
        const apps = await gplay.list({
          category: developerId as PlayStoreCategory,
          collection: gplay.collection.TOP_FREE,
          country,
          lang,
          num: limit,
        });
        return unifyAppStoreResults(apps, STORES.PLAY_STORE);
      }

      // Map the collection type to google-play-scraper format
      const mappedType = PLAY_STORE_COLLECTION_MAP[type as keyof
        typeof PLAY_STORE_COLLECTION_MAP] as PlayStoreCollection;
      if (!mappedType) {
        logger.error(`Invalid Play Store collection type: ${type}. Available types:`,
          Object.keys(PLAY_STORE_COLLECTION_MAP));
        throw new Error(`Invalid Play Store collection type: ${type}`);
      }

      // Skip info logging for Play Store collection fetching
      try {
        const apps = await gplay.list({
          collection: mappedType as any, // TODO: Remove this cast once types are fixed
          country,
          lang,
          num: limit,
        });

        if (!apps || !Array.isArray(apps)) {
          logger.error('Invalid response from Play Store:', apps);
          throw new Error('Invalid response from Play Store');
        }

        if (apps.length === 0) {
          logger.warn('No apps returned from Play Store collection');
          return [];
        }

        // Skip debug logging of Play Store data
        return unifyAppStoreResults(apps, STORES.PLAY_STORE);
      } catch (error) {
        logger.error('Error fetching from Play Store:', error);
        throw error;
      }
    }
    throw new Error('Invalid store specified');
  } catch (error) {
    logger.error('Error fetching collection:', error);
    throw error;
  }
};
