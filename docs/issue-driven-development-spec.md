# Issue駆動開発機能仕様書

## 1. 概要

### 1.1 背景
「Vibe Coding」の時代において、技術的な実装力よりも「正しい質問をする力」が重要になっています。Agent Managerに、Issue設計を中心とした開発フローを支援する機能を実装します。

### 1.2 目的
- Issueの品質向上（明確な目的と期待される成果の定義）
- AIとの効果的なコラボレーション促進
- 小さく焦点を絞ったタスクへの分解支援

### 1.3 主要機能
- Issue設計テンプレート
- 自動Issue分解アシスタント
- Issue品質評価システム
- AI向け要件明確化ツール
- Issue実装追跡

## 2. Issue設計フレームワーク

### 2.1 Issueテンプレート
```typescript
interface IssueTemplate {
  id: string;
  type: 'feature' | 'bug' | 'refactor' | 'research' | 'design';
  
  // 基本情報
  title: string;
  description: string;
  
  // Vibe Coding要素
  problem: {
    statement: string;           // 解決したい問題
    context: string;            // 背景・文脈
    constraints: string[];      // 制約条件
    successCriteria: string[];  // 成功基準
  };
  
  // 実装ガイダンス
  implementation: {
    approach?: string;          // 推奨アプローチ
    examples?: CodeExample[];   // 参考実装
    antiPatterns?: string[];    // 避けるべきパターン
    aiGuidance?: string;        // AI向けの追加指示
  };
  
  // 関連情報
  references: {
    relatedIssues: string[];
    documentation: string[];
    externalLinks: string[];
  };
  
  // メタデータ
  metadata: {
    estimatedEffort: 'XS' | 'S' | 'M' | 'L' | 'XL';
    priority: 'critical' | 'high' | 'medium' | 'low';
    tags: string[];
    assignee?: string;
  };
}
```

### 2.2 Issue品質評価
```typescript
interface IssueQualityMetrics {
  clarity: {
    score: number; // 0-100
    factors: {
      problemDefinition: boolean;
      successCriteria: boolean;
      scope: boolean;
      testability: boolean;
    };
  };
  
  completeness: {
    score: number;
    factors: {
      context: boolean;
      constraints: boolean;
      examples: boolean;
      edgeCases: boolean;
    };
  };
  
  aiReadiness: {
    score: number;
    factors: {
      clearInstructions: boolean;
      sufficientContext: boolean;
      unambiguous: boolean;
      modular: boolean;
    };
  };
  
  overallScore: number;
  recommendations: string[];
}

class IssueQualityAnalyzer {
  analyze(issue: IssueTemplate): IssueQualityMetrics {
    const clarity = this.assessClarity(issue);
    const completeness = this.assessCompleteness(issue);
    const aiReadiness = this.assessAIReadiness(issue);
    
    const overallScore = (clarity.score + completeness.score + aiReadiness.score) / 3;
    const recommendations = this.generateRecommendations(issue, {
      clarity,
      completeness,
      aiReadiness
    });
    
    return {
      clarity,
      completeness,
      aiReadiness,
      overallScore,
      recommendations
    };
  }
}
```

## 3. Issue分解アシスタント

### 3.1 自動分解エンジン
```typescript
interface IssueDecomposer {
  decompose(parentIssue: IssueTemplate): Promise<IssueTemplate[]>;
}

class SmartIssueDecomposer implements IssueDecomposer {
  async decompose(parentIssue: IssueTemplate): Promise<IssueTemplate[]> {
    // 1. 問題の複雑さを分析
    const complexity = await this.analyzeComplexity(parentIssue);
    
    // 2. 分解戦略を選択
    const strategy = this.selectDecompositionStrategy(complexity);
    
    // 3. サブイシューを生成
    const subIssues = await this.generateSubIssues(parentIssue, strategy);
    
    // 4. 依存関係を設定
    this.establishDependencies(subIssues);
    
    // 5. 品質チェック
    await this.validateDecomposition(parentIssue, subIssues);
    
    return subIssues;
  }
  
  private selectDecompositionStrategy(complexity: ComplexityAnalysis): DecompositionStrategy {
    if (complexity.hasMultipleFeatures) {
      return 'feature-based';
    } else if (complexity.hasLayeredArchitecture) {
      return 'layer-based';
    } else if (complexity.hasComplexWorkflow) {
      return 'workflow-based';
    } else {
      return 'task-based';
    }
  }
}
```

