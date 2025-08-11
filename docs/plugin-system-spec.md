# プラグインシステム仕様書

## 1. 概要

### 1.1 目的
Agent Managerに拡張可能なプラグインシステムを実装し、ユーザーや開発者がカスタム機能を追加できるようにします。

### 1.2 主要機能
- プラグインのインストール/アンインストール
- プラグインAPI提供
- プラグインマーケットプレイス
- サンドボックス実行環境
- 設定とカスタマイズ

## 2. アーキテクチャ

### 2.1 プラグイン構造
```typescript
interface Plugin {
  manifest: PluginManifest;
  main: string; // エントリーポイント
  assets?: string[]; // 静的リソース
  locales?: Record<string, any>; // 多言語対応
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license: string;
  engines: {
    agentManager: string; // 対応バージョン
  };
  permissions: Permission[];
  contributes: {
    commands?: Command[];
    menus?: Menu[];
    views?: View[];
    themes?: Theme[];
    languages?: Language[];
  };
  activationEvents: string[];
  dependencies?: Record<string, string>;
}
```

### 2.2 プラグインライフサイクル
```typescript
interface PluginContext {
  subscriptions: Disposable[];
  globalState: Memento;
  workspaceState: Memento;
  extensionPath: string;
  storagePath: string;
  logPath: string;
}

export function activate(context: PluginContext): void {
  // プラグインの初期化
}

export function deactivate(): void {
  // クリーンアップ処理
}
```

## 3. Plugin API

### 3.1 コアAPI
```typescript
namespace agentManager {
  // ワークスペース
  export namespace workspace {
    export function getConfiguration(section?: string): WorkspaceConfiguration;
    export function openTextDocument(uri: Uri): Promise<TextDocument>;
    export function applyEdit(edit: WorkspaceEdit): Promise<boolean>;
    export const onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
    export const onDidOpenTextDocument: Event<TextDocument>;
    export const onDidChangeTextDocument: Event<TextDocumentChangeEvent>;
  }
  
  // エディター
  export namespace window {
    export const activeTextEditor: TextEditor | undefined;
    export function showInformationMessage(message: string): Promise<void>;
    export function showErrorMessage(message: string): Promise<void>;
    export function createOutputChannel(name: string): OutputChannel;
    export const onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
  }
  
  // コマンド
  export namespace commands {
    export function registerCommand(
      command: string,
      callback: (...args: any[]) => any
    ): Disposable;
    export function executeCommand(command: string, ...args: any[]): Promise<any>;
  }
  
  // Claude実行
  export namespace claude {
    export function execute(
      command: string,
      options?: ExecuteOptions
    ): Promise<ExecutionResult>;
    export const onDidStartExecution: Event<Execution>;
    export const onDidEndExecution: Event<ExecutionResult>;
  }
}
```

### 3.2 UI拡張API
```typescript
// ビューコンテナ
interface ViewContainer {
  id: string;
  title: string;
  icon: string;
}

// ツリービュー
export class TreeDataProvider<T> {
  getTreeItem(element: T): TreeItem | Promise<TreeItem>;
  getChildren(element?: T): T[] | Promise<T[]>;
  onDidChangeTreeData?: Event<T | undefined | null>;
}

// Webviewパネル
export interface WebviewPanel {
  webview: Webview;
  visible: boolean;
  active: boolean;
  viewColumn?: ViewColumn;
  title: string;
  iconPath?: Uri;
  
  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
  
  onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
  onDidDispose: Event<void>;
}
```

### 3.3 言語サポートAPI
```typescript
// 言語機能プロバイダー
export interface CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): CompletionItem[] | Promise<CompletionItem[]>;
}

export interface HoverProvider {
  provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Hover | Promise<Hover | null>;
}

export interface DefinitionProvider {
  provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Definition | Promise<Definition | null>;
}
```

## 4. セキュリティとサンドボックス

### 4.1 権限システム
```typescript
enum Permission {
  // ファイルシステム
  READ_FILES = 'files.read',
  WRITE_FILES = 'files.write',
  DELETE_FILES = 'files.delete',
  
  // ネットワーク
  NETWORK_ACCESS = 'network.access',
  
  // Claude実行
  EXECUTE_CLAUDE = 'claude.execute',
  
  // UI
  CREATE_WEBVIEW = 'ui.webview',
  MODIFY_STATUSBAR = 'ui.statusbar',
  
  // システム
  ACCESS_CLIPBOARD = 'system.clipboard',
  SHOW_NOTIFICATIONS = 'system.notifications'
}
```

### 4.2 サンドボックス実装
```typescript
class PluginSandbox {
  private worker: Worker;
  private permissions: Set<Permission>;
  
  constructor(plugin: Plugin) {
    this.permissions = new Set(plugin.manifest.permissions);
    this.worker = new Worker('plugin-worker.js');
    this.setupSandbox();
  }
  
  private setupSandbox() {
    // APIプロキシ設定
    const apiProxy = new Proxy({}, {
      get: (target, prop) => {
        return (...args: any[]) => {
          if (!this.hasPermission(prop)) {
            throw new Error(`Permission denied: ${prop}`);
          }
          return this.callAPI(prop, args);
        };
      }
    });
    
    // Workerにプロキシを注入
    this.worker.postMessage({
      type: 'init',
      api: apiProxy
    });
  }
}
```

## 5. プラグインマーケットプレイス

