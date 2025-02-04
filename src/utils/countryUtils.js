// ISO 3166-1 alpha-2 country codes with their display names
export const SUPPORTED_COUNTRIES = {
  'AE': 'United Arab Emirates',
  'AU': 'Australia',
  'BE': 'Belgium',
  'BR': 'Brazil',
  'CA': 'Canada',
  'CH': 'Switzerland',
  'CN': 'China',
  'DE': 'Germany',
  'DK': 'Denmark',
  'ES': 'Spain',
  'FI': 'Finland',
  'FR': 'France',
  'GB': 'United Kingdom',
  'HK': 'Hong Kong',
  'ID': 'Indonesia',
  'IN': 'India',
  'IT': 'Italy',
  'JP': 'Japan',
  'KR': 'South Korea',
  'MX': 'Mexico',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'PL': 'Poland',
  'RU': 'Russia',
  'SA': 'Saudi Arabia',
  'SE': 'Sweden',
  'SG': 'Singapore',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'US': 'United States',
};

/**
 * Validates if a given country code is a valid ISO 3166-1 alpha-2 code
 * and is supported by our application
 */
export const isValidCountryCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  const normalizedCode = code.toUpperCase();
  return normalizedCode in SUPPORTED_COUNTRIES && normalizedCode.length === 2;
};

/**
 * Normalizes a country code to ISO 3166-1 alpha-2 format
 * Returns 'US' if the code is invalid
 */
export const normalizeCountryCode = (code) => {
  if (!isValidCountryCode(code)) {
    console.warn(`Invalid country code: ${code}, falling back to US`);
    return 'US';
  }
  return code.toUpperCase();
};

/**
 * Gets the country name for a given ISO 3166-1 alpha-2 code
 */
export const getCountryName = (code) => {
  const normalizedCode = normalizeCountryCode(code);
  return SUPPORTED_COUNTRIES[normalizedCode] || 'United States';
};
