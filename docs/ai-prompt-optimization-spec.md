# AIプロンプト最適化機能仕様書

## 1. 概要

### 1.1 背景
Vibe Codingにおいて、AIへの「正しい質問」が開発効率を大きく左右します。Agent Managerに、効果的なプロンプト生成と最適化を支援する機能を実装します。

### 1.2 目的
- Claude向けプロンプトの品質向上
- コンテキスト情報の効率的な管理
- プロンプトテンプレートの再利用
- 実行結果に基づく継続的改善

### 1.3 主要機能
- スマートプロンプトビルダー
- コンテキスト自動収集
- プロンプトテンプレート管理
- 実行結果分析と最適化
- プロンプトバージョン管理

## 2. プロンプト構造設計

### 2.1 プロンプトモデル
```typescript
interface OptimizedPrompt {
  id: string;
  version: string;
  
  // メタ情報
  metadata: {
    purpose: string;
    targetModel: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
    estimatedTokens: number;
    tags: string[];
    performance: {
      successRate: number;
      averageIterations: number;
      userSatisfaction: number;
    };
  };
  
  // プロンプト構造
  structure: {
    systemContext?: string;      // システムレベルの指示
    projectContext: string;      // プロジェクト固有の情報
    taskDescription: string;     // タスクの詳細説明
    constraints: string[];       // 制約条件
    examples?: Example[];        // 参考例
    outputFormat?: string;       // 期待する出力形式
    additionalNotes?: string;    // 追加の注意事項
  };
  
  // 動的要素
  variables: {
    name: string;
    type: 'string' | 'code' | 'file' | 'list';
    description: string;
    defaultValue?: any;
    required: boolean;
  }[];
  
  // 関連リソース
  resources: {
    files: string[];            // 参照ファイルパス
    documentation: string[];    // ドキュメントURL
    previousExecutions: string[]; // 関連する過去の実行ID
  };
}
```

### 2.2 プロンプト最適化戦略
```typescript
interface OptimizationStrategy {
  name: string;
  description: string;
  
  analyze(prompt: string, context: ExecutionContext): OptimizationSuggestion[];
  optimize(prompt: string, suggestions: OptimizationSuggestion[]): string;
}

class PromptOptimizer {
  private strategies: OptimizationStrategy[] = [
    new ClarityOptimizer(),      // 明確性の向上
    new ContextReducer(),        // 不要なコンテキストの削減
    new ExampleEnricher(),       // 適切な例の追加
    new StructureOptimizer(),    // 構造の最適化
    new TokenEfficiencyOptimizer() // トークン効率の改善
  ];
  
  async optimize(prompt: OptimizedPrompt, history: ExecutionHistory[]): Promise<OptimizedPrompt> {
    const suggestions: OptimizationSuggestion[] = [];
    
    // 各戦略で分析
    for (const strategy of this.strategies) {
      const strategySuggestions = strategy.analyze(prompt, { history });
      suggestions.push(...strategySuggestions);
    }
    
    // 優先度でソートして適用
    const prioritized = this.prioritizeSuggestions(suggestions);
    let optimized = { ...prompt };
    
    for (const suggestion of prioritized) {
      if (suggestion.autoApply) {
        optimized = this.applySuggestion(optimized, suggestion);
      }
    }
    
    return optimized;
  }
}
```

## 3. コンテキスト管理

