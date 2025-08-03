# Agent Manager - プロジェクト仕様書

## 1. プロジェクト概要

### 1.1 概要
Agent Manager は、WebブラウザからClaude Codeを実行できる統合開発環境です。ローカルブリッジサーバーを介してClaude CLIと通信し、プロジェクト管理、ファイル編集、リアルタイム実行結果表示を提供します。

### 1.2 主要機能
- GitHub OAuth認証によるセキュアなアクセス
- プロジェクトの作成・管理
- Monaco Editorを使用したコード編集
- Claude Code実行とリアルタイム出力表示
- ファイルの自動同期

### 1.3 技術スタック
- **フロントエンド**: React 18, TypeScript 5, Vite 5, Tailwind CSS 3
- **バックエンド**: Firebase (Authentication, Firestore, Storage)
- **ローカルブリッジ**: Node.js 18, Express 4, Socket.io 4
- **エディター**: Monaco Editor 4

## 2. システムアーキテクチャ

### 2.1 全体構成
```
┌─────────────────────────────────────────┐
│         Webブラウザ (React SPA)          │
│                                         │
│  ┌─────────┬──────────┬─────────────┐  │
│  │  Auth   │  Editor  │  Execution  │  │
│  │ Module  │  Module  │   Panel     │  │
│  └─────────┴──────────┴─────────────┘  │
└──────────────────┬──────────────────────┘
                   │ HTTPS/WSS
┌──────────────────┼──────────────────────┐
│              Firebase                    │
│  ┌──────────┬──────────┬────────────┐  │
│  │   Auth   │Firestore │  Storage   │  │
│  │ (GitHub) │   (DB)   │  (Files)   │  │
│  └──────────┴──────────┴────────────┘  │
└──────────────────┬──────────────────────┘
                   │ WebSocket
┌──────────────────┴──────────────────────┐
│        ローカルブリッジサーバー            │
│          (Node.js + Express)            │
│  ┌────────────────────────────────┐    │
│  │     Claude CLI Executor        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 2.2 データフロー
1. **認証フロー**: GitHub OAuth → Firebase Auth → JWT Token
2. **実行フロー**: Command → WebSocket → Local Bridge → Claude CLI → Output Stream
3. **ファイル同期**: Firestore Metadata ↔ Local File System ↔ Cloud Storage

## 3. データモデル

### 3.1 ユーザー (users)
```typescript
interface User {
  uid: string;              // Firebase Auth UID
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}
```

### 3.2 プロジェクト (projects)
```typescript
interface Project {
  id: string;
  userId: string;           // 所有者のUID
  name: string;
  description: string;
  githubUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 ファイル (projects/{projectId}/files)
```typescript
interface FileNode {
  id: string;
  name: string;
  path: string;             // 例: "src/index.ts"
  content?: string;         // テキストファイルの内容
  size: number;
  mimeType: string;
  isDirectory: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 実行履歴 (projects/{projectId}/executions)
```typescript
interface Execution {
  id: string;
  projectId: string;
  command: string;          // Claudeへの指示
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output: string;           // 実行ログ
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  filesChanged: string[];   // 変更されたファイルパス
}
```

## 4. セキュリティ

### 4.1 認証・認可
- GitHub OAuth 2.0による認証
- Firebase Authenticationでのトークン管理
- JWTトークンによるセッション管理

### 4.2 Firestoreセキュリティルール
```javascript
// ユーザーは自分のデータのみアクセス可能
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// プロジェクトは所有者のみアクセス可能
match /projects/{projectId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

### 4.3 データ保護
- HTTPS通信の強制
- WebSocket over TLS (WSS)
- ローカルブリッジはlocalhost接続のみ許可
- 実行はプロジェクトディレクトリ内に制限

## 5. API仕様

### 5.1 WebSocket イベント

#### クライアント → サーバー
```typescript
// 認証
{
  type: 'auth',
  token: string  // Firebase ID token
}

// 実行要求
{
  type: 'execute',
  data: {
    projectId: string,
    command: string,
    targetFiles?: string[]
  }
}

// 実行停止
{
  type: 'stop',
  data: {
    executionId: string
  }
}
```

#### サーバー → クライアント
```typescript
// 実行出力
{
  type: 'output',
  data: {
    executionId: string,
    content: string,
    timestamp: number
  }
}

// 実行完了
{
  type: 'complete',
  data: {
    executionId: string,
    status: 'success' | 'error',
    filesChanged: string[]
  }
}

// エラー
{
  type: 'error',
  data: {
    message: string,
    code: string
  }
}
```

## 6. 実装済み機能（Phase 1）

### 6.1 完了項目
- ✅ プロジェクト基本構造
  - Frontend (React + TypeScript + Vite)
  - Local Bridge (Node.js + Express)
  - Firebase設定

- ✅ 認証システム
  - GitHub OAuth統合
  - AuthContext実装
  - ProtectedRoute実装
  - ログイン/ログアウト機能

- ✅ 基本UI
  - ログインページ
  - ダッシュボードページ（骨組み）
  - Tailwind CSS統合
  - レスポンシブデザイン準備

- ✅ セキュリティ
  - Firestoreセキュリティルール
  - Storageセキュリティルール
  - 環境変数管理

## 7. 開発環境

### 7.1 必要な環境
- Node.js 18以上
- npm または yarn
- Claude CLI（インストール済み）
- Firebaseプロジェクト
- GitHubアカウント

### 7.2 環境変数

#### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_LOCAL_BRIDGE_URL=http://localhost:8080
```

#### Local Bridge (.env)
```env
PORT=8080
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
ALLOWED_ORIGINS=http://localhost:5173
```

## 8. 今後の実装予定（Phase 2-4）

### Phase 2: コア機能実装
- プロジェクト管理（CRUD）
- ファイル管理基礎
- 基本的なエディター統合

### Phase 3: 実行機能
- Claude実行エンジン
- WebSocket通信
- リアルタイム出力表示
- ファイル同期

### Phase 4: 統合・最適化
- エラーハンドリング
- UI/UXの改善
- 基本的なテスト
- デプロイメント

## 9. 制限事項（MVP版）

- 同時実行は1プロジェクトあたり1つまで
- ファイルサイズ上限: 10MB
- モバイル最適化は限定的
- オフライン対応なし
- 複数ユーザーでの共同作業は非対応