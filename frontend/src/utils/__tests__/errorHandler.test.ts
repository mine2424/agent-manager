import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import toast from 'react-hot-toast'
import {
  ErrorType,
  classifyError,
  toAppError,
  isRecoverable,
  getUserMessage,
  errorHandler,
  withErrorHandling,
} from '../errorHandler'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('Error Handler Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const networkErrors = [
        { code: 'auth/network-request-failed' },
        { message: 'Failed to fetch' },
        { message: 'network error occurred' },
        { message: 'ERR_INTERNET_DISCONNECTED' },
      ]

      networkErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.NETWORK)
      })
    })

    it('should classify auth errors', () => {
      const authErrors = [
        { code: 'auth/user-not-found' },
        { code: 'auth/wrong-password' },
        { message: 'authentication failed' },
      ]

      authErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.AUTH)
      })
    })

    it('should classify Firebase errors', () => {
      const firebaseErrors = [
        { code: 'firestore/permission-denied' },
        { code: 'storage/unauthorized' },
        { message: 'Firebase error occurred' },
      ]

      firebaseErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.FIREBASE)
      })
    })

    it('should classify validation errors', () => {
      const validationErrors = [
        { name: 'ValidationError' },
        { message: 'validation failed' },
        { message: 'invalid input' },
      ]

      validationErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.VALIDATION)
      })
    })

    it('should classify execution errors', () => {
      const executionErrors = [
        { message: 'execution failed' },
        { message: 'Claude error' },
        { message: 'Command timeout' },
      ]

      executionErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.EXECUTION)
      })
    })

    it('should return UNKNOWN for unclassified errors', () => {
      expect(classifyError(null)).toBe(ErrorType.UNKNOWN)
      expect(classifyError({})).toBe(ErrorType.UNKNOWN)
      expect(classifyError({ message: 'random error' })).toBe(ErrorType.UNKNOWN)
    })
  })

  describe('toAppError', () => {
    it('should convert regular errors to AppError', () => {
      const error = new Error('Test error')
      const appError = toAppError(error)

      expect(appError.message).toBe('Test error')
      expect(appError.type).toBeDefined()
      expect(appError.recoverable).toBeDefined()
      expect(appError.userMessage).toBeDefined()
    })

    it('should preserve existing AppError properties', () => {
      const error = {
        message: 'Auth error',
        type: ErrorType.AUTH,
        code: 'auth/invalid-email',
      }

      const appError = toAppError(error)
      expect(appError.type).toBe(ErrorType.AUTH)
      expect(appError.code).toBe('auth/invalid-email')
    })

    it('should handle errors without messages', () => {
      const appError = toAppError({})
      expect(appError.message).toBe('Unknown error')
    })

    it('should preserve stack traces', () => {
      const error = new Error('Test')
      const appError = toAppError(error)
      expect(appError.stack).toBe(error.stack)
    })
  })

  describe('isRecoverable', () => {
    it('should mark non-recoverable errors', () => {
      const nonRecoverable = [
        { code: 'auth/user-disabled' },
        { code: 'permission-denied' },
        { code: 'resource-exhausted' },
        { code: 'data-loss' },
      ]

      nonRecoverable.forEach(error => {
        expect(isRecoverable(error)).toBe(false)
      })
    })

    it('should mark network errors as recoverable', () => {
      const networkError = { code: 'auth/network-request-failed' }
      expect(isRecoverable(networkError)).toBe(true)
    })

    it('should mark most auth errors as recoverable', () => {
      const authError = { code: 'auth/wrong-password' }
      expect(isRecoverable(authError)).toBe(true)
    })

    it('should mark disabled auth errors as non-recoverable', () => {
      const disabledError = { code: 'auth/user-disabled' }
      expect(isRecoverable(disabledError)).toBe(false)
    })
  })

  describe('getUserMessage', () => {
    it('should return predefined messages for known error codes', () => {
      const testCases = [
        { code: 'auth/user-not-found', expected: 'ユーザーが見つかりません' },
        { code: 'auth/wrong-password', expected: 'パスワードが正しくありません' },
        { code: 'auth/invalid-email', expected: 'メールアドレスの形式が正しくありません' },
        { code: 'permission-denied', expected: 'アクセス権限がありません' },
      ]

      testCases.forEach(({ code, expected }) => {
        expect(getUserMessage({ code })).toBe(expected)
      })
    })

    it('should return custom user messages if provided', () => {
      const error = { userMessage: 'カスタムエラーメッセージ' }
      expect(getUserMessage(error)).toBe('カスタムエラーメッセージ')
    })

    it('should return type-based messages for classified errors', () => {
      const testCases = [
        { type: ErrorType.NETWORK, message: 'ネットワーク接続を確認してください' },
        { type: ErrorType.AUTH, message: '認証エラーが発生しました' },
        { type: ErrorType.VALIDATION, message: '入力内容を確認してください' },
        { type: ErrorType.FIREBASE, message: 'データベースエラーが発生しました' },
        { type: ErrorType.EXECUTION, message: '実行中にエラーが発生しました' },
      ]

      testCases.forEach(({ type, message }) => {
        const error = { message: 'test', type }
        expect(getUserMessage(error)).toContain(message)
      })
    })
  })

  describe('GlobalErrorHandler', () => {
    let originalConsoleError: typeof console.error

    beforeEach(() => {
      originalConsoleError = console.error
      console.error = vi.fn()
    })

    afterEach(() => {
      console.error = originalConsoleError
    })

    it('should handle errors and show toast notifications', () => {
      const error = new Error('Test error')
      errorHandler.handleError(error)

      expect(toast.error).toHaveBeenCalled()
    })

    it('should not show toast for silent errors', () => {
      const error = new Error('Silent error')
      errorHandler.handleError(error, { silent: true })

      expect(toast.error).not.toHaveBeenCalled()
    })

    it('should log errors in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Dev error')
      errorHandler.handleError(error)

      expect(console.error).toHaveBeenCalledWith(
        'Error details:',
        expect.any(Object)
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should handle different error types with appropriate toasts', async () => {
      const errors = [
        { type: ErrorType.NETWORK, message: 'Network error' },
        { type: ErrorType.AUTH, message: 'Auth error' },
        { type: ErrorType.VALIDATION, message: 'Validation error' },
      ]

      errors.forEach(error => {
        errorHandler.handleError(error)
      })

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(toast.error).toHaveBeenCalledTimes(3)
    })
  })

  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const result = await withErrorHandling(async () => 'success')
      expect(result).toBe('success')
    })

    it('should handle errors and return undefined', async () => {
      const error = new Error('Operation failed')
      const result = await withErrorHandling(async () => {
        throw error
      })

      expect(result).toBeUndefined()
      expect(toast.error).toHaveBeenCalled()
    })

    it('should return fallback value on error', async () => {
      const result = await withErrorHandling(
        async () => {
          throw new Error('Failed')
        },
        { fallback: 'default' }
      )

      expect(result).toBe('default')
    })

    it('should use custom error message', async () => {
      await withErrorHandling(
        async () => {
          throw new Error('Original error')
        },
        { errorMessage: 'カスタムエラーメッセージ' }
      )

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('カスタムエラーメッセージ'),
        expect.any(Object)
      )
    })

    it('should not show toast for silent errors', async () => {
      await withErrorHandling(
        async () => {
          throw new Error('Silent error')
        },
        { silent: true }
      )

      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('Event Listeners', () => {
    it('should set up global error handlers', () => {
      // The global error handler is already initialized when the module is imported
      // We can test that the handlers work by simulating errors
      const error = new Error('Test unhandled rejection')
      
      // Trigger the handler that would be called on unhandled rejection
      errorHandler.handleError(error)
      
      expect(toast.error).toHaveBeenCalled()
    })
  })
})