### 3.1 自動コンテキスト収集
```typescript
interface ContextCollector {
  collect(projectId: string, taskType: string): Promise<ProjectContext>;
}

class SmartContextCollector implements ContextCollector {
  async collect(projectId: string, taskType: string): Promise<ProjectContext> {
    const collectors = [
      this.collectProjectStructure(projectId),
      this.collectCodingStandards(projectId),
      this.collectDependencies(projectId),
      this.collectRecentChanges(projectId),
      this.collectRelatedIssues(projectId, taskType)
    ];
    
    const results = await Promise.all(collectors);
    
    return this.mergeContexts(results);
  }
  
  private async collectProjectStructure(projectId: string): Promise<StructureContext> {
    // ディレクトリ構造を分析
    const structure = await this.analyzeDirectoryStructure(projectId);
    
    // 重要なファイルを特定
    const keyFiles = await this.identifyKeyFiles(structure);
    
    // アーキテクチャパターンを検出
    const patterns = this.detectArchitecturePatterns(structure, keyFiles);
    
    return {
      type: 'structure',
      summary: this.generateStructureSummary(structure, patterns),
      details: {
        directories: structure.mainDirectories,
        keyFiles,
        patterns
      }
    };
  }
  
  private async collectCodingStandards(projectId: string): Promise<StandardsContext> {
    // CLAUDE.mdを探す
    const claudeMd = await this.findFile(projectId, 'CLAUDE.md');
    
    // その他の規約ファイル
    const conventionFiles = await this.findConventionFiles(projectId);
    
    // コードから規約を推測
    const inferredStandards = await this.inferCodingStandards(projectId);
    
    return {
      type: 'standards',
      documented: claudeMd ? await this.parseClaudeMd(claudeMd) : null,
      inferred: inferredStandards,
      files: conventionFiles
    };
  }
}
```

### 3.2 コンテキスト最適化
```typescript
class ContextOptimizer {
  optimize(context: ProjectContext, taskType: string, tokenLimit: number): OptimizedContext {
    // タスクタイプに基づいて関連性をスコアリング
    const scored = this.scoreRelevance(context, taskType);
    
    // トークン制限内で最も関連性の高い情報を選択
    const selected = this.selectWithinTokenLimit(scored, tokenLimit);
    
    // 構造化して返す
    return this.structure(selected);
  }
  
  private scoreRelevance(context: ProjectContext, taskType: string): ScoredContext {
    const weights = this.getTaskTypeWeights(taskType);
    
    return {
      structure: context.structure * weights.structure,
      standards: context.standards * weights.standards,
      dependencies: context.dependencies * weights.dependencies,
      recentChanges: context.recentChanges * weights.recentChanges,
      relatedIssues: context.relatedIssues * weights.relatedIssues
    };
  }
  
  private getTaskTypeWeights(taskType: string): ContextWeights {
    const weights = {
      'feature': { structure: 0.3, standards: 0.3, dependencies: 0.2, recentChanges: 0.1, relatedIssues: 0.1 },
      'bug': { structure: 0.2, standards: 0.2, dependencies: 0.1, recentChanges: 0.3, relatedIssues: 0.2 },
      'refactor': { structure: 0.4, standards: 0.4, dependencies: 0.1, recentChanges: 0.05, relatedIssues: 0.05 },
      'test': { structure: 0.2, standards: 0.3, dependencies: 0.2, recentChanges: 0.1, relatedIssues: 0.2 }
    };
    
    return weights[taskType] || weights['feature'];
  }
}
```

## 4. プロンプトテンプレート

### 4.1 テンプレートライブラリ
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'feature' | 'bug' | 'refactor' | 'test' | 'documentation' | 'custom';
  
  // テンプレート本体
  template: {
    structure: TemplateStructure;
    variables: TemplateVariable[];
    examples: TemplateExample[];
  };
  
  // 使用統計
  usage: {
    count: number;
    lastUsed: Date;
    averageSuccess: number;
    userRatings: number[];
  };
  
  // メタデータ
  metadata: {
    author: string;
    created: Date;
    updated: Date;
    tags: string[];
    public: boolean;
  };
}

