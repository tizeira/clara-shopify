/**
 * Type definitions for Clara's personalization system
 */

/**
 * Shopify customer data structure
 */
export interface ShopifyCustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  // Metafields
  skinType?: 'Seca' | 'Grasa' | 'Mixta' | 'Sensible' | 'Normal';
  skinConcerns?: string[];

  // Purchase history
  numberOfOrders: number;
  recentProducts?: {
    title: string;
    purchasedAt: string;
  }[];
}

/**
 * Cached customer data with timestamp
 */
export interface CachedCustomerData {
  data: ShopifyCustomerData;
  timestamp: number;
  customerId: string;
}

/**
 * Prompt template variables that can be populated
 */
export interface PromptVariables {
  firstName: string;
  lastName?: string;
  skinType?: string;
  skinConcerns?: string;
  recentProducts?: string;
  hasHistory: boolean;
}

/**
 * Clara's personalized prompt configuration
 */
export interface ClaraPromptConfig {
  basePrompt: string;
  variables: PromptVariables;
  includeHistory: boolean;
}

/**
 * Fetcher configuration
 */
export interface FetcherConfig {
  cacheDuration: number; // milliseconds
  enableCache: boolean;
  fallbackToGeneric: boolean;
}
