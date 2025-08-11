# コンテキスト管理機能仕様書

## 1. 概要

### 1.1 背景
Vibe Codingにおいて、AIに適切なコンテキストを提供することが成功の鍵となります。プロジェクトの規約、構造、履歴などを効率的に管理し、最適なコンテキストを自動生成する機能を実装します。

### 1.2 目的
- プロジェクト固有の情報を体系的に管理
- タスクに応じた最適なコンテキストの自動選択
- コンテキストの継続的な更新と改善
- トークン制限内での効率的な情報提供

### 1.3 主要機能
- CLAUDE.md自動生成・更新
- プロジェクト構造の分析と要約
- コードパターンの学習
- 実行履歴に基づくコンテキスト最適化
- 動的コンテキスト選択

## 2. コンテキストモデル

### 2.1 コンテキスト構造
```typescript
interface ProjectContext {
  id: string;
  projectId: string;
  version: string;
  lastUpdated: Date;
  
  // 基本情報
  metadata: {
    name: string;
    description: string;
    type: 'web' | 'mobile' | 'api' | 'library' | 'cli';
    language: string[];
    frameworks: string[];
    createdAt: Date;
  };
  
  // プロジェクト構造
  structure: {
    overview: string;
    directories: DirectoryInfo[];
    keyFiles: KeyFile[];
    entryPoints: string[];
    configFiles: ConfigFile[];
  };
  
  // コーディング規約
  conventions: {
    documented: DocumentedConvention[];  // CLAUDE.mdなどから
    inferred: InferredConvention[];     // コードから推測
    examples: CodeExample[];
  };
  
  // アーキテクチャ
  architecture: {
    pattern: string; // MVC, Microservices, etc.
    layers: Layer[];
    components: Component[];
    dataFlow: DataFlow[];
  };
  
  // 依存関係
  dependencies: {
    external: Dependency[];
    internal: ModuleDependency[];
    apiEndpoints: APIEndpoint[];
  };
  
  // 開発パターン
  patterns: {
    common: Pattern[];
    antiPatterns: AntiPattern[];
    bestPractices: BestPractice[];
  };
  
  // 実行履歴からの学習
  learning: {
    successfulPatterns: ExecutionPattern[];
    commonIssues: Issue[];
    optimizations: Optimization[];
  };
}
```

### 2.2 コンテキストタイプ
```typescript
enum ContextType {
  FULL = 'full',               // 完全なコンテキスト
  MINIMAL = 'minimal',         // 最小限の必須情報
  TASK_SPECIFIC = 'task',      // タスク特化
  FILE_FOCUSED = 'file',       // 特定ファイル中心
  ARCHITECTURAL = 'arch',      // アーキテクチャ重視
  CONVENTION = 'convention'    // 規約重視
}

interface ContextStrategy {
  type: ContextType;
  priority: ContextPriority[];
  tokenLimit: number;
  includeHistory: boolean;
  includeExamples: boolean;
}

interface ContextPriority {
  element: keyof ProjectContext;
  weight: number;
  maxTokens?: number;
}
```

## 3. CLAUDE.md管理

### 3.1 自動生成エンジン
```typescript
class ClaudeMdGenerator {
  async generate(projectId: string): Promise<string> {
    const analyzer = new ProjectAnalyzer(projectId);
    const context = await analyzer.analyze();
    
    const sections = [
      this.generateHeader(context),
      this.generateOverview(context),
      this.generateStructure(context),
      this.generateConventions(context),
      this.generateArchitecture(context),
      this.generateExamples(context),
      this.generateGuidelines(context)
    ];
    
    return sections.join('\n\n');
  }
  
  private generateConventions(context: ProjectContext): string {
    const conventions = [
      '## コーディング規約',
      '',
      '### 命名規則',
      this.formatNamingConventions(context.conventions),
      '',
      '### ファイル構成',
      this.formatFileStructure(context.structure),
      '',
      '### インポート順序',
      this.formatImportOrder(context.conventions),
      '',
      '### エラーハンドリング',
      this.formatErrorHandling(context.patterns)
    ];
    
    return conventions.join('\n');
  }
  
  private formatNamingConventions(conventions: Conventions): string {
    const rules = [];
    
    // ドキュメント化された規約
    if (conventions.documented.length > 0) {
      rules.push(...conventions.documented.map(c => `- ${c.rule}: ${c.example}`));
    }
    
    // 推測された規約
    if (conventions.inferred.length > 0) {
      rules.push('', '#### プロジェクトから推測された規約:');
      rules.push(...conventions.inferred.map(c => 
        `- ${c.pattern}: ${c.confidence}% (例: ${c.examples.join(', ')})`
      ));
    }
    
    return rules.join('\n');
  }
}
```