const defaultTemplates: PromptTemplate[] = [
  {
    id: 'feature-implementation',
    name: '機能実装テンプレート',
    category: 'feature',
    template: {
      structure: {
        sections: [
          {
            name: 'overview',
            content: '${featureDescription}を実装してください。'
          },
          {
            name: 'requirements',
            content: '要件:\n${requirements}'
          },
          {
            name: 'constraints',
            content: '制約条件:\n${constraints}'
          },
          {
            name: 'examples',
            content: '参考実装:\n```${language}\n${exampleCode}\n```'
          }
        ]
      },
      variables: [
        { name: 'featureDescription', type: 'string', required: true },
        { name: 'requirements', type: 'list', required: true },
        { name: 'constraints', type: 'list', required: false },
        { name: 'language', type: 'string', defaultValue: 'typescript' },
        { name: 'exampleCode', type: 'code', required: false }
      ]
    }
  },
  {
    id: 'bug-fix',
    name: 'バグ修正テンプレート',
    category: 'bug',
    template: {
      structure: {
        sections: [
          {
            name: 'problem',
            content: '問題: ${bugDescription}'
          },
          {
            name: 'reproduction',
            content: '再現手順:\n${reproductionSteps}'
          },
          {
            name: 'expected',
            content: '期待する動作: ${expectedBehavior}'
          },
          {
            name: 'actual',
            content: '実際の動作: ${actualBehavior}'
          },
          {
            name: 'context',
            content: '関連コード:\n```${language}\n${relatedCode}\n```'
          }
        ]
      }
    }
  }
];
```

### 4.2 テンプレートカスタマイズ
```typescript
class TemplateCustomizer {
  customize(template: PromptTemplate, customizations: Customization[]): PromptTemplate {
    let customized = { ...template };
    
    for (const customization of customizations) {
      switch (customization.type) {
        case 'add-section':
          customized = this.addSection(customized, customization);
          break;
        case 'modify-section':
          customized = this.modifySection(customized, customization);
          break;
        case 'add-variable':
          customized = this.addVariable(customized, customization);
          break;
        case 'add-example':
          customized = this.addExample(customized, customization);
          break;
      }
    }
    
    return customized;
  }
  
  merge(templates: PromptTemplate[]): PromptTemplate {
    // 複数のテンプレートを組み合わせて新しいテンプレートを作成
    const merged: PromptTemplate = {
      id: generateId(),
      name: 'Merged Template',
      category: 'custom',
      template: {
        structure: { sections: [] },
        variables: [],
        examples: []
      }
    };
    
    // セクションをマージ
    for (const template of templates) {
      merged.template.structure.sections.push(...template.template.structure.sections);
      merged.template.variables.push(...this.deduplicateVariables(template.template.variables));
    }
    
    return merged;
  }
}
```

## 5. 実行結果分析

### 5.1 パフォーマンス追跡
```typescript
interface PromptPerformance {
  promptId: string;
  executionId: string;
  
  metrics: {
    tokenCount: {
      input: number;
      output: number;
      total: number;
    };
    
    timing: {
      startTime: Date;
      endTime: Date;
      duration: number;
    };
    
    quality: {
      completedTask: boolean;
      requiredIterations: number;
      userFeedback?: 'positive' | 'negative' | 'neutral';
      errorCount: number;
    };
    
    efficiency: {
      tokenEfficiency: number; // output quality / token count
      timeEfficiency: number;  // task completion / time taken
    };
  };
  
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
}

class PerformanceAnalyzer {
  async analyze(execution: Execution): Promise<PromptPerformance> {
    const metrics = await this.collectMetrics(execution);
    const patterns = await this.identifyPatterns(execution);
    const comparison = await this.compareWithSimilar(execution);
    
    return {
      promptId: execution.promptId,
      executionId: execution.id,
      metrics,
      analysis: this.generateAnalysis(metrics, patterns, comparison)
    };
  }
  
  private generateAnalysis(
    metrics: Metrics,
    patterns: Pattern[],
    comparison: Comparison
  ): Analysis {
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];
    
    // トークン効率の分析
    if (metrics.tokenEfficiency > 0.8) {
      strengths.push('高いトークン効率');
    } else if (metrics.tokenEfficiency < 0.5) {
      weaknesses.push('トークン効率が低い');
      suggestions.push('不要なコンテキストを削減');
    }
    
