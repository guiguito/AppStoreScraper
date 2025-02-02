const isDevelopment = process.env.NODE_ENV === 'development';

// In development, use local server. In production, use Firebase Functions URL
export const API_BASE_URL = isDevelopment 
  ? 'http://127.0.0.1:5001/appstorescraper-372b7/us-central1/api'
  : '/api';  // This will be handled by Firebase rewrite rules

// Helper function to build API URLs
export const buildApiUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
};
