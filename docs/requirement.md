# Claude Code Manager - 要件定義・仕様書（MVP版）

## 1. プロジェクト概要

### 1.1 システム名称
Claude Code Manager (CCM) - Webブラウザベース実行環境

### 1.2 システムの目的
WebブラウザからClaude Codeをローカル実行し、プロジェクト管理を簡素化する最小限のツールを提供する。

### 1.3 MVP（最小実行可能製品）の範囲
- ブラウザからClaude Codeを実行
- プロジェクトファイルの管理
- 実行結果の表示と保存
- Firebaseでのデータ永続化

### 1.4 対象外機能（将来実装）
- 複数ユーザーでの共同作業
- 自動化ワークフロー
- CI/CD連携
- 高度な権限管理

## 2. 機能要件

### 2.1 認証機能

#### 2.1.1 ログイン
- **GitHubアカウント認証のみ**
- Firebase Authenticationを使用
- 初回ログイン時にローカルブリッジの接続設定

#### 2.1.2 セッション管理
- セッション有効期限：7日間
- 自動ログアウト：なし
- 同時ログイン制限：なし

### 2.2 プロジェクト管理機能

#### 2.2.1 基本操作
- プロジェクトの作成・削除
- プロジェクト名と説明の編集
- GitHubリポジトリとの連携（URL保存のみ）

#### 2.2.2 プロジェクト構造
```
project/
├── files/          # プロジェクトファイル
├── .ccm/
│   └── config.json # プロジェクト設定
└── executions/     # 実行履歴
```

#### 2.2.3 プロジェクト設定
```json
{
  "id": "proj_123456",
  "name": "My Project",
  "description": "Project description",
  "githubUrl": "https://github.com/user/repo",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2.3 ファイル管理機能

#### 2.3.1 基本操作
- ファイル・フォルダの作成
- ファイルの編集（テキストファイルのみ）
- ファイル・フォルダの削除
- ファイルのアップロード（ドラッグ&ドロップ）

#### 2.3.2 ファイルエクスプローラー
- ツリー形式での表示
- ファイル検索（ファイル名のみ）
- ファイルサイズ・更新日時の表示

### 2.4 Claude Code実行機能

#### 2.4.1 実行方法
- **ローカルブリッジ経由のみ**
- コマンド入力による実行
- 実行中の停止機能

#### 2.4.2 実行設定
```typescript
interface ExecutionConfig {
  command: string;           // Claudeへの指示
  targetFiles: string[];     // 対象ファイル（オプション）
  timeout: number;           // タイムアウト（デフォルト: 300秒）
}
```

#### 2.4.3 実行結果
- リアルタイムログ表示
- 実行履歴の保存（最新10件）
- 生成・変更されたファイルの表示

### 2.5 エディター機能

#### 2.5.1 基本機能
- Monaco Editorベース
- シンタックスハイライト
- 基本的な編集機能（検索・置換）
- ファイル保存（Ctrl+S）

#### 2.5.2 対応言語
- JavaScript/TypeScript
- Python
- HTML/CSS
- JSON/YAML
- Markdown

## 3. 非機能要件

### 3.1 パフォーマンス要件

| 項目 | 目標値 |
|------|--------|
| 初期ページ読み込み | 3秒以内 |
| ファイル保存 | 1秒以内 |
| Claude実行開始 | 3秒以内 |
| エディター表示 | 1秒以内 |

### 3.2 システム要件

#### 3.2.1 クライアント要件
- 対応ブラウザ：
  - デスクトップ：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
  - モバイル：Chrome for Android、Safari for iOS（最新版）
- 画面解像度：320px以上（レスポンシブ対応）
- ネットワーク：安定したインターネット接続（3G以上推奨）

#### 3.2.2 ローカル環境要件
- OS: Windows 10+、macOS 11+、Ubuntu 20.04+
- Node.js: 18.0以上
- メモリ: 4GB以上の空き
- ストレージ: 1GB以上の空き容量

### 3.3 セキュリティ要件

#### 3.3.1 通信
- HTTPS必須（ブラウザ⇔サーバー）
- ローカルブリッジは localhost のみ

#### 3.3.2 データ保護
- GitHubトークンは暗号化して保存
- ローカルファイルへの直接アクセスは禁止
- 実行はプロジェクトディレクトリ内に制限

## 4. システム構成

### 4.1 シンプルなアーキテクチャ

```
┌─────────────────────────────────────┐
│    Webブラウザ (React/TypeScript)    │
│  ┌──────────┬──────────┬─────────┐ │
│  │ Explorer │ Editor   │ Terminal │ │
│  └────┬─────┴────┬─────┴────┬────┘ │
│       └──────────┴──────────┘      │
│              WebSocket              │
└──────────────────┬─────────────────┘
                   │