### 3.2 自動更新システム
```typescript
class ClaudeMdUpdater {
  private watcher: FileWatcher;
  private updateQueue: UpdateQueue;
  
  async startWatching(projectId: string): Promise<void> {
    this.watcher = new FileWatcher(projectId);
    
    this.watcher.on('change', async (changes: FileChange[]) => {
      const significantChanges = this.filterSignificantChanges(changes);
      
      if (significantChanges.length > 0) {
        await this.updateQueue.add({
          projectId,
          changes: significantChanges,
          priority: this.calculatePriority(significantChanges)
        });
      }
    });
    
    // 定期的な更新
    setInterval(() => this.performScheduledUpdate(projectId), 24 * 60 * 60 * 1000); // 毎日
  }
  
  private async processUpdate(update: Update): Promise<void> {
    const currentMd = await this.loadCurrentClaudeMd(update.projectId);
    const sections = this.identifyAffectedSections(update.changes);
    
    let updatedMd = currentMd;
    
    for (const section of sections) {
      updatedMd = await this.updateSection(updatedMd, section, update);
    }
    
    // 変更の検証
    if (this.validateUpdate(currentMd, updatedMd)) {
      await this.saveClaudeMd(update.projectId, updatedMd);
      await this.notifyUpdate(update.projectId, sections);
    }
  }
}
```

## 4. プロジェクト分析

### 4.1 構造分析
```typescript
class StructureAnalyzer {
  async analyze(projectPath: string): Promise<StructureAnalysis> {
    const files = await this.scanDirectory(projectPath);
    
    return {
      totalFiles: files.length,
      fileTypes: this.categorizeFileTypes(files),
      directories: this.analyzeDirectoryStructure(files),
      complexity: this.calculateComplexity(files),
      patterns: this.detectStructuralPatterns(files),
      suggestions: this.generateSuggestions(files)
    };
  }
  
  private detectStructuralPatterns(files: FileInfo[]): StructuralPattern[] {
    const patterns = [];
    
    // MVCパターン検出
    if (this.hasMVCStructure(files)) {
      patterns.push({
        name: 'MVC',
        confidence: 0.9,
        locations: {
          models: files.filter(f => f.path.includes('/models/')),
          views: files.filter(f => f.path.includes('/views/')),
          controllers: files.filter(f => f.path.includes('/controllers/'))
        }
      });
    }
    
    // Layered Architecture検出
    if (this.hasLayeredArchitecture(files)) {
      patterns.push({
        name: 'Layered Architecture',
        confidence: 0.85,
        layers: this.identifyLayers(files)
      });
    }
    
    return patterns;
  }
}
```

### 4.2 コードパターン学習
```typescript
class PatternLearner {
  async learnPatterns(projectId: string): Promise<LearnedPatterns> {
    const codeFiles = await this.loadCodeFiles(projectId);
    
    const patterns = {
      imports: await this.analyzeImportPatterns(codeFiles),
      functions: await this.analyzeFunctionPatterns(codeFiles),
      classes: await this.analyzeClassPatterns(codeFiles),
      errorHandling: await this.analyzeErrorHandling(codeFiles),
      testing: await this.analyzeTestingPatterns(codeFiles)
    };
    
    return this.consolidatePatterns(patterns);
  }
  
  private async analyzeImportPatterns(files: CodeFile[]): Promise<ImportPattern[]> {
    const imports = files.flatMap(f => this.extractImports(f));
    
    // インポート順序のパターン
    const orderPattern = this.detectImportOrder(imports);
    
    // グループ化のパターン
    const groupingPattern = this.detectImportGrouping(imports);
    
    // エイリアスの使用パターン
    const aliasPattern = this.detectAliasUsage(imports);
    
    return [
      {
        type: 'import-order',
        pattern: orderPattern,
        examples: this.getExamples(imports, orderPattern),
        frequency: this.calculateFrequency(imports, orderPattern)
      },
      {
        type: 'import-grouping',
        pattern: groupingPattern,
        examples: this.getExamples(imports, groupingPattern),
        frequency: this.calculateFrequency(imports, groupingPattern)
      }
    ];
  }
}
```

## 5. 動的コンテキスト選択