    // 実行時間の分析
    if (metrics.timing.duration < comparison.averageDuration * 0.8) {
      strengths.push('高速な実行');
    } else if (metrics.timing.duration > comparison.averageDuration * 1.5) {
      weaknesses.push('実行時間が長い');
      suggestions.push('プロンプトの構造を簡素化');
    }
    
    return { strengths, weaknesses, suggestions };
  }
}
```

### 5.2 学習と改善
```typescript
class PromptLearningEngine {
  async learn(performances: PromptPerformance[]): Promise<LearningInsights> {
    // パフォーマンスデータをクラスタリング
    const clusters = await this.clusterByPerformance(performances);
    
    // 各クラスタの特徴を抽出
    const features = await this.extractFeatures(clusters);
    
    // 改善パターンを特定
    const patterns = await this.identifyImprovementPatterns(features);
    
    // 新しい最適化ルールを生成
    const rules = this.generateOptimizationRules(patterns);
    
    return {
      clusters,
      features,
      patterns,
      rules,
      recommendations: this.generateRecommendations(patterns)
    };
  }
  
  async adaptTemplate(
    template: PromptTemplate,
    insights: LearningInsights
  ): Promise<PromptTemplate> {
    const adapted = { ...template };
    
    // 学習した改善パターンを適用
    for (const pattern of insights.patterns) {
      if (this.isApplicable(pattern, template)) {
        adapted.template = this.applyPattern(adapted.template, pattern);
      }
    }
    
    // A/Bテスト用のバリエーションを生成
    const variations = this.generateVariations(adapted, insights.rules);
    
    return adapted;
  }
}
```

## 6. UI/UX設計

### 6.1 プロンプトビルダー
```tsx
const PromptBuilder: React.FC = () => {
  const [prompt, setPrompt] = useState<OptimizedPrompt>();
  const [preview, setPreview] = useState<string>('');
  const [analysis, setAnalysis] = useState<PromptAnalysis>();
  
  return (
    <div className="prompt-builder">
      <div className="builder-layout">
        <div className="left-panel">
          <TemplateSelector
            onSelect={(template) => setPrompt(template)}
          />
          <ContextSelector
            onUpdate={(context) => updatePromptContext(context)}
          />
        </div>
        
        <div className="main-panel">
          <PromptEditor
            prompt={prompt}
            onChange={setPrompt}
            features={['syntax-highlight', 'variable-autocomplete', 'preview']}
          />
          
          <VariablePanel
            variables={prompt?.variables || []}
            onUpdate={(vars) => updateVariables(vars)}
          />
        </div>
        
        <div className="right-panel">
          <PromptPreview
            content={preview}
            tokenCount={calculateTokens(preview)}
          />
          
          <QualityIndicator
            analysis={analysis}
            suggestions={analysis?.suggestions}
          />
          
          <OptimizationPanel
            onOptimize={() => optimizePrompt()}
            history={executionHistory}
          />
        </div>
      </div>
      
      <ActionBar>
        <SaveTemplateButton />
        <TestPromptButton />
        <ExecuteButton />
      </ActionBar>
    </div>
  );
};
```

### 6.2 実行履歴ビュー
```tsx
const ExecutionHistoryView: React.FC = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution>();
  
  return (
    <div className="execution-history">
      <FilterBar
        filters={['date-range', 'prompt-type', 'success-rate', 'user']}
        onFilter={(filters) => applyFilters(filters)}
      />
      
      <ExecutionList
        executions={executions}
        onSelect={setSelectedExecution}
        renderItem={(execution) => (
          <ExecutionCard
            execution={execution}
            metrics={execution.performance.metrics}
            showComparison={true}
          />
        )}
      />
      
      {selectedExecution && (
        <ExecutionDetail
          execution={selectedExecution}
          showPrompt={true}
          showOutput={true}
          showAnalysis={true}
          onRerun={() => rerunExecution(selectedExecution)}
          onOptimize={() => optimizeFromExecution(selectedExecution)}
        />
      )}
    </div>
  );
};
```

### 6.3 学習ダッシュボード
```tsx
const LearningDashboard: React.FC = () => {
  return (
    <div className="learning-dashboard">
      <MetricsOverview
        totalExecutions={metrics.totalExecutions}
        averageSuccess={metrics.averageSuccess}
        tokenEfficiency={metrics.tokenEfficiency}
        trend={metrics.trend}
      />
      
      <TopTemplates
        templates={topPerformingTemplates}
        metric="success-rate"
      />
      
      <ImprovementInsights
        insights={learningInsights}
        actionable={true}
      />
      
      <PromptEvolution
        history={promptEvolutionHistory}
        visualization="timeline"
      />
      
      <ABTestResults
        tests={activeABTests}
        showStatistics={true}
      />
    </div>
  );
};
```

## 7. 統合機能

### 7.1 Claude実行統合
```typescript
class ClaudeIntegration {
  async executeWithOptimizedPrompt(
    prompt: OptimizedPrompt,
    variables: Record<string, any>
  ): Promise<ExecutionResult> {
    // 変数を展開
    const expanded = this.expandVariables(prompt, variables);
    
    // コンテキストを準備
    const context = await this.prepareContext(prompt);
    
    // 最終的なプロンプトを生成
    const finalPrompt = this.buildFinalPrompt(expanded, context);
    
    // トークン数を確認
    const tokenCount = await this.estimateTokens(finalPrompt);
    if (tokenCount > this.tokenLimit) {
      finalPrompt = await this.reducePrompt(finalPrompt, this.tokenLimit);
    }
    
    // 実行
    const result = await this.claude.execute(finalPrompt);
    
    // 結果を記録
    await this.recordExecution(prompt, result);
    
    return result;
  }
}
```

### 7.2 バージョン管理
```typescript
class PromptVersionControl {
  async saveVersion(prompt: OptimizedPrompt, message: string): Promise<Version> {
    const version = {
      id: generateId(),
      promptId: prompt.id,
      version: this.incrementVersion(prompt.version),
      content: prompt,
      message,
      author: getCurrentUser(),
      timestamp: new Date(),
      performance: await this.getPerformanceSnapshot(prompt.id)
    };
    
    await this.repository.save(version);
    
    return version;
  }
  