### 5.1 マーケットプレイスAPI
```typescript
interface MarketplaceAPI {
  search(query: string, options?: SearchOptions): Promise<Plugin[]>;
  getPlugin(id: string): Promise<PluginDetails>;
  install(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<void>;
  rate(pluginId: string, rating: number): Promise<void>;
  reportIssue(pluginId: string, issue: Issue): Promise<void>;
}

interface PluginDetails extends Plugin {
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  screenshots: string[];
  changelog: string;
  readme: string;
}
```

### 5.2 公開プロセス
```yaml
# plugin-publish.yml
name: Publish Plugin
steps:
  - validate: マニフェストの検証
  - test: 自動テストの実行
  - security: セキュリティスキャン
  - build: ビルドとパッケージング
  - sign: デジタル署名
  - publish: マーケットプレイスへの公開
```

## 6. プラグイン開発

### 6.1 開発環境
```json
// package.json
{
  "name": "my-agent-manager-plugin",
  "version": "1.0.0",
  "engines": {
    "agentManager": "^1.0.0"
  },
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myPlugin.helloWorld",
        "title": "Hello World"
      }
    ]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/agent-manager": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 6.2 サンプルプラグイン
```typescript
// src/extension.ts
import * as am from 'agent-manager';

export function activate(context: am.PluginContext) {
  console.log('My plugin is now active!');
  
  // コマンドの登録
  const disposable = am.commands.registerCommand(
    'myPlugin.helloWorld',
    () => {
      am.window.showInformationMessage('Hello World from my plugin!');
    }
  );
  
  context.subscriptions.push(disposable);
  
  // Claude実行の監視
  am.claude.onDidStartExecution((execution) => {
    console.log(`Execution started: ${execution.command}`);
  });
}

export function deactivate() {
  console.log('My plugin is now deactivated');
}
```

## 7. UI統合

### 7.1 プラグイン管理画面
```tsx
const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  
  return (
    <div className="plugin-manager">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="installed">インストール済み</Tab>
        <Tab value="marketplace">マーケットプレイス</Tab>
      </Tabs>
      
      {activeTab === 'installed' && (
        <InstalledPlugins 
          plugins={plugins}
          onToggle={togglePlugin}
          onUninstall={uninstallPlugin}
          onSettings={openPluginSettings}
        />
      )}
      
      {activeTab === 'marketplace' && (
        <PluginMarketplace 
          onInstall={installPlugin}
        />
      )}
    </div>
  );
};
```

### 7.2 プラグイン設定
```tsx
interface PluginSettings {
  pluginId: string;
  schema: JSONSchema;
  values: Record<string, any>;
}

const PluginSettingsEditor: React.FC<{settings: PluginSettings}> = ({settings}) => {
  return (
    <JSONSchemaForm
      schema={settings.schema}
      formData={settings.values}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
};
```

## 8. パフォーマンスとリソース管理

### 8.1 リソース制限
```typescript
interface ResourceLimits {
  memory: number; // MB
  cpu: number; // percentage
  storage: number; // MB
  networkBandwidth: number; // KB/s
}

class ResourceMonitor {
  monitor(plugin: Plugin): ResourceUsage {
    return {
      memory: this.getMemoryUsage(plugin),
      cpu: this.getCPUUsage(plugin),
      storage: this.getStorageUsage(plugin),
      network: this.getNetworkUsage(plugin)
    };
  }
  
  enforce(plugin: Plugin, limits: ResourceLimits) {
    // リソース制限の実施
  }
}
```

### 8.2 遅延読み込み
```typescript
class PluginLoader {
  private loadedPlugins = new Map<string, Plugin>();
  
  async loadPlugin(id: string): Promise<Plugin> {
    if (this.loadedPlugins.has(id)) {
      return this.loadedPlugins.get(id)!;
    }
    
    const plugin = await import(`./plugins/${id}/main.js`);
    this.loadedPlugins.set(id, plugin);
    return plugin;
  }
}
```

## 9. 実装計画

### Phase 1: 基礎実装（3週間）
- [ ] プラグインローダー
- [ ] 基本的なAPI
- [ ] サンドボックス環境

### Phase 2: API拡張（2週間）
- [ ] UI拡張API
- [ ] 言語サポートAPI
- [ ] Claude統合API

### Phase 3: マーケットプレイス（3週間）
- [ ] マーケットプレイスAPI
- [ ] 公開プロセス
- [ ] UI実装

### Phase 4: 最適化（1週間）
- [ ] パフォーマンス最適化
- [ ] セキュリティ強化
- [ ] ドキュメント整備

## 10. MVP向け簡易実装案

### 10.1 最小機能セット
1. **単純なコマンド拡張**: カスタムコマンドの追加のみ
2. **ローカルプラグイン**: マーケットプレイスなし
3. **基本的な権限**: ファイル読み取りのみ

### 10.2 実装例
```typescript
// 簡易プラグインシステム
class SimplePluginSystem {
  private plugins: Map<string, SimplePlugin> = new Map();
  
  async loadPlugin(path: string) {
    const module = await import(path);
    const plugin: SimplePlugin = {
      id: module.id,
      commands: module.commands || {}
    };
    
    this.plugins.set(plugin.id, plugin);
    this.registerCommands(plugin);
  }
  
  private registerCommands(plugin: SimplePlugin) {
    Object.entries(plugin.commands).forEach(([name, handler]) => {
      this.commandRegistry.register(`${plugin.id}.${name}`, handler);
    });
  }
}
```

### 10.3 実装工数
- 基本実装: 1週間
- テスト: 3日
- ドキュメント: 2日

合計: 約2週間