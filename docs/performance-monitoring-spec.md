# パフォーマンス監視機能仕様書

## 1. 概要

### 1.1 目的
Agent Managerのパフォーマンスを継続的に監視し、ボトルネックの特定と最適化を可能にします。

### 1.2 主要機能
- リアルタイムメトリクス収集
- パフォーマンスダッシュボード
- アラート設定
- 自動最適化
- レポート生成

## 2. メトリクス定義

### 2.1 フロントエンドメトリクス
```typescript
interface FrontendMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  
  // パフォーマンスメトリクス
  pageLoadTime: number;
  timeToInteractive: number;
  
  // リソース使用量
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // APIメトリクス
  apiCalls: {
    endpoint: string;
    duration: number;
    status: number;
    size: number;
  }[];
  
  // エラー率
  errorRate: {
    javascript: number;
    network: number;
    resource: number;
  };
}
```

### 2.2 バックエンドメトリクス
```typescript
interface BackendMetrics {
  // Firebase Functions
  functions: {
    name: string;
    invocations: number;
    duration: {
      p50: number;
      p95: number;
      p99: number;
    };
    errors: number;
    coldStarts: number;
  }[];
  
  // Firestore
  firestore: {
    reads: number;
    writes: number;
    deletes: number;
    latency: {
      read: number;
      write: number;
    };
    cacheHitRate: number;
  };
  
  // Storage
  storage: {
    bandwidth: number;
    requests: number;
    totalSize: number;
    largestFiles: {
      path: string;
      size: number;
    }[];
  };
}
```

### 2.3 ローカルブリッジメトリクス
```typescript
interface LocalBridgeMetrics {
  // システムリソース
  system: {
    cpu: number;
    memory: {
      used: number;
      total: number;
    };
    disk: {
      used: number;
      total: number;
    };
  };
  
  // WebSocket接続
  websocket: {
    activeConnections: number;
    messageRate: number;
    averageLatency: number;
    reconnections: number;
  };
  
  // Claude実行
  claudeExecution: {
    activeExecutions: number;
    queueLength: number;
    executionTime: {
      average: number;
      p95: number;
    };
    successRate: number;
  };
}
```

## 3. データ収集アーキテクチャ

### 3.1 収集パイプライン
```typescript
class MetricsCollector {
  private collectors: Map<string, Collector> = new Map();
  private buffer: MetricBuffer;
  
  constructor() {
    // Web Vitals収集
    this.collectors.set('webVitals', new WebVitalsCollector());
    
    // カスタムメトリクス収集
    this.collectors.set('custom', new CustomMetricsCollector());
    
    // エラー収集
    this.collectors.set('errors', new ErrorCollector());
  }
  
  async collect(): Promise<void> {
    const metrics = await Promise.all(
      Array.from(this.collectors.values()).map(c => c.collect())
    );
    
    await this.buffer.push(metrics);
    
    if (this.buffer.shouldFlush()) {
      await this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    const batch = this.buffer.getBatch();
    await this.send(batch);
    this.buffer.clear();
  }
}
```

### 3.2 Web Vitals収集
```typescript
class WebVitalsCollector implements Collector {
  constructor() {
    // Core Web Vitals
    getCLS(this.handleCLS);
    getFID(this.handleFID);
    getLCP(this.handleLCP);
    
    // その他のメトリクス
    getTTFB(this.handleTTFB);
    getFCP(this.handleFCP);
  }
  
  private handleCLS = (metric: Metric) => {
    this.send({
      name: 'cls',
      value: metric.value,
      delta: metric.delta,
      id: metric.id
    });
  };
  
  // Performance Observer API
  private observePerformance() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.handleNavigationTiming(entry as PerformanceNavigationTiming);
        } else if (entry.entryType === 'resource') {
          this.handleResourceTiming(entry as PerformanceResourceTiming);
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
}
```

## 4. リアルタイム監視