### 3.2 分解パターン
```typescript
const decompositionPatterns = {
  'feature-based': {
    name: '機能ベース分解',
    description: '独立した機能単位で分解',
    example: 'ユーザー認証 → [ログイン機能, 登録機能, パスワードリセット]'
  },
  
  'layer-based': {
    name: 'レイヤーベース分解',
    description: 'アーキテクチャレイヤーごとに分解',
    example: 'API実装 → [データモデル, ビジネスロジック, APIエンドポイント]'
  },
  
  'workflow-based': {
    name: 'ワークフローベース分解',
    description: 'プロセスの流れに沿って分解',
    example: '注文処理 → [カート追加, チェックアウト, 決済, 配送]'
  },
  
  'task-based': {
    name: 'タスクベース分解',
    description: '実装タスク単位で分解',
    example: 'リファクタリング → [コード整理, テスト追加, ドキュメント更新]'
  }
};
```

## 4. AI協調機能

### 4.1 コンテキスト管理
```typescript
interface IssueContext {
  issue: IssueTemplate;
  
  // プロジェクトコンテキスト
  projectContext: {
    architecture: string;
    conventions: string[];
    dependencies: string[];
    constraints: string[];
  };
  
  // 関連ファイル
  relatedFiles: {
    path: string;
    relevance: 'high' | 'medium' | 'low';
    excerpt?: string;
  }[];
  
  // 実装履歴
  history: {
    similarIssues: IssueReference[];
    patterns: CodePattern[];
    lessons: string[];
  };
}

class ContextBuilder {
  async buildContext(issue: IssueTemplate, projectId: string): Promise<IssueContext> {
    // CLAUDE.mdなどのプロジェクトドキュメントを読み込み
    const projectDocs = await this.loadProjectDocumentation(projectId);
    
    // 関連ファイルを特定
    const relatedFiles = await this.findRelatedFiles(issue, projectId);
    
    // 過去の類似Issueを検索
    const history = await this.searchSimilarIssues(issue, projectId);
    
    return {
      issue,
      projectContext: this.extractProjectContext(projectDocs),
      relatedFiles,
      history
    };
  }
}
```

### 4.2 プロンプト最適化
```typescript
class IssuePromptGenerator {
  generatePrompt(context: IssueContext): string {
    const sections = [
      this.generateProblemStatement(context.issue),
      this.generateContextSection(context.projectContext),
      this.generateConstraintsSection(context.issue.problem.constraints),
      this.generateSuccessCriteria(context.issue.problem.successCriteria),
      this.generateImplementationGuidance(context.issue.implementation),
      this.generateRelatedCode(context.relatedFiles)
    ];
    
    return sections.filter(Boolean).join('\n\n');
  }
  
  private generateProblemStatement(issue: IssueTemplate): string {
    return `
## 問題定義
${issue.problem.statement}

### 背景
${issue.problem.context}

