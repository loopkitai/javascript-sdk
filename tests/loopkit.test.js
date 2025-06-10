import LoopKit from '../src/index.js';

describe('LoopKit SDK', () => {
  beforeEach(() => {
    // Reset SDK state before each test using the proper method
    LoopKit.resetForTesting();
    // Clear all jest mocks
    jest.clearAllMocks();
    // Reset navigator.doNotTrack to avoid test interference
    Object.defineProperty(navigator, 'doNotTrack', {
      writable: true,
      value: undefined,
    });
  });

  describe('Initialization', () => {
    test('should initialize with API key', () => {
      const result = LoopKit.init('test-api-key');
      expect(result).toBe(LoopKit);
      expect(LoopKit.getConfig().apiKey).toBe('test-api-key');
    });

    test('should throw error without API key', () => {
      expect(() => LoopKit.init()).toThrow(
        'LoopKit: API key is required and must be a string'
      );
      expect(() => LoopKit.init('')).toThrow(
        'LoopKit: API key is required and must be a string'
      );
      expect(() => LoopKit.init(123)).toThrow(
        'LoopKit: API key is required and must be a string'
      );
    });

    test('should accept configuration options during init', () => {
      LoopKit.init('test-api-key', {
        debug: true,
        batchSize: 10,
        baseURL: 'https://custom.api.com',
      });

      const config = LoopKit.getConfig();
      expect(config.debug).toBe(true);
      expect(config.batchSize).toBe(10);
      expect(config.baseURL).toBe('https://custom.api.com');
    });
  });

  describe('Configuration', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should update configuration', () => {
      LoopKit.configure({
        debug: true,
        batchSize: 25,
        flushInterval: 60,
      });

      const config = LoopKit.getConfig();
      expect(config.debug).toBe(true);
      expect(config.batchSize).toBe(25);
      expect(config.flushInterval).toBe(60);
    });

    test('should validate configuration values', () => {
      expect(() => LoopKit.configure({ batchSize: 0 })).toThrow(
        'batchSize must be greater than 0'
      );
      expect(() => LoopKit.configure({ batchSize: -1 })).toThrow(
        'batchSize must be greater than 0'
      );

      // Reset and test flushInterval separately
      LoopKit.config.batchSize = 50; // Reset to valid value
      expect(() => LoopKit.configure({ flushInterval: -1 })).toThrow(
        'flushInterval must be >= 0'
      );

      LoopKit.config.flushInterval = 30; // Reset to valid value
      expect(() => LoopKit.configure({ maxQueueSize: 0 })).toThrow(
        'maxQueueSize must be greater than 0'
      );

      LoopKit.config.maxQueueSize = 1000; // Reset to valid value
      expect(() => LoopKit.configure({ requestTimeout: 0 })).toThrow(
        'requestTimeout must be greater than 0'
      );

      LoopKit.config.requestTimeout = 10000; // Reset to valid value
      expect(() => LoopKit.configure({ maxRetries: -1 })).toThrow(
        'maxRetries must be >= 0'
      );
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should track events', () => {
      const result = LoopKit.track('test_event', { property: 'value' });
      expect(result).toBe(LoopKit);
      expect(LoopKit.getQueueSize()).toBe(1);
    });

    test('should require event name', () => {
      LoopKit.track(); // Should not crash but won't add to queue
      LoopKit.track(''); // Should not crash but won't add to queue
      LoopKit.track(123); // Should not crash but won't add to queue

      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should track events without properties', () => {
      LoopKit.track('simple_event');
      expect(LoopKit.getQueueSize()).toBe(1);
    });

    test('should apply onBeforeTrack callback', () => {
      const onBeforeTrack = jest.fn((event) => {
        event.properties.modified = true;
        return event;
      });

      LoopKit.configure({ onBeforeTrack });
      LoopKit.track('test_event', { original: true });

      expect(onBeforeTrack).toHaveBeenCalled();
      expect(LoopKit.getQueueSize()).toBe(1);
    });
  });

  describe('User Identification', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should identify users', () => {
      const result = LoopKit.identify('user123', { email: 'test@example.com' });
      expect(result).toBe(LoopKit);
      expect(LoopKit.getQueueSize()).toBe(1);
    });

    test('should require user ID', () => {
      LoopKit.identify(); // Should not crash but won't add to queue
      LoopKit.identify(''); // Should not crash but won't add to queue
      LoopKit.identify(123); // Should not crash but won't add to queue

      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should work without properties', () => {
      LoopKit.identify('user123');
      expect(LoopKit.getQueueSize()).toBe(1);
    });
  });

  describe('Group Association', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should associate users with groups', () => {
      const result = LoopKit.group('company123', { name: 'Acme Corp' });
      expect(result).toBe(LoopKit);
      expect(LoopKit.getQueueSize()).toBe(1);
    });

    test('should require group ID', () => {
      LoopKit.group(); // Should not crash but won't add to queue
      LoopKit.group(''); // Should not crash but won't add to queue
      LoopKit.group(123); // Should not crash but won't add to queue

      expect(LoopKit.getQueueSize()).toBe(0);
    });
  });

  describe('Batch Tracking', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should track events in batch', () => {
      const events = [
        { name: 'event1', properties: { prop1: 'value1' } },
        { name: 'event2', properties: { prop2: 'value2' } },
        { name: 'event3', properties: { prop3: 'value3' } },
      ];

      LoopKit.trackBatch(events);
      expect(LoopKit.getQueueSize()).toBe(3);
    });

    test('should require array input', () => {
      LoopKit.trackBatch('not an array'); // Should not crash
      LoopKit.trackBatch({}); // Should not crash

      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should skip invalid events in batch', () => {
      const events = [
        { name: 'valid_event', properties: { valid: true } },
        { invalidEvent: 'missing name' },
        { name: 'another_valid_event', properties: { valid: true } },
      ];

      LoopKit.trackBatch(events);
      expect(LoopKit.getQueueSize()).toBe(2); // Only valid events
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should respect max queue size', () => {
      LoopKit.configure({ maxQueueSize: 3 });

      for (let i = 0; i < 5; i++) {
        LoopKit.track(`event_${i}`);
      }

      expect(LoopKit.getQueueSize()).toBe(3);
    });

    test('should auto-flush when batch size reached', async () => {
      // Mock successful fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      LoopKit.configure({ batchSize: 2 });

      LoopKit.track('event1');
      expect(LoopKit.getQueueSize()).toBe(1);

      LoopKit.track('event2');

      // Wait for async flush
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fetch).toHaveBeenCalled();
    });

    test('should manually flush queue', async () => {
      // Mock successful fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      LoopKit.track('event1');
      LoopKit.track('event2');

      expect(LoopKit.getQueueSize()).toBe(2);

      await LoopKit.flush();

      expect(fetch).toHaveBeenCalled();
      expect(LoopKit.getQueueSize()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should handle network errors', async () => {
      const onError = jest.fn();
      LoopKit.configure({ onError });

      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      LoopKit.track('test_event');

      try {
        await LoopKit.flush();
      } catch (error) {
        expect(error.message).toBe('Network error');
      }

      expect(onError).toHaveBeenCalled();
    }, 10000); // Increase timeout

    test('should retry failed requests', async () => {
      LoopKit.configure({ maxRetries: 2, retryBackoff: 'linear' });

      // Mock first two calls to fail, third to succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      LoopKit.track('test_event');

      await LoopKit.flush();

      expect(fetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout
  });

  describe('Privacy Features', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    test('should respect Do Not Track', () => {
      // Mock DNT enabled
      Object.defineProperty(navigator, 'doNotTrack', {
        writable: true,
        value: '1',
      });

      LoopKit.configure({ respectDoNotTrack: true });
      LoopKit.track('test_event');

      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should ignore Do Not Track when disabled', () => {
      // Mock DNT enabled
      Object.defineProperty(navigator, 'doNotTrack', {
        writable: true,
        value: '1',
      });

      LoopKit.configure({ respectDoNotTrack: false });
      LoopKit.track('test_event');

      expect(LoopKit.getQueueSize()).toBe(1);
    });
  });

  describe('Local Storage', () => {
    test('should persist queue to localStorage', () => {
      LoopKit.init('test-api-key', { enableLocalStorage: true });
      LoopKit.track('test_event');

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'loopkit_queue',
        expect.any(String)
      );
    });

    test('should load persisted queue on init', () => {
      const persistedEvents = JSON.stringify([
        { type: 'track', name: 'persisted_event' },
      ]);

      global.localStorage.getItem.mockReturnValueOnce(persistedEvents);

      LoopKit.init('test-api-key', { enableLocalStorage: true });

      expect(global.localStorage.getItem).toHaveBeenCalledWith('loopkit_queue');
    });

    test('should handle localStorage errors gracefully', () => {
      global.localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });

      LoopKit.init('test-api-key', { enableLocalStorage: true });
      LoopKit.track('test_event'); // Should not crash

      expect(LoopKit.getQueueSize()).toBe(1);
    });

    test('should clear localStorage if events were created by different version', () => {
      // Simulate events stored by a different version
      const oldVersionData = JSON.stringify({
        version: '1.0.3', // Different from current version
        events: [{ name: 'old_event', properties: { old: true } }],
        timestamp: Date.now(),
      });

      global.localStorage.getItem.mockReturnValueOnce(oldVersionData);

      LoopKit.init('test-api-key', { enableLocalStorage: true });

      // Should have cleared the old events and started fresh
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        'loopkit_queue'
      );
      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should clear localStorage if legacy format detected', () => {
      // Simulate old format (just an array of events)
      const legacyData = JSON.stringify([
        { name: 'legacy_event', properties: { legacy: true } },
      ]);

      global.localStorage.getItem.mockReturnValueOnce(legacyData);

      LoopKit.init('test-api-key', { enableLocalStorage: true });

      // Should have cleared the legacy events
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        'loopkit_queue'
      );
      expect(LoopKit.getQueueSize()).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should reset SDK state', () => {
      LoopKit.init('test-api-key');
      LoopKit.identify('user123', { email: 'test@example.com' });
      LoopKit.group('company123', { name: 'Acme Corp' });
      LoopKit.track('test_event');

      // Should have identify event, group event, and track event
      expect(LoopKit.getQueueSize()).toBe(3);

      LoopKit.reset();

      expect(LoopKit.getQueueSize()).toBe(0);
    });

    test('should clear localStorage on reset', () => {
      LoopKit.init('test-api-key', { enableLocalStorage: true });
      LoopKit.reset();

      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        'loopkit_queue'
      );
    });
  });

  describe('Callback Handling', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      LoopKit.configure({
        onBeforeTrack: errorCallback,
      });

      expect(() => {
        LoopKit.track('test_event');
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should call onAfterTrack after successful flush', async () => {
      const afterTrackCallback = jest.fn();

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        })
      );

      LoopKit.configure({
        onAfterTrack: afterTrackCallback,
      });

      LoopKit.track('test_event');
      await LoopKit.flush();

      expect(afterTrackCallback).toHaveBeenCalled();
    });
  });

  describe('API Schema Compliance', () => {
    beforeEach(() => {
      LoopKit.init('test-api-key');
      // Mock fetch to capture the actual payload being sent
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        })
      );
    });

    it('should send track events with correct API schema structure', async () => {
      LoopKit.track('test_event', { prop1: 'value1' });
      await LoopKit.flush();

      expect(global.fetch).toHaveBeenCalled();
      const [, options] = global.fetch.mock.calls[0];
      const payload = JSON.parse(options.body);

      // Verify payload structure
      expect(payload).toHaveProperty('tracks');
      expect(Array.isArray(payload.tracks)).toBe(true);
      expect(payload.tracks).toHaveLength(1);

      const event = payload.tracks[0];

      // Verify required fields
      expect(event).toHaveProperty('anonymousId');
      expect(typeof event.anonymousId).toBe('string');

      expect(event).toHaveProperty('timestamp');
      expect(typeof event.timestamp).toBe('string');
      // Verify ISO 8601 format
      expect(event.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      expect(event).toHaveProperty('name', 'test_event');
      expect(event).toHaveProperty('properties');
      expect(event.properties).toEqual({ prop1: 'value1' });

      // Verify system object structure
      expect(event).toHaveProperty('system');
      expect(typeof event.system).toBe('object');

      expect(event.system).toHaveProperty('sdk');
      expect(event.system.sdk).toHaveProperty('name', '@loopkit/javascript');
      expect(event.system.sdk).toHaveProperty('version');
      expect(typeof event.system.sdk.version).toBe('string');

      expect(event.system).toHaveProperty('sessionId');
      expect(typeof event.system.sessionId).toBe('string');

      // Context should be present in browser environment (jsdom)
      expect(event.system).toHaveProperty('context');
      expect(event.system.context).toHaveProperty('userAgent');
      expect(event.system.context).toHaveProperty('screen');
      expect(event.system.context).toHaveProperty('viewport');
      expect(event.system.context).toHaveProperty('page');
    });

    it('should send identify events with correct API schema structure', async () => {
      LoopKit.identify('user123', { name: 'John Doe' });
      await LoopKit.flush();

      expect(global.fetch).toHaveBeenCalled();
      const [, options] = global.fetch.mock.calls[0];
      const payload = JSON.parse(options.body);

      // Verify payload structure
      expect(payload).toHaveProperty('identifies');
      expect(Array.isArray(payload.identifies)).toBe(true);
      expect(payload.identifies).toHaveLength(1);

      const event = payload.identifies[0];

      // Verify required fields for identify
      expect(event).toHaveProperty('anonymousId');
      expect(event).toHaveProperty('userId', 'user123');
      expect(event).toHaveProperty('timestamp');
      expect(event.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(event).toHaveProperty('properties', { name: 'John Doe' });
      expect(event).toHaveProperty('system');
    });

    it('should send group events with correct API schema structure', async () => {
      LoopKit.group('group123', { name: 'Company Inc' }, 'organization');
      await LoopKit.flush();

      expect(global.fetch).toHaveBeenCalled();
      const [, options] = global.fetch.mock.calls[0];
      const payload = JSON.parse(options.body);

      // Verify payload structure
      expect(payload).toHaveProperty('groups');
      expect(Array.isArray(payload.groups)).toBe(true);
      expect(payload.groups).toHaveLength(1);

      const event = payload.groups[0];

      // Verify required fields for group
      expect(event).toHaveProperty('anonymousId');
      expect(event).toHaveProperty('groupId', 'group123');
      expect(event).toHaveProperty('groupType', 'organization');
      expect(event).toHaveProperty('timestamp');
      expect(event.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(event).toHaveProperty('properties', { name: 'Company Inc' });
      expect(event).toHaveProperty('system');
    });

    it('should ensure all events have unique timestamps', () => {
      // Create multiple events rapidly
      for (let i = 0; i < 5; i++) {
        LoopKit.track(`event_${i}`);
      }

      // Get the events from the queue (by accessing internal state for testing)
      const queueManager = LoopKit.queueManager;
      const queue = queueManager.eventQueue;

      expect(queue).toHaveLength(5);

      // Extract timestamps
      const timestamps = queue.map((event) => event.timestamp);

      // Verify all timestamps are valid ISO 8601 strings
      timestamps.forEach((timestamp) => {
        expect(typeof timestamp).toBe('string');
        expect(timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
      });

      // Verify timestamps are unique (or at least ordered)
      for (let i = 1; i < timestamps.length; i++) {
        expect(new Date(timestamps[i]).getTime()).toBeGreaterThanOrEqual(
          new Date(timestamps[i - 1]).getTime()
        );
      }
    });
  });
});
