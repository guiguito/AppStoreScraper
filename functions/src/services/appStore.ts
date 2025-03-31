import { Collection, Sort } from 'app-store-client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: google-play-scraper works with default import despite the type error
import gplay from 'google-play-scraper';
import type { collection as PlayStoreCollection, category as PlayStoreCategory } from 'google-play-scraper';
import * as logger from 'firebase-functions/logger';
import { unifyAppStoreResults, unifyReviews } from '../utils/utils.js';
import { getCountryCode, TOP_30_COUNTRIES } from '../utils/countries.js';
import { appStoreClient } from '../index.js';
import { UnifiedReview } from '../utils/types.js';
import { STORES, COLLECTION_TYPES } from '../utils/stores.js';

export const fetchAppStoreReviews = async (id: string, country: string, lang: string, limit: number):
  Promise<UnifiedReview[]> => {
  
  // Declare variables outside the try block to ensure they are accessible in catch
  let reviews: UnifiedReview[] = [];
  let page = 0;

  try {
    logger.info(`fetchAppStoreReviews called with: id=${id}, country=${country}, lang=${lang}, limit=${limit}`); 
    let hasMore = true;
    while (hasMore && reviews.length < limit) {
      const countryCode = getCountryCode(country);
      logger.info(`Fetching App Store reviews page ${page} for id=${id}, country=${countryCode}, lang=${lang}`);
      const results = await appStoreClient.reviews({
        id: id.toString(),
        country: countryCode,
        language: lang,
        page,
        sort: Sort.RECENT,
      });
      logger.info(`Received ${results?.length ?? 0} reviews from appStoreClient for page ${page}`);
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
  } catch (error: any) {
    // Log the raw error object FIRST for better debugging
    logger.error('Raw error caught in fetchAppStoreReviews:', error);

    // Check if this is an AppNotFoundError
    const isAppNotFoundError = error.name === 'AppNotFoundError' ||
                             (error.message?.includes('App with ID') && 
                              error.message?.includes('not found'));

    if (isAppNotFoundError) {
      // If error occurred during pagination (page > 0), return what we have
      if (page > 0) { 
        logger.warn(`AppNotFoundError occurred during pagination (page ${page}) for ${id}.
          Returning ${reviews.length} reviews collected so far.`);
        return reviews; 
      } else {
        // If error occurred on the first page (page 0), app is likely genuinely not found
        logger.warn(`App not found in App Store on initial fetch (page 0): ${id}`);
        return [];
      }
    } 
    
    // For other types of errors, log and re-throw
    logger.error('Unhandled error fetching App Store reviews:', error);
    throw error;
  }
};

export const fetchPlayStoreReviews = async (id: string, country: string,
  lang: string, limit: number): Promise<UnifiedReview[]> => {
  try {
    const reviews = await gplay.reviews({
      appId: id,
      country,
      lang,
      num: limit,
    });
    const mappedReviews = reviews.data.map((review: any): UnifiedReview => ({
      id: review.id,
      userName: review.userName,
      userImage: review.userImage || '',
      date: review.date,
      score: review.score,
      scoreText: review.score?.toString() || '',
      text: review.text,
      title: '',
      url: '',
      version: review.version || '',
      replyDate: review.replyDate || '',
      replyText: review.replyText || '',
      thumbsUp: review.thumbsUp || 0,
      criteria: review.criteria || '',
      rating: review.score,
      store: STORES.PLAY_STORE,
      userUrl: review.url || '',
    }));
    return unifyReviews(mappedReviews, STORES.PLAY_STORE, id);
  } catch (error) {
    logger.error('Error fetching Play Store reviews:', error);
    throw error;
  }
};

export const fetchReviews = async (id: string, store: string, lang: string,
  country: string, limit: number): Promise<UnifiedReview[]> => {
  if (store === STORES.APP_STORE) {
    const reviews = await fetchAppStoreReviews(id, country, lang, limit);
    return unifyReviews(reviews, STORES.APP_STORE);
  } else if (store === STORES.PLAY_STORE) {
    const reviews = await fetchPlayStoreReviews(id, country, lang, limit);
    return reviews;
  }
  throw new Error('Invalid store specified');
};

export const searchAppStore = async (term: string, country: string, lang: string) => {
  try {
    const results = await appStoreClient.search({
      term,
      country: getCountryCode(country),
      language: lang,
    });
    return unifyAppStoreResults(results || [], STORES.APP_STORE);
  } catch (error) {
    logger.error('Error searching App Store:', error);
    return [];
  }
};

export const searchPlayStore = async (term: string, country: string, lang: string) => {
  try {
    const results = await gplay.search({
      term,
      lang,
      country,
      num: 50, // Limit results to 50 apps
    });
    return unifyAppStoreResults(results || [], STORES.PLAY_STORE);
  } catch (error) {
    logger.error('Error searching Play Store:', error);
    return [];
  }
};

export const searchApps = async (term: string, country: string, lang: string) => {
  try {
    const [appStoreResults, playStoreResults] = await Promise.all([
      searchAppStore(term, country, lang),
      searchPlayStore(term, country, lang),
    ]);

    return {
      appStore: appStoreResults,
      playStore: playStoreResults,
    };
  } catch (error) {
    logger.error('Error in search:', error);
    throw error;
  }
};

export const fetchSimilarApps = async (id: string, store: string, country: string, lang: string) => {
  try {
    if (store === STORES.APP_STORE) {
      // Get similar apps using the app-store-client similar endpoint
      const similarApps = await appStoreClient.similarApps({
        id,
        country: getCountryCode(country),
        language: lang,
      });

      // Filter out the original app and return the first 10 similar apps
      return unifyAppStoreResults(
        similarApps.filter(a => a.id !== id).slice(0, 10),
        STORES.APP_STORE
      );
    } else if (store === STORES.PLAY_STORE) {
      const similarApps = await gplay.similar({
        appId: id,
        lang,
        country,
      });
      return unifyAppStoreResults(similarApps.slice(0, 10), STORES.PLAY_STORE);
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

// Helper function to check app availability in different countries
async function fetchAppStoreCountries(id: string): Promise<Array<{ code: string; name: string }>> {
  const available: Array<{ code: string; name: string }> = [];
  
  await Promise.all(Object.entries(TOP_30_COUNTRIES).map(async ([code, name]) => {
    try {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${code}`);
      const data = await response.json();
      if (data.resultCount > 0) {
        available.push({ code, name });
      }
    } catch (error) {
      logger.error(`Error checking availability for ${name}:`, error);
    }
  }));

  return available;
}

export const fetchAppDetails = async (id: string, store: string, country: string, lang: string) => {
  try {
    if (store === STORES.APP_STORE) {
      logger.info('Fetching App Store details for:', { id, country: getCountryCode(country), language: lang });
      
      // Fetch app details, ratings, and privacy data in parallel
      const [appResponse, ratingsResponse, privacyResponse] = await Promise.all([
        appStoreClient.app({ id, country: getCountryCode(country), language: lang }),
        appStoreClient.ratings({ id, country: getCountryCode(country), language: lang })
          .catch(error => {
            logger.warn('Failed to fetch ratings:', error);
            return null;
          }),
        appStoreClient.privacy({ id, country: getCountryCode(country), language: lang })
          .catch(error => {
            logger.warn('Failed to fetch privacy data:', error);
            return null;
          }),
      ]);
      
      // Process ratings data
      const ratings = {
        total: appResponse?.reviews || 0,
        average: appResponse?.score || 0,
        histogram: {} as Record<string, { count: number; percentage: string }>,
      };

      // Process histogram data if available
      if (ratingsResponse?.histogram) {
        for (let i = 1; i <= 5; i++) {
          const count = ratingsResponse.histogram[i] || 0;
          ratings.histogram[i] = {
            count,
            percentage: ratings.total > 0 ? ((count / ratings.total) * 100).toFixed(1) + '%' : '0.0%',
          };
        }
      } else {
        // Fallback to estimated distribution if no histogram data
        const estimatedDistribution = calculateEstimatedDistribution(ratings.total, ratings.average);
        for (let i = 1; i <= 5; i++) {
          const count = estimatedDistribution[i - 1];
          ratings.histogram[i] = {
            count,
            percentage: ratings.total > 0 ? ((count / ratings.total) * 100).toFixed(1) + '%' : '0.0%',
          };
        }
      }

      // Fetch available countries
      const availableCountries = await fetchAppStoreCountries(id);

      // Create a unified app object with all data
      const appWithMetadata = {
        ...appResponse,
        ratings,
        privacyData: privacyResponse || {},
        availableCountries,
      };
      
      return unifyAppStoreResults([appWithMetadata], 'appstore')[0];
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

// Helper function to validate and process API responses
const validateAndProcessResponse = <T>(apps: T[] | null | undefined, storeName: string, limit: number): T[] => {
  if (!apps || !Array.isArray(apps)) {
    logger.error(`Invalid response from ${storeName}:`, apps);
    throw new Error(`Invalid response from ${storeName}`);
  }
  
  if (apps.length === 0) {
    logger.warn(`No apps returned from ${storeName} collection`);
    return [];
  }
  
  // Filter out any null or undefined entries
  const validApps = apps.filter(app => app !== null && app !== undefined);
  
  if (validApps.length < apps.length) {
    logger.warn(`Filtered out ${apps.length - validApps.length} invalid entries from ${storeName} response`);
  }
  
  if (validApps.length === 0) {
    logger.warn(`All apps were invalid in ${storeName} response`);
    return [];
  }
  
  return validApps.slice(0, limit);
};

// Map our collection types to app-store-client collection types
const APP_STORE_COLLECTION_MAP = {
  [COLLECTION_TYPES.NEW_APPLICATIONS]: Collection.NEW_IOS,
  [COLLECTION_TYPES.NEW_PAID_APPLICATIONS]: Collection.NEW_PAID_IOS,
  [COLLECTION_TYPES.NEW_FREE_APPLICATIONS]: Collection.NEW_FREE_IOS,
  [COLLECTION_TYPES.TOP_GROSSING_APPLICATIONS]: Collection.TOP_GROSSING_IOS,
  [COLLECTION_TYPES.TOP_PAID_APPLICATIONS]: Collection.TOP_PAID_IOS,
  [COLLECTION_TYPES.TOP_FREE_APPLICATIONS]: Collection.TOP_FREE_IOS,
} as const;

// Map our collection types to google-play-scraper collection types
const PLAY_STORE_COLLECTION_MAP: Record<string, PlayStoreCollection> = {
  [COLLECTION_TYPES.TOP_SELLING_FREE]: gplay.collection.TOP_FREE,
  [COLLECTION_TYPES.TOP_SELLING_PAID]: gplay.collection.TOP_PAID,
  [COLLECTION_TYPES.TOP_GROSSING]: gplay.collection.GROSSING,
};

export const fetchCollectionApps = async (type: string, store: string,
  country: string, lang: string, limit: number, developerId?: string) => {
  try {
    if (store === STORES.APP_STORE) {
      if (type === COLLECTION_TYPES.DEVELOPER && developerId) {
        try {
          const apps = await appStoreClient.appsByDeveloper({
            devId: developerId,
            country: getCountryCode(country),
            language: lang,
          });
          return unifyAppStoreResults(apps?.slice(0, limit) || [], STORES.APP_STORE);
        } catch (error) {
          // Match Play Store behavior for developer not found
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && error.message.includes('not found')) {
            logger.warn(`Developer ${developerId} not found in App Store`);
            return [];
          }
          throw error;
        }
      } else if (type === COLLECTION_TYPES.CATEGORY && developerId) {
        try {
          logger.debug(`Fetching App Store category ${developerId} for ${country}`);
          const apps = await appStoreClient.list({
            country: getCountryCode(country),
            language: lang,
            category: parseInt(developerId),
            num: limit,
          });
          
          // Validate the response before processing
          if (!apps || !Array.isArray(apps)) {
            logger.warn(`Invalid response for App Store category ${developerId} in ${country}`);
            return [];
          }
          
          // Filter out any invalid entries that might cause errors
          const validApps = apps.filter((app: any) => {
            return app && typeof app === 'object' && 
              // Ensure required properties exist to prevent 'href' errors
              ((app.url || app.href || (app.links && app.links.length > 0) || 
                (app.attributes && app.attributes.url)));
          });
          
          logger.debug(`Retrieved ${validApps.length}/${apps.length} valid apps from
            App Store category ${developerId}`);
          return unifyAppStoreResults(validApps.slice(0, limit), STORES.APP_STORE);
        } catch (error) {
          logger.error(`Error fetching App Store category ${developerId} for ${country}:`, error);
          // Return empty array instead of failing completely
          return [];
        }
      } else {
        // Map the collection type to app-store-client format
        const mappedType = APP_STORE_COLLECTION_MAP[type as keyof typeof APP_STORE_COLLECTION_MAP];
        if (!mappedType) {
          logger.error(`Invalid App Store collection type: ${type}. Available types:`,
            Object.keys(APP_STORE_COLLECTION_MAP));
          throw new Error(`Invalid App Store collection type: ${type}`);
        }

        const collection = mappedType as Collection;
        logger.debug(`Fetching App Store collection: ${type}`);
        
        try {
          // App Store client has a default limit (appears to be 50) and may not support pagination
          // We'll make a single request and handle the limit in our code
          
          logger.debug(`Requesting up to ${limit} apps from App Store collection`);          
          const apps = await appStoreClient.list({
            collection,
            country: getCountryCode(country),
            language: lang,
            num: limit,
          });
          
          // The app-store-client doesn't appear to support direct pagination
          // If we need more results than what's returned in a single request,
          // we'll need to implement a platform-specific pagination solution
          // or modify the app-store-client library to support pagination
          
          if (!apps || !Array.isArray(apps)) {
            logger.warn(`No apps returned from App Store collection ${type} or invalid response format`);
            return [];
          }
          
          // Filter out any invalid entries that might cause errors
          const validApps = apps.filter((app: any) => {
            return app && typeof app === 'object' && 
              // Ensure required properties exist to prevent 'href' errors
              ((app.url || app.href || (app.links && app.links.length > 0) || 
                (app.attributes && app.attributes.url)));
          });
          
          if (validApps.length < apps.length) {
            logger.warn(`Filtered out ${apps.length - validApps.length} invalid entries
               from App Store collection ${type}`);
          }
          
          // Use what we got, up to the requested limit
          const allApps = validApps.slice(0, limit);
          
          if (allApps.length < limit && allApps.length > 0) {
            logger.warn(
              `App Store API returned fewer results (${allApps.length}) than requested (${limit}).
              Consider implementing custom pagination.`
            );
          }
          
          logger.debug(`Retrieved ${allApps.length} valid apps from App Store collection ${type}`);
          return unifyAppStoreResults(allApps, STORES.APP_STORE);
        } catch (error) {
          logger.error(`Error fetching App Store collection ${type} for ${country}:`, error);
          // Return empty array instead of failing completely
          return [];
        }
      }
    } else if (store === STORES.PLAY_STORE) {
      if (type === COLLECTION_TYPES.DEVELOPER && developerId) {
        try {
          const apps = await gplay.developer({ devId: developerId, country, lang, num: limit });
          const validatedApps = validateAndProcessResponse(apps, 'Play Store developer API', limit);
          return unifyAppStoreResults(validatedApps, STORES.PLAY_STORE);
        } catch (error) {
          // If developer not found, return empty array instead of throwing
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && error.message.includes('not found')) {
            logger.warn(`Developer ${developerId} not found in Play Store`);
            return [];
          }
          throw error;
        }
      } else if (type === COLLECTION_TYPES.CATEGORY && developerId) {
        const apps = await gplay.list({
          category: developerId as PlayStoreCategory,
          collection: gplay.collection.TOP_FREE,
          country,
          lang,
          num: limit,
        });
        return unifyAppStoreResults(validateAndProcessResponse(apps, 'Play Store category', limit), STORES.PLAY_STORE);
      } else {
        // Map the collection type to google-play-scraper format
        const mappedType = PLAY_STORE_COLLECTION_MAP[type as keyof typeof PLAY_STORE_COLLECTION_MAP];
        if (!mappedType) {
          logger.error(`Invalid Play Store collection type: ${type}. Available types:`,
            Object.keys(PLAY_STORE_COLLECTION_MAP));
          throw new Error(`Invalid Play Store collection type: ${type}`);
        }

        logger.debug(`Fetching Play Store collection: ${type}`);
        try {
          // Special handling for problematic collections like topselling_paid
          // that cause the 'fantasy-land/map' error
          const problematicCollections = ['topselling_paid'];
          if (problematicCollections.includes(type)) {
            logger.warn(`Using alternative approach for problematic collection: ${type}`);
            
            // For problematic collections, try to fetch TOP_PAID instead
            // which is more reliable but should contain similar apps
            try {
              logger.debug(`Attempting to fetch TOP_PAID as alternative for ${type}`);
              const alternativeApps = await gplay.list({
                collection: gplay.collection.TOP_PAID,
                country,
                lang,
                num: limit,
              });
              
              if (alternativeApps && Array.isArray(alternativeApps) && alternativeApps.length > 0) {
                logger.info(`Successfully fetched ${alternativeApps.length} apps using alternative method for ${type}`);
                const validApps = alternativeApps.filter(app => app && typeof app === 'object');
                return unifyAppStoreResults(validApps, STORES.PLAY_STORE);
              }
              
              // If alternative approach fails, continue with regular approach as fallback
              logger.warn(`Alternative approach failed for ${type}, trying regular approach`);
            } catch (altError) {
              logger.error(`Error with alternative approach for ${type}:`, altError);
              // Continue with regular approach as fallback
            }
          }
          
          // Regular approach for non-problematic collections or as fallback
          let allApps: any[] = [];
          const PLAY_STORE_PAGE_SIZE = 50; // Further reduced page size to avoid potential issues
          const maxPages = Math.ceil(limit / PLAY_STORE_PAGE_SIZE);
          
          try {
            for (let page = 0; page < maxPages; page++) {
              if (allApps.length >= limit) break;
              
              const pageSize = Math.min(PLAY_STORE_PAGE_SIZE, limit - allApps.length);
              
              // Wrap each individual request in a try-catch to handle potential errors
              try {
                logger.debug(`Fetching Play Store collection ${type}, page ${page+1}/${maxPages}, size ${pageSize}`);
                
                // Add delay between requests to avoid rate limiting
                if (page > 0) {
                  logger.debug(`Adding delay before fetching page ${page+1}`);
                  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                }
                
                const pageApps: any[] = await gplay.list({
                  collection: mappedType,
                  country,
                  lang,
                  num: pageSize,
                  start: allApps.length, // Start from where we left off
                });
                
                if (!pageApps || !Array.isArray(pageApps) || pageApps.length === 0) {
                  // No more results or error
                  logger.warn(`No results returned for Play Store collection ${type}, page ${page+1}`);
                  break;
                }
                
                // Filter out any invalid entries before adding to allApps
                const validPageApps = pageApps.filter(app => app && typeof app === 'object');
                logger.debug(`Retrieved ${validPageApps.length}/${pageApps.length} 
                  valid apps from Play Store collection ${type}, page ${page+1}`);
                
                allApps = [...allApps, ...validPageApps];
                
                // If we got fewer results than requested, there are no more results
                if (pageApps.length < pageSize) break;
              } catch (pageError) {
                // Log the error but continue with the next page
                logger.error(`Error fetching Play Store collection ${type}, page ${page+1}:`, pageError);
                // If this is the first page and we have no apps yet, we'll propagate the error later
                if (page > 0 || allApps.length > 0) {
                  continue; // Skip to next page if we already have some data
                }
                
                // For first page errors, return empty array instead of throwing
                logger.warn(`First page failed for ${type}, returning empty array`);
                return [];
              }
            }
          } catch (paginationError) {
            // If we have some apps already, return what we have instead of failing completely
            if (allApps.length > 0) {
              logger.warn(`Pagination error in Play Store collection ${type}, 
                but returning ${allApps.length} apps that were successfully fetched:`, paginationError);
            } else {
              // Return empty array instead of throwing
              logger.error(`Complete pagination failure for ${type}, returning empty array:`, paginationError);
              return [];
            }
          }

          const validatedApps = validateAndProcessResponse(allApps, 'Play Store', limit);
          logger.debug(`Retrieved ${validatedApps.length} apps from Play Store collection (paginated)`);
          
          return unifyAppStoreResults(validatedApps, STORES.PLAY_STORE);
        } catch (error) {
          logger.error('Error fetching from Play Store:', error);
          throw error;
        }
      }
    } else {
      throw new Error('Invalid store specified');
    }
  } catch (error) {
    logger.error('Error fetching collection:', error);
    throw error;
  }
};
