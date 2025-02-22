import { Country } from 'app-store-client';
import * as logger from 'firebase-functions/logger';

// Constants for API limits and configuration
export const MAX_PLAY_STORE_BATCHES = 3;
export const MISTRAL_API_KEY = 'bR19XOC1oWhJ0NtW9GxQlUKoCh9blDeg';

// Map country codes to app-store-client Country enum
export const countryMap: Record<string, Country> = {
  'US': Country.US,   // United States
  'GB': Country.GB,   // United Kingdom
  'FR': Country.FR,   // France
  'DE': Country.DE,   // Germany
  'IT': Country.IT,   // Italy
  'ES': Country.ES,   // Spain
  'CA': Country.CA,   // Canada
  'CN': Country.CN,   // China
  'JP': Country.JP,   // Japan
  'KR': Country.KR,   // South Korea
  'AU': Country.AU,   // Australia
  'BR': Country.BR,   // Brazil
  'MX': Country.MX,   // Mexico
  'NL': Country.NL,   // Netherlands
  'RU': Country.RU,   // Russia
  'CH': Country.CH,   // Switzerland
  'SE': Country.SE,   // Sweden
  'PL': Country.PL,   // Poland
  'BE': Country.BE,   // Belgium
  'IN': Country.IN,   // India
  'ID': Country.ID,   // Indonesia
  'TR': Country.TR,   // Turkey
  'TW': Country.TW,   // Taiwan
  'SA': Country.SA,   // Saudi Arabia
  'SG': Country.SG,   // Singapore
  'HK': Country.HK,   // Hong Kong
  'AE': Country.AE,   // United Arab Emirates
  'DK': Country.DK,   // Denmark
  'NO': Country.NO,   // Norway
  'FI': Country.FI,   // Finland
  'LU': Country.LU,   // Luxembourg
};

// ISO 3166-1 alpha-2 country codes with their display names
export const TOP_30_COUNTRIES: Record<string, string> = {
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
  'LU': 'Luxembourg',
};

export const getCountryCode = (userCountry = 'US'): Country => {
  const countryCode = userCountry.toUpperCase();
  if (!isValidCountry(countryCode)) {
    logger.warn(`Invalid country code: ${countryCode}, falling back to US`);
    return Country.US;
  }
  return countryMap[countryCode];
};

export const isValidCountry = (countryCode: string): boolean => {
  const normalizedCode = countryCode.toUpperCase();
  return normalizedCode in countryMap && normalizedCode.length === 2;
};

export const fetchAvailableCountries = async (id: string): Promise<{code: string, name: string}[]> => {
  const available: {code: string, name: string}[] = [];
  await Promise.all(Object.entries(TOP_30_COUNTRIES).map(async ([code, name]) => {
    try {
      const response = await fetch(`https://itunes.apple.com/${code}/lookup?id=${id}`);
      const data = await response.json();
      if(data.resultCount > 0){
        available.push({ code, name });
      }
    } catch(err) {
      console.error(`Error checking availability for ${name}:`, err);
    }
  }));
  return available;
};
