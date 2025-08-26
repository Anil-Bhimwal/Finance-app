import Redis from 'redis';

/**
 * Cache implementation using Redis or in-memory fallback
 */
class CacheManager {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.memoryTimestamps = new Map();
    this.isRedisEnabled = false;
    
    this.init();
  }

  async init() {
    try {
      // Try to connect to Redis if URL is provided
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.warn('Redis server refused connection, falling back to memory cache');
              return false;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        this.redis.on('error', (err) => {
          console.warn('Redis error, falling back to memory cache:', err.message);
          this.isRedisEnabled = false;
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis connected for caching');
          this.isRedisEnabled = true;
        });

        await this.redis.connect();
      } else {
        console.log('📦 Using in-memory cache (Redis URL not provided)');
      }
    } catch (error) {
      console.warn('Redis connection failed, using memory cache:', error.message);
      this.isRedisEnabled = false;
    }

    // Clean up memory cache periodically
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000); // Clean every minute
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    try {
      if (this.isRedisEnabled && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.getFromMemory(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.isRedisEnabled && this.redis) {
        await this.redis.setEx(key, ttl, JSON.stringify(value));
        return true;
      } else {
        return this.setInMemory(key, value, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (this.isRedisEnabled && this.redis) {
        await this.redis.del(key);
        return true;
      } else {
        this.memoryCache.delete(key);
        this.memoryTimestamps.delete(key);
        return true;
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(key) {
    try {
      if (this.isRedisEnabled && this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        const value = this.getFromMemory(key);
        return value !== null;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      if (this.isRedisEnabled && this.redis) {
        await this.redis.flushAll();
        return true;
      } else {
        this.memoryCache.clear();
        this.memoryTimestamps.clear();
        return true;
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async mget(keys) {
    try {
      if (this.isRedisEnabled && this.redis) {
        const values = await this.redis.mGet(keys);
        const result = {};
        keys.forEach((key, index) => {
          result[key] = values[index] ? JSON.parse(values[index]) : null;
        });
        return result;
      } else {
        const result = {};
        keys.forEach(key => {
          result[key] = this.getFromMemory(key);
        });
        return result;
      }
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Set multiple values in cache
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async mset(keyValuePairs, ttl = 300) {
    try {
      if (this.isRedisEnabled && this.redis) {
        const multi = this.redis.multi();
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          multi.setEx(key, ttl, JSON.stringify(value));
        });
        await multi.exec();
        return true;
      } else {
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          this.setInMemory(key, value, ttl);
        });
        return true;
      }
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get value from memory cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  getFromMemory(key) {
    const timestamp = this.memoryTimestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.memoryCache.delete(key);
      this.memoryTimestamps.delete(key);
      return null;
    }
    return this.memoryCache.get(key);
  }

  /**
   * Set value in memory cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} - Success status
   */
  setInMemory(key, value, ttl) {
    const expirationTime = Date.now() + (ttl * 1000);
    this.memoryCache.set(key, value);
    this.memoryTimestamps.set(key, expirationTime);
    return true;
  }

  /**
   * Clean up expired entries from memory cache
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.memoryTimestamps.entries()) {
      if (now > timestamp) {
        this.memoryCache.delete(key);
        this.memoryTimestamps.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      type: this.isRedisEnabled ? 'redis' : 'memory',
      memorySize: this.memoryCache.size,
      isConnected: this.isRedisEnabled,
      memoryEntries: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Create a cache key with prefix
   * @param {string} prefix - Key prefix
   * @param {string} key - Base key
   * @returns {string} - Prefixed key
   */
  key(prefix, key) {
    return `finance-dashboard:${prefix}:${key}`;
  }

  /**
   * Cache wrapper for functions
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} - Function result
   */
  async wrap(key, fn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}

// Create and export singleton instance
export const cache = new CacheManager();

// Export the class for testing
export { CacheManager };
