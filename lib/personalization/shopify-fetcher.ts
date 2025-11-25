/**
 * Shopify Customer Data Fetcher with 24-hour localStorage cache
 */

import type { ShopifyCustomerData, CachedCustomerData, FetcherConfig } from './types';

const CACHE_KEY_PREFIX = 'clara_customer_';
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class ShopifyCustomerFetcher {
  private config: FetcherConfig;

  constructor(config?: Partial<FetcherConfig>) {
    this.config = {
      cacheDuration: config?.cacheDuration || DEFAULT_CACHE_DURATION,
      enableCache: config?.enableCache ?? true,
      fallbackToGeneric: config?.fallbackToGeneric ?? true,
    };
  }

  /**
   * Get customer data with caching
   */
  async getCustomerData(customerId: string): Promise<ShopifyCustomerData | null> {
    try {
      // Try cache first
      if (this.config.enableCache) {
        const cached = this.getCachedData(customerId);
        if (cached) {
          console.log('✅ Using cached customer data for:', customerId);
          return cached;
        }
      }

      // Fetch fresh data
      console.log('🔄 Fetching fresh customer data for:', customerId);
      const data = await this.fetchFromAPI(customerId);

      // Cache the result
      if (data && this.config.enableCache) {
        this.setCachedData(customerId, data);
      }

      return data;

    } catch (error) {
      console.error('❌ Error fetching customer data:', error);

      // Try cache as fallback even if expired
      const staleCache = this.getCachedData(customerId, true);
      if (staleCache) {
        console.log('⚠️ Using stale cached data due to fetch error');
        return staleCache;
      }

      // Return null if configured to fallback
      return this.config.fallbackToGeneric ? null : null;
    }
  }

  /**
   * Fetch from backend API
   */
  private async fetchFromAPI(customerId: string): Promise<ShopifyCustomerData | null> {
    const response = await fetch(`/api/customer-data?customerId=${encodeURIComponent(customerId)}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.customer || null;
  }

  /**
   * Get cached customer data from localStorage
   */
  private getCachedData(customerId: string, ignoreExpiration = false): ShopifyCustomerData | null {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${customerId}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const parsedCache: CachedCustomerData = JSON.parse(cached);

      // Check if cache is still valid
      const now = Date.now();
      const age = now - parsedCache.timestamp;

      if (!ignoreExpiration && age > this.config.cacheDuration) {
        console.log(`🕐 Cache expired for ${customerId} (age: ${Math.round(age / 1000 / 60)} minutes)`);
        // Clean up expired cache
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`✅ Cache hit for ${customerId} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      return parsedCache.data;

    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Save customer data to localStorage cache
   */
  private setCachedData(customerId: string, data: ShopifyCustomerData): void {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${customerId}`;
      const cachedData: CachedCustomerData = {
        data,
        timestamp: Date.now(),
        customerId,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log(`💾 Cached customer data for ${customerId}`);

    } catch (error) {
      console.error('Error saving to cache:', error);
      // localStorage might be full or disabled - continue without caching
    }
  }

  /**
   * Clear cached data for a specific customer
   */
  clearCache(customerId: string): void {
    const cacheKey = `${CACHE_KEY_PREFIX}${customerId}`;
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared cache for ${customerId}`);
  }

  /**
   * Clear all Clara customer caches
   */
  clearAllCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      const claraKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

      claraKeys.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ Cleared ${claraKeys.length} customer caches`);

    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCached: number;
    oldestCacheAge: number | null;
    cacheKeys: string[];
  } {
    try {
      const keys = Object.keys(localStorage);
      const claraKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

      let oldestAge: number | null = null;

      claraKeys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed: CachedCustomerData = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (oldestAge === null || age > oldestAge) {
            oldestAge = age;
          }
        }
      });

      return {
        totalCached: claraKeys.length,
        oldestCacheAge: oldestAge,
        cacheKeys: claraKeys,
      };

    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalCached: 0, oldestCacheAge: null, cacheKeys: [] };
    }
  }
}

/**
 * Singleton instance for global use
 */
export const shopifyFetcher = new ShopifyCustomerFetcher();