### 4.1 ストリーミングアーキテクチャ
```typescript
class RealtimeMonitor {
  private eventStream: EventSource;
  private metrics: Map<string, CircularBuffer> = new Map();
  
  connect() {
    this.eventStream = new EventSource('/api/metrics/stream');
    
    this.eventStream.onmessage = (event) => {
      const metric = JSON.parse(event.data);
      this.updateMetric(metric);
      this.checkThresholds(metric);
    };
  }
  
  private updateMetric(metric: Metric) {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, new CircularBuffer(1000));
    }
    
    this.metrics.get(metric.name)!.push({
      timestamp: Date.now(),
      value: metric.value
    });
  }
  
  getRecentMetrics(name: string, duration: number): DataPoint[] {
    const buffer = this.metrics.get(name);
    if (!buffer) return [];
    
    const cutoff = Date.now() - duration;
    return buffer.toArray().filter(point => point.timestamp > cutoff);
  }
}
```

### 4.2 アラートシステム
```typescript
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: {
    operator: '>' | '<' | '==' | '>=' | '<=';
    value: number;
    duration?: number; // 継続時間（ミリ秒）
  };
  severity: 'critical' | 'warning' | 'info';
  actions: AlertAction[];
}

interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config: any;
}

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  
  async checkMetric(metric: Metric): Promise<void> {
    const applicableRules = this.getApplicableRules(metric.name);
    
    for (const rule of applicableRules) {
      const isViolating = this.evaluateCondition(metric.value, rule.condition);
      
      if (isViolating) {
        await this.handleViolation(rule, metric);
      } else {
        await this.handleRecovery(rule, metric);
      }
    }
  }
  
  private async handleViolation(rule: AlertRule, metric: Metric): Promise<void> {
    const alertKey = `${rule.id}-${metric.name}`;
    
    if (!this.activeAlerts.has(alertKey)) {
      const alert = {
        id: generateId(),
        rule,
        metric,
        startTime: Date.now(),
        status: 'active'
      };
      
      this.activeAlerts.set(alertKey, alert);
      
      // 継続時間チェック
      if (rule.condition.duration) {
        setTimeout(() => {
          if (this.activeAlerts.get(alertKey)?.status === 'active') {
            this.triggerAlert(alert);
          }
        }, rule.condition.duration);
      } else {
        await this.triggerAlert(alert);
      }
    }
  }
}
```

## 5. パフォーマンスダッシュボード

### 5.1 ダッシュボードUI
```tsx
const PerformanceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [metrics, setMetrics] = useState<DashboardMetrics>();
  
  return (
    <div className="performance-dashboard">
      <DashboardHeader 
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WebVitalsCard metrics={metrics?.webVitals} />
        <ResponseTimeCard metrics={metrics?.responseTime} />
        <ErrorRateCard metrics={metrics?.errorRate} />
        <ResourceUsageCard metrics={metrics?.resources} />
        <ActiveUsersCard metrics={metrics?.activeUsers} />
        <ThroughputCard metrics={metrics?.throughput} />
      </div>
      
      <DetailedCharts metrics={metrics} timeRange={timeRange} />
    </div>
  );
};

const WebVitalsCard: React.FC<{metrics?: WebVitals}> = ({metrics}) => {
  return (
    <Card>
      <CardHeader>
        <h3>Core Web Vitals</h3>
      </CardHeader>
      <CardBody>
        <VitalScore 
          label="LCP" 
          value={metrics?.lcp} 
          threshold={2500}
          unit="ms"
        />
        <VitalScore 
          label="FID" 
          value={metrics?.fid} 
          threshold={100}
          unit="ms"
        />
        <VitalScore 
          label="CLS" 
          value={metrics?.cls} 
          threshold={0.1}
        />
      </CardBody>
    </Card>
  );
};
```

