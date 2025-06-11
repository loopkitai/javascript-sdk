# LoopKit JavaScript SDK

A complete analytics SDK for tracking events, user identification, and behavioral analytics in web applications. Now built with **TypeScript** for better developer experience and type safety.

## Features

- **🔧 TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **📊 Event Tracking**: Track custom events with properties
- **👤 User Identification**: Identify users and track their journey
- **👥 Group Analytics**: Associate users with organizations/groups
- **🔄 Zero-Config Auto Tracking**: Automatic page views, clicks, and error tracking (enabled by default)
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

// Initialize - auto tracking starts immediately!
LoopKit.init('your-api-key-here');
// ✅ automatically tracking page views, clicks, and errors

// Track custom events manually
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

## Auto Tracking Features (Enabled by Default)

LoopKit automatically tracks common user interactions and events out of the box. **All auto tracking features are enabled by default** for zero-configuration setup:

### 📋 Quick Reference

| Feature                   | Default   | Event Type  | Description                      |
| ------------------------- | --------- | ----------- | -------------------------------- |
| `enableAutoCapture`       | ✅ `true` | `page_view` | Page loads and navigation        |
| `enableAutoClickTracking` | ✅ `true` | `click`     | Button, link, and element clicks |
| `enableErrorTracking`     | ✅ `true` | `error`     | JavaScript errors and exceptions |

### 📊 **Page View Tracking** (`enableAutoCapture: true`)

- **What it tracks**: Automatically captures page views on initial load and navigation
- **Events generated**: `page_view` events with URL, path, title, and referrer
- **When it triggers**:
  - Initial page load
  - Browser navigation (back/forward buttons)
  - Single Page App (SPA) route changes
- **Event properties**: `url`, `path`, `search`, `title`, `referrer`

### 🖱️ **Click Tracking** (`enableAutoClickTracking: true`)

- **What it tracks**: Automatically captures clicks on interactive elements
- **Events generated**: `click` events with element details and page context
- **Elements tracked**: Buttons, links, form inputs, and clickable elements
- **Event properties**: `element_type`, `element_text`, `element_id`, `element_class`, `element_tag`, `element_href`, `page`, `page_title`, `page_url`, `position`

### 🚨 **Error Tracking** (`enableErrorTracking: true`)

- **What it tracks**: Automatically captures JavaScript errors and exceptions
- **Events generated**: `error` events with error details and stack traces
- **Error types**: Runtime errors, syntax errors, and unhandled promise rejections
- **Event properties**: `message`, `filename`, `lineno`, `colno`, `stack`, `timestamp`

### Zero-Config Example

```javascript
// Just initialize with your API key - auto tracking starts immediately!
LoopKit.init('your-api-key');

// The SDK will now automatically track:
// ✅ Page views when users navigate
// ✅ Clicks on buttons, links, etc.
// ✅ JavaScript errors that occur
// ✅ Session management
```

### Customizing Auto Tracking

You can disable specific auto tracking features if needed:

```javascript
LoopKit.init('your-api-key', {
  enableAutoCapture: false, // Disable page view tracking
  enableAutoClickTracking: false, // Disable click tracking
  enableErrorTracking: false, // Disable error tracking
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

  // Auto tracking (all enabled by default)
  enableAutoCapture: true, // Page view tracking
  enableAutoClickTracking: true, // Click tracking
  enableErrorTracking: true, // Error tracking

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
- **User Identification**: `POST /identifies` with payload `{ identifies: [...] }`
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

  // Auto tracking features (enabled by default - shown here for reference)
  enableAutoCapture: true, // Auto page view tracking
  enableAutoClickTracking: true, // Auto click tracking
  enableErrorTracking: true, // Auto error tracking
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