┌──────────────────┼─────────────────┐
│    Firebase (Auth + Firestore)     │
└──────────────────┬─────────────────┘
                   │
┌──────────────────┼─────────────────┐
│   ローカルブリッジサーバー (Node.js)  │
│  ┌──────────────┴────────────────┐ │
│  │   Claude Code CLI Wrapper     │ │
│  └───────────────────────────────┘ │
└────────────────────────────────────┘
```

### 4.2 主要コンポーネント

#### 4.2.1 フロントエンド
- React + TypeScript
- Monaco Editor（コードエディター）
- Tailwind CSS（スタイリング）
- Socket.io-client（WebSocket通信）

#### 4.2.2 バックエンド
- Firebase Authentication（認証）
- Firebase Firestore（データ保存）
- Firebase Storage（ファイル保存）

#### 4.2.3 ローカルブリッジ
- Express.js（HTTPサーバー）
- Socket.io（WebSocket）
- child_process（Claude Code実行）

## 5. データモデル

### 5.1 Firestoreコレクション

#### 5.1.1 users コレクション
```typescript
{
  userId: string;        // Firebase Auth UID
  email: string;
  githubUsername: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

#### 5.1.2 projects コレクション
```typescript
{
  projectId: string;
  userId: string;        // 所有者
  name: string;
  description: string;
  githubUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 5.1.3 files サブコレクション
```typescript
// projects/{projectId}/files/{fileId}
{
  fileId: string;
  path: string;          // 例: "src/index.ts"
  content: string;       // ファイル内容
  size: number;          // バイト数
  mimeType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 5.1.4 executions サブコレクション
```typescript
// projects/{projectId}/executions/{executionId}
{
  executionId: string;
  command: string;       // Claudeへの指示
  status: 'running' | 'completed' | 'failed';
  output: string;        // 実行ログ
  startedAt: Timestamp;
  completedAt?: Timestamp;
  filesChanged: string[]; // 変更されたファイルパス
}
```

## 6. 画面仕様

### 6.1 レスポンシブデザイン対応

#### 6.1.1 ブレークポイント定義
```css
/* Tailwind CSS default breakpoints */
- Mobile: 0px - 639px (sm)
- Tablet: 640px - 1023px (md, lg)  
- Desktop: 1024px以上 (xl, 2xl)
```

#### 6.1.2 デバイス別レイアウト

**デスクトップ (1024px以上)**
```
┌─────────────────────────────────────────────────┐
│ ヘッダー (50px)                                  │
│ [Logo] [Project: MyProject ▼]    [GitHub] [User]│
├────────────┬────────────────────────────────────┤
│            │ エディターエリア                    │
│ サイドバー  │ ┌─────────────────────────────┐   │
│ (250px)    │ │ ファイル名 [×]              │   │
│            │ ├─────────────────────────────┤   │
│ Files      │ │                             │   │
│ ├─ src/    │ │   // コードエディター        │   │
│ │  └─ app.ts│ │                             │   │
│ └─ test/   │ │                             │   │
│            │ └─────────────────────────────┘   │
├────────────┼────────────────────────────────────┤
│            │ 実行パネル (250px - 可変)          │
│ [New File] │ [▶ Run Claude] Command: [_______] │
│ [Upload]   │ ┌─────────────────────────────┐   │
│            │ │ > Executing...              │   │
│            │ │ Claude output here...       │   │
│            │ └─────────────────────────────┘   │
└────────────┴────────────────────────────────────┘
```

**タブレット (640px - 1023px)**
```
┌─────────────────────────────────────┐
│ ヘッダー (50px)                      │
│ [☰] [Project ▼]         [User]     │
├─────────────────────────────────────┤
│ タブバー                            │
│ [Files] [Editor] [Run]              │
├─────────────────────────────────────┤
│                                     │
│ 選択されたタブの内容                 │
│ (Files/Editor/Run のいずれか)       │
│                                     │
└─────────────────────────────────────┘
```

**モバイル (320px - 639px)**
```
┌─────────────────────┐
│ ヘッダー (50px)      │
│ [☰] Agent    [User] │
├─────────────────────┤
│ ボトムナビゲーション │
│ [📁] [📝] [▶] [⚙]  │
├─────────────────────┤
│                     │
│ 選択された画面       │
│                     │
│                     │
└─────────────────────┘
```

### 6.2 モバイル対応詳細

#### 6.2.1 タッチ操作対応
- **タップ領域**: 最小44×44px（iOSガイドライン準拠）
- **スワイプ操作**: 
  - 左右スワイプ：タブ切り替え
  - 下方向プルリフレッシュ：ファイルリスト更新
- **長押し操作**: コンテキストメニュー表示

#### 6.2.2 モバイル専用UI要素

**ボトムナビゲーション**
```typescript
interface BottomNavItem {
  icon: string;
  label: string;
  path: string;
}

const mobileNavItems: BottomNavItem[] = [
  { icon: "📁", label: "Files", path: "/files" },
  { icon: "📝", label: "Edit", path: "/editor" },
  { icon: "▶", label: "Run", path: "/execute" },
  { icon: "⚙", label: "Settings", path: "/settings" }
];
```

**フローティングアクションボタン（FAB）**
- 位置：右下固定
- 機能：新規ファイル作成 / Claude実行
- サイズ：56×56px

#### 6.2.3 モバイル最適化

**エディター調整**
```typescript
interface MobileEditorConfig {
  // フォントサイズ自動調整
  fontSize: {
    mobile: 12,
    tablet: 14,
    desktop: 16
  },
  // 仮想キーボード対応
  scrollPadding: "50%", // キーボード表示時の余白
  // 横スクロール有効化
  wordWrap: "off",
  scrollBeyondLastLine: false,
  // モバイル用簡易ツールバー
  quickSuggestions: false,
  minimap: { enabled: false }
}
```

**実行画面の最適化**
- コマンド入力：音声入力ボタン追加
- よく使うコマンドのクイックボタン
- 実行結果：折りたたみ可能なアコーディオン形式

### 6.3 レスポンシブコンポーネント仕様

#### 6.3.1 ヘッダーコンポーネント
```tsx
// デスクトップ
<Header className="hidden lg:flex">
  <Logo />
  <ProjectSelector />
  <SearchBar />
  <UserMenu />
</Header>

// モバイル・タブレット
<MobileHeader className="flex lg:hidden">
  <MenuButton onClick={toggleSidebar} />
  <Logo size="small" />
  <UserAvatar />
</MobileHeader>
```

#### 6.3.2 サイドバー/ドロワー
```tsx
// デスクトップ：固定サイドバー
<Sidebar className="hidden lg:block w-64" />

// モバイル：スライドドロワー
<Drawer
  open={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  className="lg:hidden"
>
  <Sidebar />
</Drawer>
```

#### 6.3.3 エディターレイアウト
```tsx
const EditorLayout = () => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(max-width: 1023px)');
  
  if (isMobile) {
    return <MobileEditor fullScreen={true} />;
  }
  
  if (isTablet) {
    return (
      <TabLayout>
        <Tab label="Files"><FileExplorer /></Tab>
        <Tab label="Editor"><Editor /></Tab>
        <Tab label="Run"><ExecutionPanel /></Tab>
      </TabLayout>
    );
  }
  
  return (
    <SplitPane>
      <FileExplorer />
      <Editor />
      <ExecutionPanel />
    </SplitPane>
  );
};
```

### 6.4 モバイルUX考慮事項

#### 6.4.1 パフォーマンス最適化
- **遅延読み込み**: エディター機能は必要時のみロード
- **画像最適化**: アイコンはSVG、WebP形式を使用
- **キャッシュ戦略**: Service Workerでオフライン対応
- **仮想スクロール**: 大量ファイルリストの表示最適化

#### 6.4.2 アクセシビリティ
- **文字サイズ**: 最小14px（モバイル）
- **コントラスト比**: WCAG AA基準（4.5:1以上）
- **タッチターゲット**: 最小44×44px
- **フォーカス表示**: キーボード操作時の明確な表示

#### 6.4.3 ネットワーク最適化
```typescript
interface NetworkOptimization {
  // 低速回線検出
  connectionType: '4g' | '3g' | '2g' | 'slow-2g';
  
  // 適応的な動作
  adaptiveLoading: {
    '4g': 'full-features',
    '3g': 'reduced-animations',
    '2g': 'text-only',
    'slow-2g': 'minimal-ui'
  };
  
  // オフライン対応
  offlineCapabilities: [
    'view-cached-files',
    'edit-local-files',
    'queue-executions'
  ];
}
```

## 7. API仕様

### 7.1 ローカルブリッジAPI

#### 7.1.1 WebSocket接続
```javascript
// 接続URL
ws://localhost:8080

// 接続時の認証
{
  "type": "auth",
  "token": "firebase-id-token"
}
```

#### 7.1.2 メッセージ形式

**Claude実行要求**
```json
{
  "type": "execute",
  "data": {
    "projectId": "proj_123",
    "command": "ユニットテストを作成してください",
    "targetFiles": ["src/app.ts"],
    "workingDirectory": "/path/to/project"
  }
}
```

**実行結果ストリーミング**
```json
{
  "type": "output",
  "data": {
    "executionId": "exec_456",
    "content": "テストファイルを作成しています...\n",
    "timestamp": 1704067200000
  }
}
```

**実行完了**
```json
{
  "type": "complete",
  "data": {
    "executionId": "exec_456",
    "status": "success",
    "filesChanged": ["src/app.test.ts"],
    "summary": "1ファイルを作成しました"
  }
}
```

### 7.2 Firebase セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // プロジェクトは所有者のみアクセス可能
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      
      // ファイルも同様
      match /files/{fileId} {
        allow read, write: if request.auth.uid == 
          get(/databases/$(database)/documents/projects/$(projectId)).data.userId;
      }
      
      // 実行履歴も同様
      match /executions/{executionId} {
        allow read, write: if request.auth.uid == 
          get(/databases/$(database)/documents/projects/$(projectId)).data.userId;
      }
    }
  }
}
```

## 8. 開発計画

### 8.1 開発フェーズ

#### Phase 1: 基礎実装（3週間）
- Firebase設定
- 認証機能
- プロジェクト管理
- 基本的なUI

#### Phase 2: エディター統合（2週間）
- Monaco Editor統合
- ファイル管理
- ファイルアップロード

#### Phase 3: Claude実行機能（3週間）
- ローカルブリッジ開発
- WebSocket通信
- 実行管理
- ログ表示

#### Phase 4: 仕上げ（2週間）
- エラーハンドリング
- UIブラッシュアップ
- テスト
- ドキュメント作成

### 8.2 技術スタック詳細

**フロントエンド**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.3.0",
    "firebase": "^10.7.0",
    "@monaco-editor/react": "^4.6.0",
    "socket.io-client": "^4.7.0",
    "tailwindcss": "^3.4.0",
    "react-router-dom": "^6.20.0",
    "@headlessui/react": "^1.7.0",
    "react-hot-toast": "^2.4.0",
    "framer-motion": "^10.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0"
  }
}
```