### 5.2 チャート実装
```tsx
const MetricChart: React.FC<{
  data: DataPoint[];
  type: 'line' | 'area' | 'bar';
  threshold?: number;
}> = ({ data, type, threshold }) => {
  const chartConfig = {
    data,
    xField: 'timestamp',
    yField: 'value',
    smooth: true,
    point: {
      size: 2,
      shape: 'circle'
    },
    annotations: threshold ? [{
      type: 'line',
      start: ['min', threshold],
      end: ['max', threshold],
      style: {
        stroke: '#ff4d4f',
        lineDash: [4, 4]
      }
    }] : []
  };
  
  return (
    <div className="metric-chart">
      {type === 'line' && <Line {...chartConfig} />}
      {type === 'area' && <Area {...chartConfig} />}
      {type === 'bar' && <Column {...chartConfig} />}
    </div>
  );
};
```

## 6. 自動最適化

### 6.1 パフォーマンス最適化エンジン
```typescript
class PerformanceOptimizer {
  private optimizers: Optimizer[] = [
    new CacheOptimizer(),
    new QueryOptimizer(),
    new ResourceOptimizer(),
    new CodeSplitOptimizer()
  ];
  
  async analyze(): Promise<OptimizationSuggestion[]> {
    const metrics = await this.collectMetrics();
    const suggestions: OptimizationSuggestion[] = [];
    
    for (const optimizer of this.optimizers) {
      const analysis = await optimizer.analyze(metrics);
      if (analysis.hasSuggestions()) {
        suggestions.push(...analysis.suggestions);
      }
    }
    
    return this.prioritizeSuggestions(suggestions);
  }
  
  async autoOptimize(): Promise<OptimizationResult> {
    const suggestions = await this.analyze();
    const results: OptimizationResult[] = [];
    
    for (const suggestion of suggestions) {
      if (suggestion.canAutoApply && suggestion.risk === 'low') {
        try {
          const result = await this.applySuggestion(suggestion);
          results.push(result);
        } catch (error) {
          console.error(`Failed to apply optimization: ${suggestion.id}`, error);
        }
      }
    }
    
    return {
      applied: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      pending: suggestions.filter(s => !s.canAutoApply || s.risk !== 'low')
    };
  }
}
```

### 6.2 キャッシュ最適化
```typescript
class CacheOptimizer implements Optimizer {
  async analyze(metrics: Metrics): Promise<Analysis> {
    const suggestions: OptimizationSuggestion[] = [];
    
    // キャッシュヒット率が低い場合
    if (metrics.cacheHitRate < 0.8) {
      suggestions.push({
        id: 'increase-cache-ttl',
        title: 'キャッシュTTLを延長',
        description: 'キャッシュヒット率が低いため、TTLを延長することを推奨',
        impact: 'high',
        risk: 'low',
        canAutoApply: true,
        apply: async () => {
          await this.updateCacheConfig({
            ttl: 3600000 // 1時間
          });
        }
      });
    }
    
    // 頻繁にアクセスされるがキャッシュされていないリソース
    const uncachedHotResources = this.findUncachedHotResources(metrics);
    for (const resource of uncachedHotResources) {
      suggestions.push({
        id: `cache-resource-${resource.path}`,
        title: `リソースをキャッシュ: ${resource.path}`,
        impact: 'medium',
        risk: 'low',
        canAutoApply: true
      });
    }
    
    return { suggestions };
  }
}
```

## 7. レポート生成

### 7.1 レポートテンプレート
```typescript
interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    uptime: number;
  };
  webVitals: {
    lcp: MetricStats;
    fid: MetricStats;
    cls: MetricStats;
  };
  topIssues: Issue[];
  recommendations: Recommendation[];
  trends: {
    metric: string;
    direction: 'improving' | 'degrading' | 'stable';
    change: number;
  }[];
}

interface MetricStats {
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  average: number;
}
```