### 解決すべき課題
${issue.description}
    `.trim();
  }
  
  private generateImplementationGuidance(implementation?: IssueTemplate['implementation']): string {
    if (!implementation) return '';
    
    const parts = [];
    
    if (implementation.approach) {
      parts.push(`### 推奨アプローチ\n${implementation.approach}`);
    }
    
    if (implementation.antiPatterns?.length) {
      parts.push(`### 避けるべきパターン\n${implementation.antiPatterns.map(p => `- ${p}`).join('\n')}`);
    }
    
    if (implementation.aiGuidance) {
      parts.push(`### 実装時の注意点\n${implementation.aiGuidance}`);
    }
    
    return parts.join('\n\n');
  }
}
```

## 5. UI/UX設計

### 5.1 Issue設計ウィザード
```tsx
const IssueDesignWizard: React.FC = () => {
  const [step, setStep] = useState(0);
  const [issue, setIssue] = useState<Partial<IssueTemplate>>({});
  
  const steps = [
    { title: '問題定義', component: ProblemDefinitionStep },
    { title: '成功基準', component: SuccessCriteriaStep },
    { title: '制約条件', component: ConstraintsStep },
    { title: '実装ガイド', component: ImplementationGuideStep },
    { title: '品質確認', component: QualityReviewStep }
  ];
  
  return (
    <div className="issue-wizard">
      <ProgressBar current={step} total={steps.length} />
      
      <div className="wizard-content">
        {React.createElement(steps[step].component, {
          issue,
          onUpdate: (updates) => setIssue({ ...issue, ...updates }),
          onNext: () => setStep(step + 1),
          onBack: () => setStep(step - 1)
        })}
      </div>
      
      <IssueQualityIndicator issue={issue} />
    </div>
  );
};
```

### 5.2 Issue分解ビュー
```tsx
const IssueDecompositionView: React.FC<{parentIssue: IssueTemplate}> = ({ parentIssue }) => {
  const [subIssues, setSubIssues] = useState<IssueTemplate[]>([]);
  const [decomposing, setDecomposing] = useState(false);
  
  const handleDecompose = async () => {
    setDecomposing(true);
    const decomposer = new SmartIssueDecomposer();
    const results = await decomposer.decompose(parentIssue);
    setSubIssues(results);
    setDecomposing(false);
  };
  
  return (
    <div className="decomposition-view">
      <ParentIssueCard issue={parentIssue} />
      
      {!subIssues.length && (
        <DecomposeButton onClick={handleDecompose} loading={decomposing} />
      )}
      
      {subIssues.length > 0 && (
        <>
          <DependencyGraph issues={[parentIssue, ...subIssues]} />
          <SubIssuesList 
            issues={subIssues}
            onEdit={(issue) => handleEditSubIssue(issue)}
            onRemove={(id) => handleRemoveSubIssue(id)}
          />
        </>
      )}
    </div>
  );
};
```

### 5.3 AI実行統合
```tsx
const IssueExecutionPanel: React.FC<{issue: IssueTemplate}> = ({ issue }) => {
  const [context, setContext] = useState<IssueContext>();
  const [executing, setExecuting] = useState(false);
  
  useEffect(() => {
    const builder = new ContextBuilder();
    builder.buildContext(issue, projectId).then(setContext);
  }, [issue]);
  
  const handleExecute = async () => {
    if (!context) return;
    
    setExecuting(true);
    const promptGenerator = new IssuePromptGenerator();
    const prompt = promptGenerator.generatePrompt(context);
    
    // Claude実行
    await executeWithClaude({
      command: prompt,
      targetFiles: context.relatedFiles.map(f => f.path),
      metadata: {
        issueId: issue.id,
        issueType: issue.type
      }
    });
    
    setExecuting(false);
  };
  
  return (
    <div className="issue-execution">
      <ContextPreview context={context} />
      <PromptPreview prompt={generatedPrompt} />
      <ExecuteButton onClick={handleExecute} loading={executing} />
    </div>
  );
};
```

## 6. 実装追跡とレポート

### 6.1 進捗追跡
```typescript
interface IssueProgress {
  issueId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  
  implementation: {
    startedAt?: Date;
    completedAt?: Date;
    executionIds: string[];
    filesChanged: string[];
    testsAdded: number;
    linesAdded: number;
    linesRemoved: number;
  };
  
  quality: {
    testsPass: boolean;
    codeReviewStatus?: 'pending' | 'approved' | 'changes_requested';
    documentationUpdated: boolean;
  };
  
