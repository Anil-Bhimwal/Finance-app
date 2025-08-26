// Simple in-memory cache implementation
// In production, consider using Redis for distributed caching

const cache = new Map();
const cacheTimestamps = new Map();

// Configuration
const DEFAULT_TTL = 60; // 60 seconds
const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Cleanup expired entries periodically
setInterval(() => {
  cleanupExpiredEntries();
}, CLEANUP_INTERVAL);

// Clean up expired cache entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, timestamp] of cacheTimestamps.entries()) {
    const [, ttl] = key.split('::');
    const expirationTime = timestamp + (parseInt(ttl) * 1000);

    if (now > expirationTime) {
      cache.delete(key);
      cacheTimestamps.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`🧹 Cache cleanup: Removed ${removedCount} expired entries`);
  }
};

// Generate cache key
const generateCacheKey = (url, ttl) => {
  return `${url}::${ttl}`;
};

// Check if cache entry is valid
const isCacheValid = (key) => {
  if (!cache.has(key) || !cacheTimestamps.has(key)) {
    return false;
  }

  const [, ttl] = key.split('::');
  const timestamp = cacheTimestamps.get(key);
  const expirationTime = timestamp + (parseInt(ttl) * 1000);

  return Date.now() < expirationTime;
};

// Evict oldest entries if cache is full
const evictOldestEntries = () => {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Sort by timestamp and remove oldest entries
    const sortedEntries = Array.from(cacheTimestamps.entries())
      .sort(([, a], [, b]) => a - b);

    const entriesToRemove = sortedEntries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.1)); // Remove 10%

    entriesToRemove.forEach(([key]) => {
      cache.delete(key);
      cacheTimestamps.delete(key);
    });

    console.log(`🧹 Cache eviction: Removed ${entriesToRemove.length} oldest entries`);
  }
};

// Cache middleware
export const cacheMiddleware = (ttl = DEFAULT_TTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req.originalUrl, ttl);

    // Check if we have a valid cached response
    if (isCacheValid(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttl.toString());
        return res.json(cachedData);
      }
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(req.originalUrl, data, ttl);
      }

      res.set('X-Cache', 'MISS');
      res.set('X-Cache-TTL', ttl.toString());

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Set cache entry
export const setCache = (url, data, ttl = DEFAULT_TTL) => {
  try {
    // Check cache size and evict if necessary
    evictOldestEntries();

    const cacheKey = generateCacheKey(url, ttl);
    
    // Clone data to prevent mutations
    const clonedData = JSON.parse(JSON.stringify(data));
    
    cache.set(cacheKey, clonedData);
    cacheTimestamps.set(cacheKey, Date.now());

    console.log(`💾 Cache SET: ${url} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

// Get cache entry
export const getCache = (url, ttl = DEFAULT_TTL) => {
  try {
    const cacheKey = generateCacheKey(url, ttl);

    if (isCacheValid(cacheKey)) {
      const data = cache.get(cacheKey);
      console.log(`💾 Cache HIT: ${url}`);
      return data;
    }

    console.log(`💾 Cache MISS: ${url}`);
    return null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

// Delete cache entry
export const deleteCache = (url, ttl = DEFAULT_TTL) => {
  try {
    const cacheKey = generateCacheKey(url, ttl);
    
    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
      cacheTimestamps.delete(cacheKey);
      console.log(`💾 Cache DELETE: ${url}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting cache:', error);
    return false;
  }
};

// Clear all cache entries
export const clearCache = () => {
  try {
    const size = cache.size;
    cache.clear();
    cacheTimestamps.clear();
    console.log(`💾 Cache CLEAR: Removed ${size} entries`);
    return size;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return 0;
  }
};

// Clear cache entries matching a pattern
export const clearCachePattern = (pattern) => {
  try {
    const regex = new RegExp(pattern);
    let removedCount = 0;

    for (const key of cache.keys()) {
      const [url] = key.split('::');
      if (regex.test(url)) {
        cache.delete(key);
        cacheTimestamps.delete(key);
        removedCount++;
      }
    }

    console.log(`💾 Cache CLEAR PATTERN (${pattern}): Removed ${removedCount} entries`);
    return removedCount;
  } catch (error) {
    console.error('Error clearing cache pattern:', error);
    return 0;
  }
};

// Get cache statistics
export const getCacheStats = () => {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const [key, timestamp] of cacheTimestamps.entries()) {
    const [, ttl] = key.split('::');
    const expirationTime = timestamp + (parseInt(ttl) * 1000);

    if (now < expirationTime) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }

  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    memoryUsage: process.memoryUsage(),
    maxSize: MAX_CACHE_SIZE,
    cleanupInterval: CLEANUP_INTERVAL,
    lastCleanup: new Date().toISOString()
  };
};

// Cache warming utility
export const warmCache = async (urls, ttl = DEFAULT_TTL) => {
  console.log(`🔥 Cache warming started for ${urls.length} URLs`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const url of urls) {
    try {
      // This would typically make an HTTP request to the URL
      // For now, we'll just pre-populate with a placeholder
      setCache(url, { warmed: true, timestamp: Date.now() }, ttl);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ url, error: error.message });
    }
  }

  console.log(`🔥 Cache warming completed: ${results.success} success, ${results.failed} failed`);
  return results;
};

// Middleware to add cache headers
export const cacheHeaders = (ttl = DEFAULT_TTL) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${ttl}`);
      res.set('ETag', `"${Date.now()}"`);
    }
    next();
  };
};

export default {
  cacheMiddleware,
  setCache,
  getCache,
  deleteCache,
  clearCache,
  clearCachePattern,
  getCacheStats,
  warmCache,
  cacheHeaders
};