**レスポンシブ対応ライブラリ**
- **@headlessui/react**: アクセシブルなUIコンポーネント
- **framer-motion**: スムーズなアニメーション
- **react-hot-toast**: モバイルフレンドリーな通知
- **vite-plugin-pwa**: PWA対応（オフライン機能）

**ローカルブリッジ**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "cors": "^2.8.5",
    "child_process": "built-in"
  }
}
```

## 9. インストールと設定

### 9.1 セットアップ手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/yourname/agent-manager
cd agent-manager

# 2. 依存関係のインストール
npm install

# 3. Firebase設定
cp .env.example .env
# .envファイルにFirebase設定を記入

# 4. ローカルブリッジの起動
cd local-bridge
npm install
npm start

# 5. フロントエンドの起動
cd ../frontend
npm run dev
```

### 9.2 必要な設定

**Firebase設定**
- Authenticationを有効化（GitHub Provider）
- Firestoreを有効化
- Storageを有効化

**ローカル設定**
- Claude CLIがインストール済み
- PATHに`claude`コマンドが通っている
- ポート8080が利用可能

## 10. 制限事項とFAQ

### 10.1 現在の制限

- 同時実行は1プロジェクトあたり1つまで
- ファイルサイズ上限: 10MB
- プロジェクトあたりのファイル数上限: 1000
- 実行タイムアウト: 5分
- **モバイルでの制限**:
  - 大規模ファイルの編集は非推奨（1MB以上）
  - 複数ファイルの同時編集は不可
  - ファイルアップロードは5MBまで

