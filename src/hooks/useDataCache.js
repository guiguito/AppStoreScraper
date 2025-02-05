import { useState, useCallback } from 'react';

export function useDataCache() {
  const [cache, setCache] = useState(new Map());

  const getCacheKey = (endpoint, params) => {
    const sortedParams = Object.entries(params || {})
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  };

  const getCachedData = useCallback((endpoint, params) => {
    const key = getCacheKey(endpoint, params);
    return cache.get(key);
  }, [cache]);

  const setCachedData = useCallback((endpoint, params, data) => {
    const key = getCacheKey(endpoint, params);
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(key, {
        data,
        timestamp: Date.now()
      });
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache
  };
}
