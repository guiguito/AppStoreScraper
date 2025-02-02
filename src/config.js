const isDevelopment = process.env.NODE_ENV === 'development';

// In development, use local server. In production, use Firebase Functions URL
export const API_BASE_URL = isDevelopment 
  ? 'http://127.0.0.1:5001/appstorescraper-372b7/us-central1/api'
  : 'https://api-oitf32nzqa-uc.a.run.app';  // Cloud Run URL

// Helper function to build API URLs and fetch options
export const buildApiUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
};

// Default fetch options for API calls
export const defaultFetchOptions = {
  method: 'GET',
  mode: 'cors',
  cache: 'no-cache',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': window.location.origin,
  },
};
