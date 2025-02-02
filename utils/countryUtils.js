const { Country } = require('app-store-client');

// Map of two-letter country codes to app-store-client Country enum values
const countryMap = {
  'US': Country.US,
  'GB': Country.GB,
  'FR': Country.FR,
  'DE': Country.DE,
  'IT': Country.IT,
  'ES': Country.ES,
  'CA': Country.CA,
  'CN': Country.CN,
  'JP': Country.JP,
  'KR': Country.KR,
  // Add more countries as needed
};

const getCountryCode = (userCountry = 'US') => {
  const countryCode = userCountry.toUpperCase();
  return countryMap[countryCode] || Country.US;
};

const isValidCountry = (countryCode) => {
  return countryCode in countryMap;
};

module.exports = {
  countryMap,
  getCountryCode,
  isValidCountry
};