### 5.1 コンテキストセレクター
```typescript
class ContextSelector {
  async selectContext(
    task: Task,
    projectContext: ProjectContext,
    constraints: ContextConstraints
  ): Promise<OptimizedContext> {
    // タスクタイプに基づく初期戦略
    const strategy = this.getStrategyForTask(task);
    
    // 関連ファイルの特定
    const relevantFiles = await this.findRelevantFiles(task, projectContext);
    
    // コンテキスト要素の優先順位付け
    const prioritized = this.prioritizeContextElements(
      projectContext,
      task,
      relevantFiles,
      strategy
    );
    
    // トークン制限内で最適化
    const optimized = await this.optimizeForTokenLimit(
      prioritized,
      constraints.tokenLimit
    );
    
    return optimized;
  }
  
  private prioritizeContextElements(
    context: ProjectContext,
    task: Task,
    files: FileInfo[],
    strategy: ContextStrategy
  ): PrioritizedContext {
    const scores = new Map<string, number>();
    
    // 基本スコア計算
    for (const [element, content] of Object.entries(context)) {
      const baseScore = strategy.priority.find(p => p.element === element)?.weight || 0;
      const relevanceScore = this.calculateRelevance(content, task, files);
      const recencyScore = this.calculateRecency(content);
      
      scores.set(element, baseScore * relevanceScore * recencyScore);
    }
    
    // 実行履歴からの調整
    const historicalAdjustment = this.getHistoricalAdjustment(task, context.learning);
    for (const [element, adjustment] of historicalAdjustment) {
      scores.set(element, scores.get(element)! * adjustment);
    }
    
    return this.sortByScore(context, scores);
  }
}
```

### 5.2 コンテキスト圧縮
```typescript
class ContextCompressor {
  compress(context: ProjectContext, targetTokens: number): CompressedContext {
    const currentTokens = this.estimateTokens(context);
    
    if (currentTokens <= targetTokens) {
      return { ...context, compressed: false };
    }
    
    const compressionRatio = targetTokens / currentTokens;
    
    // 圧縮戦略の選択
    const strategies = [
      new SummaryCompression(),      // 要約による圧縮
      new ExampleReduction(),        // 例の削減
      new DetailRemoval(),           // 詳細の省略
      new SimilarityMerging()        // 類似項目の統合
    ];
    
    let compressed = context;
    for (const strategy of strategies) {
      compressed = strategy.compress(compressed, compressionRatio);
      
      if (this.estimateTokens(compressed) <= targetTokens) {
        break;
      }
    }
    
    return {
      ...compressed,
      compressed: true,
      compressionRatio,
      removedElements: this.getRemovedElements(context, compressed)
    };
  }
}
```

## 6. UI/UX設計

### 6.1 コンテキスト管理ダッシュボード
```tsx
const ContextDashboard: React.FC = () => {
  const [context, setContext] = useState<ProjectContext>();
  const [claudeMd, setClaudeMd] = useState<string>('');
  const [analysis, setAnalysis] = useState<ContextAnalysis>();
  
  return (
    <div className="context-dashboard">
      <ContextOverview
        lastUpdated={context?.lastUpdated}
        version={context?.version}
        quality={analysis?.qualityScore}
      />
      
      <div className="dashboard-grid">
        <StructureView
          structure={context?.structure}
          onUpdate={(structure) => updateStructure(structure)}
        />
        
        <ConventionsEditor
          conventions={context?.conventions}
          onSave={(conventions) => saveConventions(conventions)}
        />
        
        <PatternLibrary
          patterns={context?.patterns}
          onAddPattern={(pattern) => addPattern(pattern)}
        />
        
        <LearningInsights
          insights={context?.learning}
          showTrends={true}
        />
      </div>
      
      <ClaudeMdEditor
        content={claudeMd}
        onChange={setClaudeMd}
        onGenerate={() => generateClaudeMd()}
        onSave={() => saveClaudeMd(claudeMd)}
      />
    </div>
  );
};
```

### 6.2 コンテキストプレビュー
```tsx
const ContextPreview: React.FC<{task: Task}> = ({ task }) => {
  const [preview, setPreview] = useState<OptimizedContext>();
  const [tokenCount, setTokenCount] = useState<number>(0);
  
  useEffect(() => {
    const selector = new ContextSelector();
    selector.selectContext(task, projectContext, constraints)
      .then(setPreview);
  }, [task]);
  
  return (
    <div className="context-preview">
      <PreviewHeader
        tokenCount={tokenCount}
        tokenLimit={constraints.tokenLimit}
        compressed={preview?.compressed}
      />
      
      <ContextSections
        sections={preview?.sections}
        expandable={true}
        highlight={preview?.highlights}
      />
      
      <OptimizationSuggestions
        suggestions={preview?.optimizationSuggestions}
        onApply={(suggestion) => applySuggestion(suggestion)}
      />
      
      <ActionBar>
        <RefreshButton onClick={() => refreshContext()} />
        <EditButton onClick={() => openContextEditor()} />
        <CopyButton onClick={() => copyContext(preview)} />
      </ActionBar>
    </div>
  );
};
```

