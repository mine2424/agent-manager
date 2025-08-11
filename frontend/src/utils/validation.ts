// Input validation utilities
import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  projectName: /^[a-zA-Z0-9\s\-_日本語ぁ-んァ-ヶー一-龯]+$/,
  fileName: /^[a-zA-Z0-9\-_\.]+$/,
  filePath: /^(?!\.\.)([a-zA-Z0-9\-_\/\.]+)$/,
};

// Validation messages
const DEFAULT_MESSAGES = {
  required: 'このフィールドは必須です',
  minLength: (min: number) => `${min}文字以上入力してください`,
  maxLength: (max: number) => `${max}文字以内で入力してください`,
  pattern: '正しい形式で入力してください',
  email: '有効なメールアドレスを入力してください',
  url: '有効なURLを入力してください',
};

// Main validation function
export function validate(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const ruleArray = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleArray) {
      const error = validateFieldWithRule(value, rule);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Validate a single field
function validateFieldWithRule(
  value: any,
  rule: ValidationRule
): string | null {
  // Required check
  if (rule.required && !value) {
    return rule.message || DEFAULT_MESSAGES.required;
  }

  // Skip other validations if value is empty and not required
  if (!value && !rule.required) {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    // Min length
    if (rule.minLength && value.length < rule.minLength) {
      return rule.message || DEFAULT_MESSAGES.minLength(rule.minLength);
    }

    // Max length
    if (rule.maxLength && value.length > rule.maxLength) {
      return rule.message || DEFAULT_MESSAGES.maxLength(rule.maxLength);
    }

    // Pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message || DEFAULT_MESSAGES.pattern;
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      return customError;
    }
  }

  return null;
}

// Common validation schemas
export const ValidationSchemas = {
  project: {
    name: [
      {
        required: true,
        minLength: 1,
        maxLength: 100,
      },
      {
        pattern: ValidationPatterns.projectName,
        message: 'プロジェクト名は英数字、日本語、ハイフン、アンダースコアのみ使用できます',
      }
    ],
    description: {
      maxLength: 500,
    },
    githubUrl: {
      pattern: ValidationPatterns.url,
      message: '有効なURLを入力してください',
    },
  },

  file: {
    name: {
      required: true,
      minLength: 1,
      maxLength: 255,
      pattern: ValidationPatterns.fileName,
      message: 'ファイル名は英数字、ハイフン、アンダースコア、ピリオドのみ使用できます',
    },
    path: {
      required: true,
      maxLength: 1000,
      pattern: ValidationPatterns.filePath,
      custom: (value: string) => {
        if (value.includes('..')) {
          return '相対パス("..")は使用できません';
        }
        if (value.startsWith('/')) {
          return 'パスは"/"で始めることはできません';
        }
        return null;
      },
    },
    content: {
      custom: (value: string) => {
        if (typeof value === 'string' && value.length > 10 * 1024 * 1024) {
          return 'ファイルサイズは10MBまでです';
        }
        return null;
      },
    },
  },

  execution: {
    command: {
      required: true,
      minLength: 1,
      maxLength: 5000,
      custom: (value: string) => {
        // Security checks
        const dangerousPatterns = [
          /rm\s+-rf\s+\//,
          /sudo\s+/,
          /chmod\s+777/,
          /eval\s*\(/,
          /exec\s*\(/,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            return '安全でないコマンドが検出されました';
          }
        }
        return null;
      },
    },
  },

  user: {
    email: {
      required: true,
      pattern: ValidationPatterns.email,
      message: DEFAULT_MESSAGES.email,
    },
    displayName: {
      minLength: 1,
      maxLength: 50,
    },
  },
};

// Sanitization functions
export const Sanitizers = {
  // Remove dangerous characters from file paths
  sanitizeFilePath(path: string): string {
    return path
      .replace(/\.\./g, '') // Remove relative paths
      .replace(/[<>:"|?*]/g, '') // Remove invalid characters
      .replace(/\\/g, '/') // Replace backslashes with forward slashes
      .replace(/\/{2,}/g, '/') // Replace multiple slashes
      .replace(/^\//, '') // Remove leading slash
      .trim();
  },

  // Sanitize for Firestore document paths
  sanitizeFirestorePath(path: string): string {
    return path
      .replace(/\//g, '__') // Replace slashes
      .replace(/\./g, '_dot_') // Replace dots
      .replace(/[\[\]]/g, '') // Remove brackets
      .replace(/[@#$%]/g, '_') // Replace special chars with single underscore
      .replace(/[^\w\-_]/g, '') // Remove other special chars
      .substring(0, 1500); // Firestore path limit
  },

  // Escape HTML to prevent XSS
  escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  // Sanitize project name
  sanitizeProjectName(name: string): string {
    return name
      .trim()
      .substring(0, 100)
      .replace(/\s+/g, ' '); // Normalize whitespace
  },

  // Sanitize command input
  sanitizeCommand(command: string): string {
    return command
      .trim()
      .substring(0, 5000)
      .replace(/\0/g, ''); // Remove null bytes
  },
};

// React hook for form validation
export function useValidation<T extends Record<string, any>>(
  schema: ValidationSchema
) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(
    (data: T): boolean => {
      const result = validate(data, schema);
      setErrors(result.errors);
      return result.isValid;
    },
    [schema]
  );

  const validateField = useCallback(
    (fieldName: string, value: any) => {
      const fieldSchema = schema[fieldName];
      if (!fieldSchema) return;

      const rules = Array.isArray(fieldSchema) ? fieldSchema : [fieldSchema];
      let error: string | null = null;

      for (const rule of rules) {
        error = validateFieldWithRule(value, rule);
        if (error) break;
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });
    },
    [schema]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateForm,
    validateField,
    clearErrors,
    clearFieldError,
  };
}