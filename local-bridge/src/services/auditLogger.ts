import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_FAILED = 'AUTH_FAILED',
  
  // Project events
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  PROJECT_ACCESS = 'PROJECT_ACCESS',
  
  // File events
  FILE_CREATE = 'FILE_CREATE',
  FILE_UPDATE = 'FILE_UPDATE',
  FILE_DELETE = 'FILE_DELETE',
  FILE_ACCESS = 'FILE_ACCESS',
  
  // Execution events
  EXECUTION_START = 'EXECUTION_START',
  EXECUTION_SUCCESS = 'EXECUTION_SUCCESS',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  
  // Security events
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  details?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  success: boolean;
}

class AuditLogger {
  private logDir: string;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;

  constructor() {
    this.logDir = path.dirname(config.logging.filePath);
    this.currentLogFile = this.getLogFileName();
    this.ensureLogDirectory();
    
    if (config.features.auditLog) {
      this.initializeWriteStream();
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `audit-${date}.log`);
  }

  private initializeWriteStream(): void {
    const fileName = this.getLogFileName();
    
    // Close existing stream if log file has changed (new day)
    if (this.currentLogFile !== fileName && this.writeStream) {
      this.writeStream.end();
    }
    
    this.currentLogFile = fileName;
    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public log(
    eventType: AuditEventType,
    options: Partial<Omit<AuditLogEntry, 'id' | 'timestamp' | 'eventType'>>
  ): void {
    if (!config.features.auditLog) {
      return;
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: options.severity || 'info',
      success: options.success !== undefined ? options.success : true,
      ...options,
    };

    this.writeLog(entry);
    
    // Also log to console in development
    if (config.server.isDevelopment) {
      this.consoleLog(entry);
    }

    // For critical events, also write to error log
    if (entry.severity === 'critical') {
      this.logCriticalEvent(entry);
    }
  }

  private writeLog(entry: AuditLogEntry): void {
    if (!this.writeStream) {
      this.initializeWriteStream();
    }

    const logLine = JSON.stringify(entry) + '\n';
    this.writeStream?.write(logLine);
  }

  private consoleLog(entry: AuditLogEntry): void {
    const emoji = this.getEmoji(entry.severity, entry.success);
    const color = this.getColor(entry.severity);
    
    console.log(
      `${emoji} [AUDIT] ${entry.eventType}`,
      color,
      {
        userId: entry.userId,
        resource: entry.resource,
        details: entry.details,
      }
    );
  }

  private getEmoji(severity: string, success: boolean): string {
    if (!success) return '❌';
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '⚠️';
      case 'warning': return '⚡';
      default: return '✅';
    }
  }

  private getColor(severity: string): string {
    switch (severity) {
      case 'critical': return '\x1b[91m'; // Bright red
      case 'error': return '\x1b[31m';    // Red
      case 'warning': return '\x1b[33m';  // Yellow
      default: return '\x1b[32m';         // Green
    }
  }

  private logCriticalEvent(entry: AuditLogEntry): void {
    const errorLogFile = path.join(this.logDir, 'critical-events.log');
    const logLine = `[${entry.timestamp}] ${entry.eventType}: ${JSON.stringify(entry)}\n`;
    
    fs.appendFileSync(errorLogFile, logLine);
  }

  // Helper methods for common audit events
  public logAuth(
    type: 'login' | 'logout' | 'failed',
    userId?: string,
    email?: string,
    ipAddress?: string,
    success: boolean = true
  ): void {
    const eventMap = {
      login: AuditEventType.AUTH_LOGIN,
      logout: AuditEventType.AUTH_LOGOUT,
      failed: AuditEventType.AUTH_FAILED,
    };

    this.log(eventMap[type], {
      userId,
      userEmail: email,
      ipAddress,
      success,
      severity: type === 'failed' ? 'warning' : 'info',
    });
  }

  public logProjectAction(
    action: 'create' | 'update' | 'delete' | 'access',
    projectId: string,
    projectName: string,
    userId: string,
    details?: Record<string, any>
  ): void {
    const eventMap = {
      create: AuditEventType.PROJECT_CREATE,
      update: AuditEventType.PROJECT_UPDATE,
      delete: AuditEventType.PROJECT_DELETE,
      access: AuditEventType.PROJECT_ACCESS,
    };

    this.log(eventMap[action], {
      userId,
      resource: {
        type: 'project',
        id: projectId,
        name: projectName,
      },
      details,
      severity: action === 'delete' ? 'warning' : 'info',
    });
  }

