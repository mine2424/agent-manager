import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  issues: string[];
  metrics: {
    cpu: string;
    memory: string;
    activeConnections: number;
    activeExecutions: number;
    uptime: number;
  };
}

interface DetailedMetrics {
  current: {
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
  };
}

export const PerformancePanel: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch health status
        const healthResponse = await fetch(`${import.meta.env.VITE_LOCAL_BRIDGE_URL}/health`);
        const healthData = await healthResponse.json();
        setMetrics(healthData);

        // Fetch detailed metrics if needed
        if (showDetails) {
          const metricsResponse = await fetch(`${import.meta.env.VITE_LOCAL_BRIDGE_URL}/metrics`);
          const metricsData = await metricsResponse.json();
          setDetailedMetrics(metricsData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [showDetails]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (metrics?.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (metrics?.status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Performance
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="text-sm font-medium capitalize">{metrics?.status}</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CPU Usage */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">CPU</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.metrics.cpu}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Memory</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.metrics.memory}
            </div>
          </div>

          {/* Active Connections */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Connections</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.metrics.activeConnections}
            </div>
          </div>

          {/* Uptime */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Uptime</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.metrics.uptime ? formatUptime(metrics.metrics.uptime) : '-'}
            </div>
          </div>
        </div>

        {/* Issues */}
        {metrics?.issues && metrics.issues.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Issues Detected</p>
                <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                  {metrics.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Metrics */}
        {showDetails && detailedMetrics && (
          <div className="mt-4 space-y-4">
            {/* API Statistics */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">API Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Requests</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.api.requestCount}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Error Count</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.api.errorCount}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Avg Response Time</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.api.averageResponseTime.toFixed(0)}ms
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Active Requests</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.api.activeConnections}
                  </p>
                </div>
              </div>
            </div>

            {/* Execution Statistics */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Execution Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Executions</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.execution.totalExecutions}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Active Executions</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.execution.activeExecutions}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Avg Execution Time</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {(detailedMetrics.current.execution.averageExecutionTime / 1000).toFixed(1)}s
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Success Rate</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {detailedMetrics.current.execution.successRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Memory Details */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Memory Usage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Memory</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(detailedMetrics.current.memory.total)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Used Memory</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(detailedMetrics.current.memory.used)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Free Memory</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(detailedMetrics.current.memory.free)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformancePanel;