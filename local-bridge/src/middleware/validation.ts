import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Validation schemas
export const schemas = {
  // Execution validation
  execute: z.object({
    projectId: z.string().min(1).max(100),
    command: z.string().min(1).max(5000),
    targetFiles: z.array(z.string()).optional(),
    workingDirectory: z.string().optional(),
    timeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
  }),

  // File sync validation
  fileSync: z.object({
    projectId: z.string().min(1).max(100),
    files: z.array(
      z.object({
        path: z.string().min(1).max(1000),
        content: z.string().max(10 * 1024 * 1024), // 10MB
        action: z.enum(['create', 'update', 'delete']),
      })
    ),
  }),

  // Authentication validation
  auth: z.object({
    token: z.string().min(1),
  }),

  // Project validation
  project: z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    path: z.string().min(1).max(1000).optional(),
  }),
};

// Sanitization functions
export const sanitizers = {
  // Sanitize file paths to prevent directory traversal
  sanitizePath(path: string): string {
    // Remove any directory traversal attempts
    let sanitized = path.replace(/\.\./g, '');
    
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\0]/g, '');
    
    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');
    
    // Remove duplicate slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    return sanitized.trim();
  },

  // Sanitize command input
  sanitizeCommand(command: string): string {
    // Remove null bytes
    let sanitized = command.replace(/\0/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > 5000) {
      sanitized = sanitized.substring(0, 5000);
    }
    
    return sanitized;
  },

  // Check for dangerous patterns in commands
  containsDangerousPatterns(command: string): boolean {
    const dangerousPatterns = [
      // System modification commands
      /\brm\s+-rf\s+\//i,
      /\bsudo\s+/i,
      /\bchmod\s+777/i,
      /\bchown\s+/i,
      
      // Code execution
      /\beval\s*\(/i,
      /\bexec\s*\(/i,
      /\bsystem\s*\(/i,
      
      // Network access (might be needed, but should be careful)
      /\bcurl\s+.*--output/i,
      /\bwget\s+.*-O/i,
      
      // Environment manipulation
      /\bexport\s+.*PATH/i,
      /\bunset\s+/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
  },
};

// Validation middleware factory
export function validateRequest(schemaName: keyof typeof schemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = schemas[schemaName];
      const validated = await schema.parseAsync(req.body);
      
      // Apply sanitization based on schema
      if (schemaName === 'execute') {
        const execData = validated as z.infer<typeof schemas.execute>;
        // Sanitize command
        execData.command = sanitizers.sanitizeCommand(execData.command);
        
        // Check for dangerous patterns
        if (sanitizers.containsDangerousPatterns(execData.command)) {
          return res.status(400).json({
            error: 'Command contains potentially dangerous patterns',
            code: 'DANGEROUS_COMMAND',
          });
        }
        
        // Sanitize target files if provided
        if (execData.targetFiles) {
          execData.targetFiles = execData.targetFiles.map((file: string) => 
            sanitizers.sanitizePath(file)
          );
        }
        
        // Sanitize working directory if provided
        if (execData.workingDirectory) {
          execData.workingDirectory = sanitizers.sanitizePath(execData.workingDirectory);
        }
        req.body = execData;
      } else if (schemaName === 'fileSync') {
        const fileSyncData = validated as z.infer<typeof schemas.fileSync>;
        // Sanitize file paths
        fileSyncData.files = fileSyncData.files.map((file: any) => ({
          ...file,
          path: sanitizers.sanitizePath(file.path),
        }));
        req.body = fileSyncData;
      } else {
        req.body = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      
      // Pass other errors to error handler
      next(error);
    }
  };
}

// Socket.io validation middleware
export function validateSocketEvent(schemaName: keyof typeof schemas) {
  return async (data: any, callback: (error?: Error) => void) => {
    try {
      const schema = schemas[schemaName];
      const validated = await schema.parseAsync(data);
      
      // Apply same sanitization as HTTP middleware
      if (schemaName === 'execute') {
        const execData = validated as z.infer<typeof schemas.execute>;
        execData.command = sanitizers.sanitizeCommand(execData.command);
        
        if (sanitizers.containsDangerousPatterns(execData.command)) {
          throw new Error('Command contains potentially dangerous patterns');
        }
        
        if (execData.targetFiles) {
          execData.targetFiles = execData.targetFiles.map((file: string) => 
            sanitizers.sanitizePath(file)
          );
        }
        
        if (execData.workingDirectory) {
          execData.workingDirectory = sanitizers.sanitizePath(execData.workingDirectory);
        }
        
        // Replace original data with validated data
        Object.keys(data).forEach(key => delete data[key]);
        Object.assign(data, execData);
      } else {
        // Replace original data with validated data
        Object.keys(data).forEach(key => delete data[key]);
        Object.assign(data, validated);
      }
      
      callback();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodError = error as ZodError;
        callback(new Error(`Validation failed: ${zodError.issues[0].message}`));
      } else {
        callback(error as Error);
      }
    }
  };
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

// In-memory rate limiter (for development)
// In production, use Redis or similar
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests for this key
    const userRequests = this.requests.get(key) || [];
    
    // Filter out old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.config.max) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
    
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

// Rate limiting middleware
export function rateLimit(config: RateLimitConfig) {
  const limiter = new SimpleRateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as key (in production, might want to use user ID)
    const key = req.ip || 'unknown';
    
    if (!limiter.check(key)) {
      return res.status(429).json({
        error: config.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }
    
    next();
  };
}

// Common rate limit configurations
export const rateLimits = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later',
  },
  
  // Execution rate limit (more restrictive)
  execution: {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many execution requests, please wait before trying again',
  },
  
  // File operations rate limit
  fileOps: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many file operations, please slow down',
  },
};