  async compareVersions(v1: string, v2: string): Promise<Comparison> {
    const version1 = await this.repository.getVersion(v1);
    const version2 = await this.repository.getVersion(v2);
    
    return {
      structural: this.compareStructure(version1, version2),
      performance: this.comparePerformance(version1, version2),
      content: this.generateDiff(version1, version2)
    };
  }
}
```

## 8. 実装計画

### Phase 1: 基礎実装（1週間）
- [ ] プロンプトモデル定義
- [ ] 基本的なテンプレート機能
- [ ] シンプルなビルダーUI

### Phase 2: 最適化エンジン（1週間）
- [ ] コンテキスト収集
- [ ] プロンプト最適化
- [ ] パフォーマンス分析

### Phase 3: 学習機能（2週間）
- [ ] 実行履歴分析
- [ ] 学習エンジン
- [ ] A/Bテスト機能

## 9. MVP向け簡易実装

### 9.1 最小機能セット
1. **基本テンプレート**: 3-5個の汎用テンプレート
2. **変数展開**: シンプルな変数置換
3. **実行履歴**: 基本的な成功/失敗の記録

### 9.2 実装例
```typescript
// 簡易プロンプトテンプレート
const simpleTemplate = {
  feature: `
タスク: {description}

要件:
{requirements}

制約条件:
{constraints}

現在のコードを改善して、上記の要件を満たすように実装してください。
`,
  
  bug: `
バグ: {description}

再現手順:
{steps}

期待する動作: {expected}
実際の動作: {actual}

このバグを修正してください。
`
};

// 簡易変数展開
function expandTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return variables[key] || match;
  });
}
```

### 9.3 実装工数
- 基本実装: 3日
- UI実装: 2日
- 統合: 1日

合計: 約1週間