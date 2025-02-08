import { useState, useEffect } from 'react';
import { buildApiUrl } from '../config';
import { cacheService } from '../services/cacheService';

export function useApiWithCache(path, params = {}, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // Check cache first
        const cachedData = cacheService.get(path, params);
        if (cachedData && mounted) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            loading: false
          }));
          
          // Optionally refresh cache in background
          if (options.backgroundRefresh) {
            fetchFromApi();
          }
          return;
        }

        if (mounted) {
          await fetchFromApi();
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: err,
            loading: false
          }));
        }
      }
    };

    const fetchFromApi = async () => {
      try {
        const response = await fetch(buildApiUrl(path, params));
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        
        // Update cache
        cacheService.set(path, params, result);
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            data: result,
            loading: false
          }));
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: err,
            loading: false
          }));
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [path, paramsKey]); // Use memoized params key

  return state;

  return { data, loading, error };
}