### 10.2 よくある質問

**Q: Claude CLIのインストールは必要ですか？**
A: はい、ローカルでClaude CLIが動作する必要があります。

**Q: 複数人で同じプロジェクトを編集できますか？**
A: MVP版では非対応です。将来のアップデートで対応予定です。

**Q: どのようなファイルを編集できますか？**
A: テキストベースのファイルのみ対応しています。

**Q: オフラインで使用できますか？**
A: いいえ、Firebase接続が必要です。

**Q: モバイルでClaude Codeを実行できますか？**
A: はい、モバイルからでも実行指示は可能です。ただし、実際の実行はローカルブリッジサーバーが必要です。

**Q: モバイルでコードを編集できますか？**
A: はい、基本的な編集は可能ですが、大規模なファイルや複雑な編集作業はデスクトップ環境を推奨します。

**Q: タブレットでの使用は最適化されていますか？**
A: はい、タブレット向けに専用のレイアウトを用意しています。

## 12. レスポンシブデザイン実装ガイドライン

### 12.1 CSS設計方針

#### 12.1.1 モバイルファースト
```css
/* 基本スタイル（モバイル） */
.container {
  padding: 1rem;
  width: 100%;
}

/* タブレット以上 */
@media (min-width: 640px) {
  .container {
    padding: 2rem;
    max-width: 640px;
  }
}

/* デスクトップ */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1280px;
  }
}
```

