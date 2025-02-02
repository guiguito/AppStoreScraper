const { isValidCountry } = require('../utils/countryUtils');

const validateCommonParams = (req, res, next) => {
  const { lang = 'en', country = 'US' } = req.query;
  
  // Validate country code
  if (!isValidCountry(country.toUpperCase())) {
    return res.status(400).json({ 
      error: `Invalid country code: ${country}. Please use a valid ISO 3166-1 alpha-2 country code.` 
    });
  }

  // Add validated params to request object
  req.validatedParams = {
    lang,
    country: country.toUpperCase()
  };

  next();
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'AppNotFoundError') {
    return res.status(404).json({ error: 'App not found' });
  }

  if (err.name === 'AppStoreAPIError') {
    return res.status(502).json({ error: 'App Store API error' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = {
  validateCommonParams,
  errorHandler
};