  public logFileAction(
    action: 'create' | 'update' | 'delete' | 'access',
    fileId: string,
    fileName: string,
    userId: string,
    projectId?: string
  ): void {
    const eventMap = {
      create: AuditEventType.FILE_CREATE,
      update: AuditEventType.FILE_UPDATE,
      delete: AuditEventType.FILE_DELETE,
      access: AuditEventType.FILE_ACCESS,
    };

    this.log(eventMap[action], {
      userId,
      resource: {
        type: 'file',
        id: fileId,
        name: fileName,
      },
      details: { projectId },
      severity: action === 'delete' ? 'warning' : 'info',
    });
  }

  public logExecution(
    status: 'start' | 'success' | 'failed' | 'timeout',
    command: string,
    userId: string,
    projectId: string,
    executionTime?: number,
    error?: string
  ): void {
    const eventMap = {
      start: AuditEventType.EXECUTION_START,
      success: AuditEventType.EXECUTION_SUCCESS,
      failed: AuditEventType.EXECUTION_FAILED,
      timeout: AuditEventType.EXECUTION_TIMEOUT,
    };

    this.log(eventMap[status], {
      userId,
      resource: {
        type: 'execution',
        id: `exec-${Date.now()}`,
        name: command.substring(0, 100), // Truncate long commands
      },
      details: {
        projectId,
        executionTime,
        error,
        fullCommand: command,
      },
      success: status === 'success',
      severity: status === 'failed' || status === 'timeout' ? 'error' : 'info',
    });
  }

  public logSecurityEvent(
    type: 'violation' | 'rate_limit' | 'invalid_input' | 'unauthorized',
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): void {
    const eventMap = {
      violation: AuditEventType.SECURITY_VIOLATION,
      rate_limit: AuditEventType.RATE_LIMIT_EXCEEDED,
      invalid_input: AuditEventType.INVALID_INPUT,
      unauthorized: AuditEventType.UNAUTHORIZED_ACCESS,
    };

    this.log(eventMap[type], {
      userId,
      ipAddress,
      details,
      success: false,
      severity: type === 'violation' || type === 'unauthorized' ? 'critical' : 'warning',
    });
  }

  // Query methods for retrieving audit logs
  public async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    const logs: AuditLogEntry[] = [];
    const logFile = this.currentLogFile;

    if (!fs.existsSync(logFile)) {
      return logs;
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (let i = Math.max(0, lines.length - limit); i < lines.length; i++) {
      try {
        logs.push(JSON.parse(lines[i]));
      } catch (error) {
        // Skip malformed log entries
      }
    }

    return logs;
  }

  public async searchLogs(
    criteria: Partial<{
      eventType: AuditEventType;
      userId: string;
      startDate: Date;
      endDate: Date;
      severity: string;
    }>
  ): Promise<AuditLogEntry[]> {
    const logs: AuditLogEntry[] = [];
    const files = this.getLogFilesInRange(criteria.startDate, criteria.endDate);

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;
          
          if (this.matchesCriteria(entry, criteria)) {
            logs.push(entry);
          }
        } catch (error) {
          // Skip malformed entries
        }
      }
    }

    return logs;
  }

  private getLogFilesInRange(startDate?: Date, endDate?: Date): string[] {
    const files: string[] = [];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days
    const end = endDate || new Date();

    const current = new Date(start);
    while (current <= end) {
      const fileName = `audit-${current.toISOString().split('T')[0]}.log`;
      files.push(path.join(this.logDir, fileName));
      current.setDate(current.getDate() + 1);
    }

    return files;
  }

  private matchesCriteria(
    entry: AuditLogEntry,
    criteria: Partial<{
      eventType: AuditEventType;
      userId: string;
      severity: string;
    }>
  ): boolean {
    if (criteria.eventType && entry.eventType !== criteria.eventType) return false;
    if (criteria.userId && entry.userId !== criteria.userId) return false;
    if (criteria.severity && entry.severity !== criteria.severity) return false;
    
    return true;
  }

  // Cleanup old logs
  public cleanupOldLogs(daysToKeep: number = 90): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(this.logDir);

    for (const file of files) {
      if (!file.startsWith('audit-')) continue;

      const match = file.match(/audit-(\d{4}-\d{2}-\d{2})\.log/);
      if (!match) continue;

      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        fs.unlinkSync(path.join(this.logDir, file));
        console.log(`Cleaned up old audit log: ${file}`);
      }
    }
  }

  // Graceful shutdown
  public close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();