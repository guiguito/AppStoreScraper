const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

class CacheService {
  constructor() {
    this.cache = new Map();
  }

  generateKey(path, params) {
    return `${path}_${JSON.stringify(params)}`;
  }

  get(path, params) {
    const key = this.generateKey(path, params);
    const cached = this.cache.get(key);
    
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(path, params, data) {
    const key = this.generateKey(path, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  // Clear expired items
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
