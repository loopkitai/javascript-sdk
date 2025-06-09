# LoopKit JavaScript SDK

A comprehensive JavaScript SDK for LoopKit analytics that works in both browser and Node.js environments.

## Features

- 🚀 **Universal**: Works in browsers, Node.js, and React Native
- 📦 **Lightweight**: Minimal bundle size with zero dependencies
- 🔄 **Batching**: Automatic event batching with configurable thresholds
- 💾 **Persistence**: LocalStorage queue persistence for reliability
- 🔁 **Retry Logic**: Exponential backoff for failed requests
- 🛡️ **Privacy**: Built-in Do Not Track support
- 🐛 **Error Handling**: Comprehensive error tracking and recovery
- 📊 **Debug Mode**: Detailed logging for development
- ⚡ **Performance**: Optimized for high-volume event tracking
- 🎯 **TypeScript**: Full TypeScript definitions included

## Installation

### NPM (Recommended)

```bash
npm install @loopkit/javascript
```

### CDN

```html
<script src="https://cdn.loopkit.ai/javascript/v1/loopkit.min.js"></script>
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

## API Reference

### Initialization

#### `LoopKit.init(apiKey, options?)`

Initialize the SDK with your API key and optional configuration.

```javascript
LoopKit.init('your-api-key', {
  debug: false,
  batchSize: 50,
  flushInterval: 30,
  enableAutoCapture: false,
  enableErrorTracking: false,
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

  // Auto-capture (Browser only)
  enableAutoCapture: false, // Auto-track page views
  enableErrorTracking: false, // Auto-track JS errors

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

## License

MIT License. See [LICENSE](LICENSE) for details.
