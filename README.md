# LoopKit JavaScript SDK

A complete analytics SDK for tracking events, user identification, and behavioral analytics in web applications. Now built with **TypeScript** for better developer experience and type safety.

## Features

- **🔧 TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **📊 Event Tracking**: Track custom events with properties
- **👤 User Identification**: Identify users and track their journey
- **👥 Group Analytics**: Associate users with organizations/groups
- **🔄 Automatic Features**: Auto-click tracking, error tracking, session management
- **💾 Local Storage**: Persist events offline with automatic retry
- **🌐 Cross-Platform**: Works in browsers, Node.js, and React applications
- **📦 Multiple Formats**: ES modules, CommonJS, UMD builds available

## 📖 Complete Documentation

> **🔗 [View the complete JavaScript SDK documentation →](https://docs.loopkit.ai/docs/javascript-quickstart.html)**

## Installation

```bash
npm install @loopkit/javascript
```

### CDN

```html
<script src="https://cdn.loopkit.ai/js/loopkit.min.js"></script>
```

## Quick Start

### Browser

```javascript
import LoopKit from '@loopkit/javascript';

// Initialize
LoopKit.init('your-api-key-here');

// Track an event
LoopKit.track('button_clicked', {
  button_name: 'signup',
  page: '/homepage',
});

// Identify a user
LoopKit.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});
```

### Node.js

```javascript
const LoopKit = require('@loopkit/javascript');

// Initialize with configuration
LoopKit.init('your-api-key-here', {
  debug: true,
  batchSize: 50,
  flushInterval: 30,
});

// Track server-side events
LoopKit.track('user_signup', {
  method: 'email',
  source: 'landing_page',
});
```

## TypeScript Support

The SDK is built with TypeScript and exports comprehensive type definitions:

### Core Types

```typescript
import type {
  // Configuration
  LoopKitConfig,
  LogLevel,
  RetryBackoff,

  // Events
  TrackEvent,
  IdentifyEvent,
  GroupEvent,
  ClickEventProperties,
  BatchEventInput,
  TrackOptions,

  // Interfaces
  ILoopKit,
  IStorageManager,
  ISessionManager,
  IQueueManager,
  INetworkManager,

  // Convenience aliases
  Config,
  Event,
  Options,
} from '@loopkit/javascript';
```

### Configuration Types

```typescript
const config: LoopKitConfig = {
  apiKey: 'your-key',
  baseURL: 'https://api.example.com',
  batchSize: 50,
  flushInterval: 30,
  debug: true,
  logLevel: 'info',
  enableAutoClickTracking: true,
  enableErrorTracking: true,
  respectDoNotTrack: true,
  onBeforeTrack: (event) => {
    // Modify event before tracking
    return { ...event, timestamp: new Date().toISOString() };
  },
  onAfterTrack: (event, success) => {
    if (!success) {
      console.warn('Failed to track event:', event);
    }
  },
  onError: (error) => {
    console.error('LoopKit error:', error);
  },
};
```

## API Reference

### API Endpoints

The SDK sends events to separate, dedicated endpoints:

- **Track Events**: `POST /tracks` with payload `{ tracks: [...] }`
- **User Identification**: `POST /identities` with payload `{ identifies: [...] }`
- **Group Association**: `POST /groups` with payload `{ groups: [...] }`

Each endpoint receives an array of the respective event type wrapped in a named property. This allows for better API performance and easier backend processing.

### Initialization

#### `LoopKit.init(apiKey, config?)`

Initialize the SDK with your API key and optional configuration.

```javascript
LoopKit.init('your-api-key', {
  debug: false,
  batchSize: 50,
  flushInterval: 30,
  enableAutoCapture: true,
  enableAutoClickTracking: true,
  enableErrorTracking: true,
});
```

### Event Tracking

#### `LoopKit.track(eventName, properties?, options?)`

Track a custom event with optional properties.

```javascript
LoopKit.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  product_id: 'pro_plan',
});
```

**Note:** Timestamps are automatically added to all events. You don't need to manually include `timestamp` in your properties - the SDK handles this automatically at the event level.

#### `LoopKit.trackBatch(events)`

Track multiple events in a single batch.

```javascript
LoopKit.trackBatch([
  { name: 'page_view', properties: { page: '/home' } },
  { name: 'button_clicked', properties: { button: 'cta' } },
]);
```

### User Management

#### `LoopKit.identify(userId, properties?)`

Associate events with a specific user.

```javascript
LoopKit.identify('user_123', {
  email: 'user@example.com',
  plan: 'enterprise',
  signup_date: '2024-01-15',
});
```

#### `LoopKit.group(groupId, properties?, groupType?)`

Associate the user with an organization or group.

```javascript
LoopKit.group(
  'company_abc',
  {
    name: 'Acme Corp',
    plan: 'enterprise',
    employee_count: 500,
  },
  'organization'
);
```

### Queue Management

#### `LoopKit.flush()`

Manually flush all queued events.

```javascript
await LoopKit.flush();
```

#### `LoopKit.getQueueSize()`

Get the current number of events in the queue.

```javascript
const queueSize = LoopKit.getQueueSize();
console.log(`${queueSize} events queued`);
```

### LoopKit.reset()

Reset the SDK state (useful for logout).

```javascript
LoopKit.reset();
```

## Configuration Options

```javascript
LoopKit.configure({
  // API Settings
  baseURL: 'https://api.loopkit.ai/v1',

  // Batching
  batchSize: 50, // Events per batch
  flushInterval: 30, // Seconds between flushes
  maxQueueSize: 1000, // Maximum events to queue

  // Performance
  enableCompression: true, // Gzip requests
  requestTimeout: 10000, // Request timeout (ms)

  // Debugging
  debug: false, // Enable debug logs
  logLevel: 'info', // 'error', 'warn', 'info', 'debug'

  // Auto-capture (Browser only) - All enabled by default for zero-config setup
  enableAutoCapture: true, // Auto-track page views
  enableAutoClickTracking: true, // Auto-track click events
  enableErrorTracking: true, // Auto-track JS errors

  // Privacy
  respectDoNotTrack: true, // Honor DNT header
  enableLocalStorage: true, // Use localStorage for persistence

  // Retry Logic
  maxRetries: 3, // Number of retry attempts
  retryBackoff: 'exponential', // 'exponential' or 'linear'

  // Callbacks
  onBeforeTrack: (event) => {
    // Modify event before tracking
    return event;
  },
  onAfterTrack: (event, success) => {
    // Handle tracking result
    console.log(`Event ${event.name} ${success ? 'sent' : 'failed'}`);
  },
  onError: (error) => {
    // Handle errors
    console.error('LoopKit error:', error);
  },
});
```

## Development

### Building

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Build and watch for changes
npm run build:watch
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Deploying

```bash
# 1. Increment version in package.json

# 2. Deploy to CDN
yarn deploy:cdn

# 3. Publish to NPM
npm publish --access public
```

## License

MIT License. See [LICENSE](LICENSE) for details.
