import { EventEmitter } from 'events';
import * as os from 'os';
import { logger } from './logger';

interface PerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  process: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    pid: number;
  };
  api: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    activeConnections: number;
  };
  execution: {
    totalExecutions: number;
    activeExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  };
  websocket: {
    connectedClients: number;
    messagesReceived: number;
    messagesSent: number;
    averageLatency: number;
  };
  files: {
    totalFiles: number;
    totalSize: number;
    uploadCount: number;
    downloadCount: number;
  };
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  statusCode?: number;
  method: string;
  path: string;
  error?: string;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private requestMetrics: Map<string, RequestMetrics> = new Map();
  private executionMetrics: Map<string, { startTime: number; endTime?: number; success?: boolean }> = new Map();
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private collectionInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor() {
    super();
    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();
    this.startCollection();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      cpu: {
        usage: 0,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      process: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      api: {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        activeConnections: 0
      },
      execution: {
        totalExecutions: 0,
        activeExecutions: 0,
        averageExecutionTime: 0,
        successRate: 100
      },
      websocket: {
        connectedClients: 0,
        messagesReceived: 0,
        messagesSent: 0,
        averageLatency: 0
      },
      files: {
        totalFiles: 0,
        totalSize: 0,
        uploadCount: 0,
        downloadCount: 0
      }
    };
  }

  /**
   * Start collecting metrics at regular intervals
   */
  private startCollection(intervalMs: number = 10000): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop collecting metrics
   */
  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Collect current system metrics
   */
  private collectMetrics(): void {
    const cpuUsage = this.calculateCPUUsage();
    const memInfo = this.getMemoryInfo();

    this.metrics = {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      memory: memInfo,
      process: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      api: this.calculateAPIMetrics(),
      execution: this.calculateExecutionMetrics(),
      websocket: this.metrics.websocket, // Keep existing WebSocket metrics
      files: this.metrics.files // Keep existing file metrics
    };

    // Add to history
    this.metricsHistory.push({ ...this.metrics });
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Emit metrics update event
    this.emit('metrics', this.metrics);

    // Log high-level metrics periodically
    if (Date.now() - this.startTime > 0 && (Date.now() - this.startTime) % 60000 < 10000) {
      logger.info('Performance metrics', {
        cpu: `${cpuUsage.toFixed(2)}%`,
        memory: `${memInfo.percentage.toFixed(2)}%`,
        activeConnections: this.metrics.api.activeConnections,
        activeExecutions: this.metrics.execution.activeExecutions
      });
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = (used / total) * 100;

    return { total, free, used, percentage };
  }

  /**
   * Calculate API metrics from request history
   */
  private calculateAPIMetrics() {
    const requests = Array.from(this.requestMetrics.values());
    const completedRequests = requests.filter(r => r.endTime);
    const errorRequests = requests.filter(r => r.statusCode && r.statusCode >= 400);
    const activeRequests = requests.filter(r => !r.endTime);

    let totalResponseTime = 0;
    completedRequests.forEach(r => {
      if (r.endTime && r.startTime) {
        totalResponseTime += r.endTime - r.startTime;
      }
    });

    return {
      requestCount: requests.length,
      errorCount: errorRequests.length,
      averageResponseTime: completedRequests.length > 0 
        ? totalResponseTime / completedRequests.length 
        : 0,
      activeConnections: activeRequests.length
    };
  }

  /**
   * Calculate execution metrics
   */
  private calculateExecutionMetrics() {
    const executions = Array.from(this.executionMetrics.values());
    const completedExecutions = executions.filter(e => e.endTime);
    const activeExecutions = executions.filter(e => !e.endTime);
    const successfulExecutions = completedExecutions.filter(e => e.success);

    let totalExecutionTime = 0;
    completedExecutions.forEach(e => {
      if (e.endTime && e.startTime) {
        totalExecutionTime += e.endTime - e.startTime;
      }
    });

    return {
      totalExecutions: executions.length,
      activeExecutions: activeExecutions.length,
      averageExecutionTime: completedExecutions.length > 0
        ? totalExecutionTime / completedExecutions.length
        : 0,
      successRate: completedExecutions.length > 0
        ? (successfulExecutions.length / completedExecutions.length) * 100
        : 100
    };
  }

  /**
   * Track API request
   */
  public trackRequest(requestId: string, method: string, path: string): void {
    this.requestMetrics.set(requestId, {
      startTime: Date.now(),
      method,
      path
    });

    // Clean up old requests (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    for (const [id, metrics] of this.requestMetrics.entries()) {
      if (metrics.startTime < fiveMinutesAgo) {
        this.requestMetrics.delete(id);
      }
    }
  }

  /**
   * Complete API request tracking
   */
  public completeRequest(requestId: string, statusCode: number, error?: string): void {
    const request = this.requestMetrics.get(requestId);
    if (request) {
      request.endTime = Date.now();
      request.statusCode = statusCode;
      if (error) {
        request.error = error;
      }
    }
  }

  /**
   * Track execution start
   */
  public trackExecutionStart(executionId: string): void {
    this.executionMetrics.set(executionId, {
      startTime: Date.now()
    });
    this.metrics.execution.activeExecutions++;
  }

  /**
   * Track execution completion
   */
  public trackExecutionComplete(executionId: string, success: boolean): void {
    const execution = this.executionMetrics.get(executionId);
    if (execution) {
      execution.endTime = Date.now();
      execution.success = success;
      this.metrics.execution.activeExecutions = Math.max(0, this.metrics.execution.activeExecutions - 1);
    }

    // Clean up old executions (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 600000;
    for (const [id, metrics] of this.executionMetrics.entries()) {
      if (metrics.startTime < tenMinutesAgo) {
        this.executionMetrics.delete(id);
      }
    }
  }

  /**
   * Update WebSocket metrics
   */
  public updateWebSocketMetrics(metrics: Partial<PerformanceMetrics['websocket']>): void {
    this.metrics.websocket = {
      ...this.metrics.websocket,
      ...metrics
    };
  }

  /**
   * Update file metrics
   */
  public updateFileMetrics(metrics: Partial<PerformanceMetrics['files']>): void {
    this.metrics.files = {
      ...this.metrics.files,
      ...metrics
    };
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get health status based on metrics
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check CPU usage
    if (this.metrics.cpu.usage > 90) {
      issues.push('High CPU usage');
      status = 'unhealthy';
    } else if (this.metrics.cpu.usage > 70) {
      issues.push('Elevated CPU usage');
      if (status === 'healthy') status = 'degraded';
    }

    // Check memory usage
    if (this.metrics.memory.percentage > 90) {
      issues.push('High memory usage');
      status = 'unhealthy';
    } else if (this.metrics.memory.percentage > 70) {
      issues.push('Elevated memory usage');
      if (status === 'healthy') status = 'degraded';
    }

    // Check API error rate
    const errorRate = this.metrics.api.requestCount > 0
      ? (this.metrics.api.errorCount / this.metrics.api.requestCount) * 100
      : 0;
    if (errorRate > 10) {
      issues.push('High API error rate');
      if (status === 'healthy') status = 'degraded';
    }

    // Check execution success rate
    if (this.metrics.execution.successRate < 80) {
      issues.push('Low execution success rate');
      if (status === 'healthy') status = 'degraded';
    }

    // Check response time
    if (this.metrics.api.averageResponseTime > 5000) {
      issues.push('Slow API response times');
      if (status === 'healthy') status = 'degraded';
    }

    return { status, issues };
  }

  /**
   * Export metrics as JSON
   */
  public exportMetrics(): string {
    return JSON.stringify({
      current: this.metrics,
      history: this.metricsHistory,
      health: this.getHealthStatus(),
      summary: {
        uptime: process.uptime(),
        totalRequests: this.metrics.api.requestCount,
        totalExecutions: this.metrics.execution.totalExecutions,
        averageResponseTime: this.metrics.api.averageResponseTime,
        successRate: this.metrics.execution.successRate
      }
    }, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();