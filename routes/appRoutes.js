const express = require('express');
const { AppStoreClient, Sort } = require('app-store-client');
const { getCountryCode } = require('../utils/countryUtils');
const { Parser } = require('json2csv');

const router = express.Router();
const client = new AppStoreClient();

// Search apps
router.get('/search', async (req, res, next) => {
  try {
    const { term } = req.query;
    const { lang, country } = req.validatedParams;

    if (!term || term.trim().length === 0) {
      return res.json([]);
    }

    const results = await client.search({
      term: term.trim(),
      num: 20,
      country: getCountryCode(country),
      language: lang
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Get app details
router.get('/app/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams;

    let appData, ratingsData;
    try {
      [appData, ratingsData] = await Promise.all([
        client.app({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang
        }),
        client.ratings({
          id: id.toString(),
          country: getCountryCode(country),
          language: lang
        })
      ]);
    } catch (error) {
      if (error.message.includes('App not found') && country !== 'US') {
        // Try US store as fallback
        [appData, ratingsData] = await Promise.all([
          client.app({
            id: id.toString(),
            country: getCountryCode('US'),
            language: lang
          }),
          client.ratings({
            id: id.toString(),
            country: getCountryCode('US'),
            language: lang
          })
        ]);
      } else {
        throw error;
      }
    }

    res.json({
      ...appData,
      ratings: ratingsData
    });
  } catch (error) {
    next(error);
  }
});

// Get app reviews as JSON
router.get('/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const { lang, country } = req.validatedParams;

    const reviews = await client.reviews({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang,
      page: parseInt(page),
      sort: Sort.RECENT
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// Download reviews as CSV
router.get('/reviews/:id/csv', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams;
    const countryCode = getCountryCode(country);
    let allReviews = [];
    let currentPage = 0;
    let hasMoreReviews = true;

    // First try to get initial page to verify app exists
    try {
      const initialReviews = await client.reviews({
        id: id.toString(),
        country: countryCode,
        language: lang,
        sort: Sort.RECENT,
        page: currentPage
      });
      
      if (initialReviews && initialReviews.length > 0) {
        allReviews = initialReviews;
        
        // If we got a full page, try to get more
        if (initialReviews.length === 10) {
          // Fetch remaining pages
          while (hasMoreReviews) {
            try {
              console.log(`Fetching reviews page ${currentPage + 1}...`);
              const pageReviews = await client.reviews({
                id: id.toString(),
                country: countryCode,
                language: lang,
                sort: Sort.RECENT,
                page: currentPage + 1
              });

              if (pageReviews && pageReviews.length > 0) {
                allReviews = allReviews.concat(pageReviews);
                currentPage++;

                if (pageReviews.length < 10) {
                  console.log(`Reached last page with ${pageReviews.length} reviews`);
                  hasMoreReviews = false;
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
              } else {
                console.log('No more reviews found');
                hasMoreReviews = false;
              }
            } catch (error) {
              console.log(`Error fetching page ${currentPage + 1}:`, error.message);
              // Stop fetching but don't throw error - we'll return what we have
              hasMoreReviews = false;
            }
          }
        } else {
          console.log('Only one page of reviews available');
        }
      } else {
        console.log('No reviews found');
      }
    } catch (error) {
      console.error('Error fetching initial reviews:', error.message);
      if (error.message.includes('App not found')) {
        throw new Error('App not found in the specified country\'s App Store');
      }
      throw error;
    }

    console.log(`Total reviews fetched: ${allReviews.length}`);

    // Define fields for CSV
    const fields = [
      'id',
      'userName',
      'title',
      'text',
      'score',
      'version',
      'updated',
    ];

    // Convert to CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(allReviews);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reviews-${id}-${countryCode}.csv`);

    // Send CSV
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// Get developer's other apps
router.get('/developer-apps/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams;
    
    // First get the app details to get the developer name
    const appData = await client.app({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang
    });

    if (!appData.developer) {
      return res.json([]);
    }

    // Search for apps by the same developer
    const results = await client.search({
      term: appData.developer,
      num: 10,
      country: getCountryCode(country),
      language: lang
    });

    // Filter out the current app and ensure apps are from the same developer
    const developerApps = results
      .filter(app => app.id !== id && app.developer === appData.developer)
      .slice(0, 8);

    res.json(developerApps);
  } catch (error) {
    next(error);
  }
});

// Get collection apps
router.get('/collection/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { country } = req.validatedParams;
    
    const results = await client.list({
      collection: id,
      country: getCountryCode(country),
      num: 10
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Get similar apps
router.get('/similar/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang, country } = req.validatedParams;

    const similarApps = await client.similarApps({
      id: id.toString(),
      country: getCountryCode(country),
      language: lang
    });

    res.json(similarApps);
  } catch (error) {
    if (error.name === 'AppNotFoundError') {
      // Return empty array if app not found
      return res.json([]);
    }
    next(error);
  }
});

module.exports = router;
