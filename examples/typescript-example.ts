/**
 * TypeScript Example for LoopKit SDK
 *
 * This example demonstrates how to use LoopKit with full type safety
 * in TypeScript projects, including React applications.
 */

import LoopKit, {
  type LoopKitConfig,
  type TrackEvent,
  type BatchEventInput,
  type TrackOptions,
} from '@loopkit/javascript';

// ===== Basic Setup =====

// Type-safe configuration
const config: Partial<LoopKitConfig> = {
  debug: true,
  enableAutoClickTracking: true,
  enableErrorTracking: true,
  batchSize: 50,
  flushInterval: 30,
  logLevel: 'info',
  onError: (error: Error) => {
    console.error('LoopKit error:', error);
  },
  onBeforeTrack: (event: TrackEvent) => {
    // Add timestamp to all events
    return {
      ...event,
      properties: {
        ...event.properties,
        client_timestamp: new Date().toISOString(),
      },
    };
  },
};

// Initialize LoopKit
LoopKit.init('your-api-key-here', config);

// ===== Type-Safe Event Tracking =====

// Define custom event interfaces
interface UserSignupEvent {
  plan: 'free' | 'premium' | 'enterprise';
  source: string;
  referrer?: string;
}

interface PurchaseEvent {
  product_id: string;
  product_name: string;
  price: number;
  currency: string;
  quantity: number;
}

interface PageViewEvent {
  page_path: string;
  page_title: string;
  page_category?: string;
}

// Track typed events
function trackUserSignup(data: UserSignupEvent): void {
  LoopKit.track('user_signup', data);
}

function trackPurchase(data: PurchaseEvent): void {
  LoopKit.track('purchase', data, {
    context: {
      revenue_event: true,
      conversion: true,
    },
  });
}

function trackPageView(data: PageViewEvent): void {
  LoopKit.track('page_view', data);
}

// ===== Usage Examples =====

// Track user signup
trackUserSignup({
  plan: 'premium',
  source: 'homepage_hero',
  referrer: 'google_ads',
});

// Track purchase
trackPurchase({
  product_id: 'prod_123',
  product_name: 'Premium Plan',
  price: 29.99,
  currency: 'USD',
  quantity: 1,
});

// Track page view
trackPageView({
  page_path: '/dashboard',
  page_title: 'Dashboard - LoopKit',
  page_category: 'app',
});

// ===== Batch Event Tracking =====

const batchEvents: BatchEventInput[] = [
  {
    name: 'feature_used',
    properties: { feature: 'analytics_dashboard' },
  },
  {
    name: 'feature_used',
    properties: { feature: 'user_management' },
  },
  {
    name: 'session_end',
    properties: { duration: 1800 },
    options: { timestamp: new Date().toISOString() },
  },
];

LoopKit.trackBatch(batchEvents);

// ===== User Identification =====

// Type-safe user properties
interface UserProperties {
  email: string;
  name: string;
  plan: 'free' | 'premium' | 'enterprise';
  signup_date: string;
  feature_flags?: string[];
}

const userProps: UserProperties = {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
  signup_date: '2024-01-15',
  feature_flags: ['new_dashboard', 'beta_features'],
};

LoopKit.identify('user_123', userProps);

// ===== Group Association =====

interface OrganizationProperties {
  name: string;
  industry: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  subscription_tier: string;
}

const orgProps: OrganizationProperties = {
  name: 'Acme Corp',
  industry: 'technology',
  size: 'medium',
  subscription_tier: 'business',
};

LoopKit.group('org_456', orgProps, 'organization');

// ===== React Hook Example =====

// Custom hook for React applications
export function useLoopKit() {
  const track = <T extends Record<string, any>>(
    eventName: string,
    properties?: T,
    options?: TrackOptions
  ) => {
    LoopKit.track(eventName, properties, options);
  };

  const identify = <T extends Record<string, any>>(
    userId: string,
    properties?: T
  ) => {
    LoopKit.identify(userId, properties);
  };

  const group = <T extends Record<string, any>>(
    groupId: string,
    properties?: T,
    groupType?: string
  ) => {
    LoopKit.group(groupId, properties, groupType);
  };

  return {
    track,
    identify,
    group,
    flush: () => LoopKit.flush(),
    reset: () => LoopKit.reset(),
    getQueueSize: () => LoopKit.getQueueSize(),
    getConfig: () => LoopKit.getConfig(),
  };
}

// ===== Advanced Configuration =====

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const advancedConfig: Partial<LoopKitConfig> = {
  debug: isDevelopment,
  logLevel: isDevelopment ? 'debug' : 'error',
  batchSize: isProduction ? 100 : 10,
  flushInterval: isProduction ? 60 : 5,
  enableLocalStorage: true,
  respectDoNotTrack: isProduction,
  maxRetries: 3,
  retryBackoff: 'exponential',
  requestTimeout: 10000,

  // Custom callbacks
  onBeforeTrack: (event: TrackEvent) => {
    // Add common properties to all events
    return {
      ...event,
      properties: {
        ...event.properties,
        app_version: '1.0.0',
        platform: 'web',
        timestamp: new Date().toISOString(),
      },
    };
  },

  onAfterTrack: (event: TrackEvent, success: boolean) => {
    if (!success && isDevelopment) {
      console.warn('Failed to track event:', event.name);
    }
  },

  onError: (error: Error) => {
    if (isProduction) {
      // Send to error monitoring service
      console.error('LoopKit SDK Error:', error);
    } else {
      console.error('LoopKit Error:', error);
    }
  },
};

// Re-configure with advanced settings
LoopKit.configure(advancedConfig);

export default LoopKit;