### 7.2 レポート生成エンジン
```typescript
class ReportGenerator {
  async generateReport(
    startDate: Date,
    endDate: Date,
    options: ReportOptions
  ): Promise<PerformanceReport> {
    const metrics = await this.fetchMetrics(startDate, endDate);
    
    const report: PerformanceReport = {
      period: { start: startDate, end: endDate },
      summary: this.calculateSummary(metrics),
      webVitals: this.calculateWebVitals(metrics),
      topIssues: this.identifyTopIssues(metrics),
      recommendations: this.generateRecommendations(metrics),
      trends: this.analyzeTrends(metrics)
    };
    
    if (options.format === 'pdf') {
      return this.generatePDF(report);
    } else if (options.format === 'csv') {
      return this.generateCSV(report);
    }
    
    return report;
  }
  
  private identifyTopIssues(metrics: Metrics): Issue[] {
    const issues: Issue[] = [];
    
    // 遅いエンドポイント
    const slowEndpoints = metrics.endpoints
      .filter(e => e.p95 > 1000)
      .sort((a, b) => b.p95 - a.p95)
      .slice(0, 5);
    
    for (const endpoint of slowEndpoints) {
      issues.push({
        type: 'slow-endpoint',
        severity: endpoint.p95 > 3000 ? 'high' : 'medium',
        title: `遅いエンドポイント: ${endpoint.path}`,
        details: {
          p95: endpoint.p95,
          requestCount: endpoint.count
        }
      });
    }
    
    return issues;
  }
}
```

## 8. 統合とAPI

### 8.1 メトリクスAPI
```typescript
// REST API
app.get('/api/metrics/:metric', async (req, res) => {
  const { metric } = req.params;
  const { start, end, granularity } = req.query;
  
  const data = await metricsService.getMetric(
    metric,
    new Date(start),
    new Date(end),
    granularity
  );
  
  res.json(data);
});

// GraphQL API
const typeDefs = `
  type Query {
    metrics(
      names: [String!]!
      timeRange: TimeRange!
      granularity: Granularity
    ): MetricsResponse!
  }
  
  type MetricsResponse {
    metrics: [Metric!]!
    metadata: MetricsMetadata!
  }
  
  type Metric {
    name: String!
    dataPoints: [DataPoint!]!
    stats: MetricStats!
  }
`;
```

### 8.2 Webhook統合
```typescript
class WebhookIntegration {
  async sendMetricUpdate(webhook: Webhook, metric: Metric): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      metric: {
        name: metric.name,
        value: metric.value,
        tags: metric.tags
      },
      metadata: {
        source: 'agent-manager',
        version: '1.0.0'
      }
    };
    
    const signature = this.generateSignature(payload, webhook.secret);
    
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: JSON.stringify(payload)
    });
  }
}
```

## 9. 実装計画

### Phase 1: 基礎実装（2週間）
- [ ] メトリクス収集基盤
- [ ] 基本的なWeb Vitals
- [ ] シンプルなダッシュボード

### Phase 2: 高度な監視（2週間）
- [ ] カスタムメトリクス
- [ ] アラートシステム
- [ ] リアルタイム更新

### Phase 3: 分析と最適化（2週間）
- [ ] 自動分析エンジン
- [ ] 最適化提案
- [ ] レポート生成

### Phase 4: 統合（1週間）
- [ ] API実装
- [ ] 外部サービス連携
- [ ] ドキュメント

## 10. MVP向け簡易実装

### 10.1 最小機能セット
1. **基本メトリクス**: 応答時間、エラー率のみ
2. **シンプルダッシュボード**: 固定レイアウト
3. **基本アラート**: しきい値ベースのみ

### 10.2 簡易実装例
```typescript
// 簡易メトリクス収集
class SimpleMetrics {
  private metrics: Map<string, number[]> = new Map();
  
  record(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }
  
  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

// APIレスポンスタイム計測
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.record('api.response_time', duration);
    metrics.record(`api.${req.path}.response_time`, duration);
  });
  
  next();
});
```

### 10.3 実装工数
- 基本実装: 1週間
- ダッシュボード: 3日
- 統合: 2日

合計: 約2週間