  aiMetrics: {
    promptIterations: number;
    totalTokensUsed: number;
    successRate: number;
  };
}
```

### 6.2 Issue分析ダッシュボード
```tsx
const IssueAnalyticsDashboard: React.FC = () => {
  return (
    <div className="issue-analytics">
      <MetricCard
        title="Issue品質スコア"
        value={averageQualityScore}
        trend={qualityTrend}
      />
      
      <MetricCard
        title="平均分解数"
        value={averageDecomposition}
        description="1つのIssueから生成されるサブIssueの平均数"
      />
      
      <MetricCard
        title="AI成功率"
        value={aiSuccessRate}
        description="初回プロンプトでの実装成功率"
      />
      
      <IssueFlowChart data={issueFlowData} />
      
      <TopPatterns patterns={commonPatterns} />
    </div>
  );
};
```

## 7. ベストプラクティス自動化

### 7.1 Issue品質チェッカー
```typescript
class IssueQualityChecker {
  private rules: QualityRule[] = [
    {
      id: 'clear-success-criteria',
      check: (issue) => issue.problem.successCriteria.length >= 1,
      message: '成功基準を最低1つ定義してください',
      severity: 'error'
    },
    {
      id: 'reasonable-scope',
      check: (issue) => {
        const wordCount = issue.description.split(' ').length;
        return wordCount >= 20 && wordCount <= 500;
      },
      message: '説明は20〜500単語の範囲で記述してください',
      severity: 'warning'
    },
    {
      id: 'has-context',
      check: (issue) => issue.problem.context.length > 0,
      message: '背景・文脈を追加してください',
      severity: 'warning'
    }
  ];
  
  check(issue: IssueTemplate): ValidationResult[] {
    return this.rules
      .map(rule => ({
        ...rule,
        passed: rule.check(issue)
      }))
      .filter(result => !result.passed);
  }
}
```

### 7.2 テンプレート推奨エンジン
```typescript
class TemplateRecommender {
  recommend(projectContext: ProjectContext, issueType: string): IssueTemplate[] {
    const templates = this.getTemplateLibrary();
    
    // プロジェクトの特性に基づいてフィルタリング
    const filtered = templates.filter(t => 
      t.type === issueType &&
      this.matchesProjectContext(t, projectContext)
    );
    
    // 使用頻度と成功率でソート
    return filtered.sort((a, b) => {
      const scoreA = a.usage.frequency * a.usage.successRate;
      const scoreB = b.usage.frequency * b.usage.successRate;
      return scoreB - scoreA;
    });
  }
}
```

## 8. 実装計画

### Phase 1: 基礎実装（1週間）
- [ ] Issueテンプレートシステム
- [ ] 基本的な品質評価
- [ ] シンプルな設計UI

### Phase 2: AI統合（1週間）
- [ ] コンテキスト管理
- [ ] プロンプト生成
- [ ] 実行統合

### Phase 3: 高度な機能（2週間）
- [ ] 自動分解エンジン
- [ ] 進捗追跡
- [ ] 分析ダッシュボード

## 9. MVP向け簡易実装

### 9.1 最小機能セット
1. **基本テンプレート**: 問題定義と成功基準のみ
2. **シンプルな品質チェック**: 必須項目の確認
3. **手動分解**: 自動化なしのサブIssue作成

### 9.2 実装例
```typescript
// 簡易Issueテンプレート
interface SimpleIssue {
  title: string;
  problem: string;
  successCriteria: string[];
  aiHints?: string;
}

// 簡易品質チェック
function checkIssueQuality(issue: SimpleIssue): boolean {
  return (
    issue.title.length > 0 &&
    issue.problem.length > 20 &&
    issue.successCriteria.length > 0
  );
}
```

### 9.3 実装工数
- 基本実装: 3日
- UI実装: 2日
- テスト: 1日

合計: 約1週間