#### 12.1.2 Tailwind CSS ユーティリティ
```tsx
// レスポンシブなグリッドレイアウト
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* コンテンツ */}
</div>

// 条件付き表示
<div className="hidden lg:block">デスクトップのみ表示</div>
<div className="lg:hidden">モバイル・タブレットのみ表示</div>

// レスポンシブなテキストサイズ
<h1 className="text-2xl md:text-3xl lg:text-4xl">見出し</h1>
```

### 12.2 PWA（Progressive Web App）対応

#### 12.2.1 マニフェスト設定
```json
{
  "name": "Agent Manager",
  "short_name": "AgentMgr",
  "description": "Webブラウザベース Agent 実行環境",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a202c",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 12.2.2 Service Worker設定
```javascript
// オフライン対応の基本キャッシュ
const CACHE_NAME = 'agent-manager-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/bundle.js',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### 12.3 モバイル特有の実装考慮事項

#### 12.3.1 ビューポート設定
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
```

#### 12.3.2 iOS対応
```html
<!-- ステータスバーのスタイル -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<!-- ホーム画面アイコン -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<!-- スプラッシュスクリーン -->
<link rel="apple-touch-startup-image" href="/splash.png">
```

#### 12.3.3 Android対応
```html
<!-- テーマカラー -->
<meta name="theme-color" content="#1a202c">
<!-- アドレスバーの非表示 -->
<meta name="mobile-web-app-capable" content="yes">
```
