// Mock fetch for testing
global.fetch = jest.fn();

// Mock localStorage with proper jest mock functions
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock localStorage globally
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock navigator
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn(() => true),
});

Object.defineProperty(navigator, 'doNotTrack', {
  writable: true,
  value: '0',
});

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Test)',
});

// Mock window properties
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost/',
    pathname: '/',
    search: '',
  },
  writable: true,
});

Object.defineProperty(window, 'screen', {
  value: {
    width: 1920,
    height: 1080,
  },
  writable: true,
});

Object.defineProperty(window, 'innerWidth', {
  value: 1920,
  writable: true,
});

Object.defineProperty(window, 'innerHeight', {
  value: 1080,
  writable: true,
});

// Mock document
Object.defineProperty(document, 'title', {
  value: 'Test Page',
  writable: true,
});

Object.defineProperty(document, 'referrer', {
  value: '',
  writable: true,
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  navigator.sendBeacon.mockClear();

  // Reset localStorage store
  localStorageMock.clear();
});
