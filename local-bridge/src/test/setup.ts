import { vi } from 'vitest'

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock process.env
process.env.NODE_ENV = 'test'
process.env.PORT = '8080'
process.env.FIREBASE_PROJECT_ID = 'test-project'
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com'
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key'

// Mock timers
vi.useFakeTimers()

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Restore real timers after all tests
afterAll(() => {
  vi.useRealTimers()
})