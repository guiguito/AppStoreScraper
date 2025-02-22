import { UnifiedAppResult, UnifiedReview } from './types.js';

export const unifyAppStoreResults = (apps: any[], store: 'appstore' | 'playstore'): UnifiedAppResult[] => {
  if (!apps || !Array.isArray(apps)) {
    console.error('Invalid apps array:', apps);
    return [];
  }

  return apps.map((app, index) => {
    try {
      if (!app || typeof app !== 'object') {
        console.error(`Invalid app at index ${index}:`, app);
        return null;
      }

      // Extract URL - try different possible locations
      let url = app.url;
      if (!url && app.href) url = app.href;
      if (!url && app.links && app.links.length > 0) url = app.links[0].href;
      if (!url && app.attributes && app.attributes.url) url = app.attributes.url;

      // Extract other fields with fallbacks
      const id = store === 'appstore' ? (app.id || app.attributes?.id) : (app.appId || app.id);
      const title = app.title || app.attributes?.name || app.name;
      const icon = app.icon || app.attributes?.artwork?.url || app.artworkUrl;
      const developer = app.developer || app.attributes?.artistName || app.artist;
      const description = store === 'appstore' ? 
        (app.description || app.attributes?.description) : 
        (app.description || app.descriptionHTML || '');

      // Extract ratings data
      const ratings = app.ratings || {
        total: 0,
        average: 0,
        histogram: {},
      };
      
      // Extract score (for backward compatibility)
      const score = ratings.average || 0;

      // Validate required fields
      if (!id || !title || !icon || !developer || !url) {
        console.error(`Missing required properties for app at index ${index}:`, {
          id, title, icon, developer, url,
        });
        return null;
      }

      // Extract app metadata
      const price = app.price || app.attributes?.price || 0;
      const free = price === 0;
      const currency = app.currency || app.attributes?.currency || 'USD';
      const version = app.version || app.attributes?.version;
      const released = app.released || app.attributes?.releaseDate;
      const updated = app.updated || app.attributes?.currentVersionReleaseDate;
      const releaseNotes = app.releaseNotes || app.attributes?.releaseNotes;
      const size = app.size || app.attributes?.fileSizeBytes;
      // Extract OS version requirements
      const requiredOsVersion = store === 'appstore' ? 
        (app.requiredOsVersion || app.attributes?.minimumOsVersion) : undefined;
      const androidVersion = store === 'playstore' ? 
        (app.androidVersion || app.minimumAndroidVersion) : undefined;
      const developerId = app.developerId || app.attributes?.artistId;
      const developerUrl = store === 'appstore' ?
        (app.developerUrl || app.attributes?.artistViewUrl) :
        (app.developerUrl || app.developerPageUrl || '');
      const developerWebsite = store === 'appstore' ?
        (app.developerWebsite || app.attributes?.sellerUrl) :
        (app.developerWebsite || '');
      const contentRating = app.contentRating || app.attributes?.contentAdvisoryRating;
      const screenshots = app.screenshots || app.attributes?.screenshotUrls || [];
      const ipadScreenshots = app.ipadScreenshots || app.attributes?.ipadScreenshotUrls || [];
      // Extract genre information
      const primaryGenre = app.genre || app.attributes?.primaryGenreName;
      const primaryGenreId = app.genreId || app.attributes?.primaryGenreId;
      let genres = store === 'appstore' ?
        (app.genres || app.attributes?.genres || []) :
        (app.genres || []);
      let genreIds = store === 'appstore' ?
        (app.genreIds || app.attributes?.genreIds || []) :
        (app.genreIds || []);
      
      // Add primary genre to genres array if not already present
      if (primaryGenre && !genres.includes(primaryGenre)) {
        genres = [primaryGenre, ...genres];
      }
      if (primaryGenreId && !genreIds.includes(primaryGenreId)) {
        genreIds = [primaryGenreId, ...genreIds];
      }

      // Extract installs information (Play Store only)
      const installs = store === 'playstore' ? app.installs || app.minInstalls || '0+' : undefined;

      // Extract available countries
      const availableCountries = store === 'appstore' ? (app.availableCountries || []) : [];

      // Extract supported languages
      const languages = store === 'appstore' ?
        (app.languages || []) : 
        (app.supportedLanguages || []);

      // Extract supported devices
      const supportedDevices = store === 'appstore' ?
        (app.supportedDevices || []) :
        [];

      return {
        id,
        title,
        icon,
        developer,
        developerId,
        developerUrl,
        developerWebsite,
        url,
        description,
        score,
        ratings,
        price,
        free,
        currency,
        version,
        released,
        updated,
        releaseNotes,
        size,
        ...(store === 'appstore' ? { requiredOsVersion } : { androidVersion }),
        contentRating,
        screenshots,
        ipadScreenshots,
        genres,
        genreIds,
        store,
        ...(installs ? { installs } : {}),
        ...(store === 'appstore' ? (app.privacyData || {}) : {}),
        availableCountries,
        languages,
        supportedDevices,
      };
    } catch (error) {
      console.error(`Error processing app at index ${index}:`, error);
      console.error('App data:', app);
      return null;
    }
  }).filter(app => app !== null) as UnifiedAppResult[];
};

export const unifyReviews = (reviews: any[], store: 'appstore' | 'playstore'): UnifiedReview[] => {
  return reviews.map(review => ({
    id: review.id,
    userName: review.userName,
    title: store === 'appstore' ? review.title : '',
    text: review.text,
    rating: review.score,
    score: review.score,
    version: review.version || 'N/A',
    updated: review.date,
    store,
    userUrl: store === 'appstore' ? review.userUrl : '',
    url: store === 'appstore' ? review.url : '',
  }));
};