### 6.3 学習ビュー
```tsx
const LearningView: React.FC = () => {
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  
  return (
    <div className="learning-view">
      <LearningProgress
        totalExecutions={stats.totalExecutions}
        patternsIdentified={patterns.length}
        improvementRate={stats.improvementRate}
      />
      
      <PatternExplorer
        patterns={patterns}
        onSelect={(pattern) => showPatternDetails(pattern)}
        groupBy="category"
      />
      
      <InsightCards
        insights={insights}
        onApply={(insight) => applyInsight(insight)}
      />
      
      <EvolutionTimeline
        events={learningEvents}
        showMilestones={true}
      />
    </div>
  );
};
```

## 7. 実行時統合

### 7.1 自動コンテキスト注入
```typescript
class ContextInjector {
  async injectContext(
    execution: ExecutionRequest,
    options: InjectionOptions = {}
  ): Promise<EnhancedExecutionRequest> {
    // タスクの分析
    const task = this.analyzeTask(execution);
    
    // 最適なコンテキストの選択
    const context = await this.selector.selectContext(
      task,
      this.projectContext,
      {
        tokenLimit: options.tokenLimit || 4000,
        includeExamples: options.includeExamples ?? true
      }
    );
    
    // プロンプトへの統合
    const enhancedPrompt = this.integrateContext(execution.prompt, context);
    
    // メタデータの追加
    const metadata = {
      contextVersion: context.version,
      contextElements: Object.keys(context),
      tokenUsage: this.estimateTokens(enhancedPrompt)
    };
    
    return {
      ...execution,
      prompt: enhancedPrompt,
      context,
      metadata
    };
  }
}
```

### 7.2 フィードバックループ
```typescript
class ContextFeedbackLoop {
  async processExecutionResult(
    execution: Execution,
    result: ExecutionResult
  ): Promise<void> {
    const feedback = {
      executionId: execution.id,
      contextUsed: execution.context,
      success: result.success,
      quality: await this.assessQuality(result),
      issues: this.identifyIssues(result),
      improvements: this.suggestImprovements(execution, result)
    };
    
    // 学習データの更新
    await this.updateLearningData(feedback);
    
    // パターンの抽出
    if (feedback.success && feedback.quality > 0.8) {
      const patterns = await this.extractSuccessPatterns(execution, result);
      await this.addToPatternLibrary(patterns);
    }
    
    // コンテキストの自動調整
    if (feedback.improvements.length > 0) {
      await this.adjustContext(execution.context, feedback.improvements);
    }
  }
}
```

## 8. 実装計画

### Phase 1: 基礎実装（1週間）
- [ ] コンテキストモデル定義
- [ ] CLAUDE.md生成器
- [ ] 基本的な構造分析

### Phase 2: 学習機能（1週間）
- [ ] パターン学習エンジン
- [ ] コンテキスト選択器
- [ ] フィードバックループ

### Phase 3: UI統合（1週間）
- [ ] 管理ダッシュボード
- [ ] プレビュー機能
- [ ] 編集機能

## 9. MVP向け簡易実装

### 9.1 最小機能セット
1. **基本的なCLAUDE.md**: テンプレートベースの生成
2. **シンプルな構造分析**: ディレクトリ構造のみ
3. **固定コンテキスト**: タスクタイプ別の固定テンプレート

### 9.2 実装例
```typescript
// 簡易CLAUDE.md生成
function generateSimpleClaudeMd(project: Project): string {
  return `
# ${project.name}

## プロジェクト概要
${project.description}

## ディレクトリ構造
${generateDirectoryTree(project.path)}

## 主要な技術スタック
${project.technologies.join(', ')}

## コーディング規約
- インデント: ${project.indent || '2 spaces'}
- 命名規則: ${project.namingConvention || 'camelCase'}

## 注意事項
- テストを必ず書く
- エラーハンドリングを適切に行う
`;
}

// 簡易コンテキスト選択
function selectSimpleContext(taskType: string): string {
  const contexts = {
    feature: 'プロジェクト構造と規約に従って実装してください。',
    bug: '既存のコードパターンを維持しながら修正してください。',
    refactor: 'テストが通ることを確認しながらリファクタリングしてください。'
  };
  
  return contexts[taskType] || contexts.feature;
}
```

### 9.3 実装工数
- 基本実装: 3日
- CLAUDE.md生成: 2日
- 統合: 1日

合計: 約1週間