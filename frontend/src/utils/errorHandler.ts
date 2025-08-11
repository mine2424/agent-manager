import toast from 'react-hot-toast';

// Error types
export const ErrorType = {
  NETWORK: 'NETWORK' as const,
  AUTH: 'AUTH' as const,
  VALIDATION: 'VALIDATION' as const,
  FIREBASE: 'FIREBASE' as const,
  EXECUTION: 'EXECUTION' as const,
  UNKNOWN: 'UNKNOWN' as const,
};

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: any;
  recoverable?: boolean;
  userMessage?: string;
}

// Error messages for users
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'ユーザーが見つかりません',
  'auth/wrong-password': 'パスワードが正しくありません',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/user-disabled': 'このアカウントは無効化されています',
  'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
  'auth/weak-password': 'パスワードが弱すぎます',
  'auth/network-request-failed': 'ネットワークエラーが発生しました',
  'auth/too-many-requests': 'リクエストが多すぎます。しばらくしてからお試しください',
  'auth/popup-closed-by-user': 'ログインがキャンセルされました',
  'permission-denied': 'アクセス権限がありません',
  'not-found': 'リソースが見つかりません',
  'already-exists': '既に存在します',
  'resource-exhausted': 'リソースの上限に達しました',
  'failed-precondition': '前提条件を満たしていません',
  'aborted': '処理が中断されました',
  'out-of-range': '範囲外の値です',
  'unimplemented': 'この機能は実装されていません',
  'internal': '内部エラーが発生しました',
  'unavailable': 'サービスが利用できません',
  'data-loss': 'データの損失が発生しました',
  'unauthenticated': '認証が必要です',
};

// Error classification
export function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;
  
  if (error instanceof Error && 'type' in error) {
    return (error as AppError).type;
  }

  // Network errors
  if (
    error.code === 'auth/network-request-failed' ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('ERR_INTERNET_DISCONNECTED')
  ) {
    return ErrorType.NETWORK;
  }

  // Auth errors
  if (error.code?.startsWith('auth/') || error.message?.includes('auth')) {
    return ErrorType.AUTH;
  }

  // Firebase errors
  if (
    error.code?.includes('firestore') ||
    error.code?.includes('storage') ||
    error.message?.includes('Firebase')
  ) {
    return ErrorType.FIREBASE;
  }

  // Validation errors
  if (
    error.name === 'ValidationError' ||
    error.message?.includes('validation') ||
    error.message?.includes('invalid')
  ) {
    return ErrorType.VALIDATION;
  }

  // Execution errors
  if (
    error.message?.includes('execution') ||
    error.message?.includes('Claude') ||
    error.message?.includes('timeout')
  ) {
    return ErrorType.EXECUTION;
  }

  return ErrorType.UNKNOWN;
}

// Convert any error to AppError
export function toAppError(error: any): AppError {
  if (error && typeof error === 'object' && 'type' in error && error.type in ErrorType) {
    return error as AppError;
  }

  const appError = new Error(error.message || 'Unknown error') as AppError;
  appError.type = classifyError(error);
  appError.code = error.code;
  appError.details = error;
  appError.recoverable = isRecoverable(error);
  appError.userMessage = getUserMessage(error);

  // Copy stack trace if available
  if (error.stack) {
    appError.stack = error.stack;
  }

  return appError;
}

// Check if error is recoverable
export function isRecoverable(error: any): boolean {
  const nonRecoverableCodes = [
    'auth/user-disabled',
    'permission-denied',
    'resource-exhausted',
    'data-loss',
  ];

  if (error.code && nonRecoverableCodes.includes(error.code)) {
    return false;
  }

  // Network errors are usually recoverable
  if (classifyError(error) === ErrorType.NETWORK) {
    return true;
  }

  // Auth errors might be recoverable
  if (classifyError(error) === ErrorType.AUTH) {
    return !error.code?.includes('disabled');
  }

  return true;
}

// Get user-friendly error message
export function getUserMessage(error: any): string {
  // Check for predefined messages
  if (error.code && USER_FRIENDLY_MESSAGES[error.code]) {
    return USER_FRIENDLY_MESSAGES[error.code];
  }

  // Check for custom user message
  if (error.userMessage) {
    return error.userMessage;
  }

  // Generate message based on error type
  const errorType = error.type || classifyError(error);
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'ネットワーク接続を確認してください';
    case ErrorType.AUTH:
      return '認証エラーが発生しました';
    case ErrorType.VALIDATION:
      return '入力内容を確認してください';
    case ErrorType.FIREBASE:
      return 'データベースエラーが発生しました';
    case ErrorType.EXECUTION:
      return '実行中にエラーが発生しました';
    default:
      return 'エラーが発生しました';
  }
}

// Global error handler
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason);
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error);
      event.preventDefault();
    });
  }

  handleError(error: any, options?: { silent?: boolean; retry?: () => void }) {
    const appError = toAppError(error);

    // Add to queue
    this.errorQueue.push(appError);

    // Process queue
    this.processErrorQueue(options);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        type: appError.type,
        code: appError.code,
        message: appError.message,
        userMessage: appError.userMessage,
        recoverable: appError.recoverable,
        details: appError.details,
      });
    }
  }

  private async processErrorQueue(options?: { silent?: boolean; retry?: () => void }) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      await this.processError(error, options);
    }

    this.isProcessing = false;
  }

  private async processError(
    error: AppError,
    options?: { silent?: boolean; retry?: () => void }
  ) {
    // Don't show toast if silent
    if (options?.silent) return;

    // Show appropriate toast based on error type
    switch (error.type) {
      case ErrorType.NETWORK:
        toast.error(error.userMessage || 'ネットワークエラー', {
          duration: 5000,
        });
        break;

      case ErrorType.AUTH:
        toast.error(error.userMessage || '認証エラー', {
          duration: 4000,
        });
        break;

      case ErrorType.VALIDATION:
        toast.error(error.userMessage || '入力エラー', {
          duration: 3000,
        });
        break;

      default:
        toast.error(error.userMessage || 'エラーが発生しました', {
          duration: 4000,
        });
    }

    // Log to error service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToErrorService(error);
    }
  }

  private async logToErrorService(_error: AppError) {
    // TODO: Integrate with error tracking service
    // Example: Sentry, LogRocket, etc.
    try {
      // const errorData = {
      //   type: error.type,
      //   code: error.code,
      //   message: error.message,
      //   userMessage: error.userMessage,
      //   stack: error.stack,
      //   details: error.details,
      //   timestamp: new Date().toISOString(),
      //   url: window.location.href,
      //   userAgent: navigator.userAgent,
      // };

      // Send to error tracking service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}

// Create singleton instance
export const errorHandler = GlobalErrorHandler.getInstance();

// Utility function for handling async operations
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    silent?: boolean;
    retry?: () => void;
    fallback?: T;
    errorMessage?: string;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error: any) {
    if (options?.errorMessage) {
      error.userMessage = options.errorMessage;
    }

    errorHandler.handleError(error, {
      silent: options?.silent,
      retry: options?.retry,
    });

    return options?.fallback;
  }
}

// React hook for error handling
export function useErrorHandler() {
  return (error: any, options?: { silent?: boolean; retry?: () => void }) => {
    errorHandler.handleError(error, options);
  };
}