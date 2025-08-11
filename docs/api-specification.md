# Agent Manager - API仕様書

## 1. 概要

Agent Managerは4つの主要なAPIインターフェースを提供します：
1. **Firebase Firestore API** - データ永続化
2. **WebSocket API** - リアルタイム通信
3. **Spec-Driven Development API** - 自動仕様生成（新機能！）
4. **REST API** (将来実装) - 外部連携用

### 1.1 セキュリティ機能

- **認証**: Firebase Authentication (GitHub OAuth)
- **入力検証**: Zodスキーマによる厳密な検証
- **レート制限**: エンドポイント別の制限
- **サニタイゼーション**: パス、コマンド、HTMLのサニタイズ
- **OWASP Top 10準拠**: セキュリティベストプラクティス
- **監査ログ**: 包括的なイベント追跡

### 1.2 新機能（2025年8月10日追加）

#### 仕様駆動開発システム
- **Kiro式仕様生成**: 最小4行入力から詳細仕様を自動生成
- **EARS記法**: 構造化された要件定義
- **Mermaidダイアグラム**: アーキテクチャの自動視覚化
- **TypeScriptインターフェース生成**
- **3段階ドキュメント**: 要件 → 設計 → タスク
- **インタラクティブな改善ワークフロー**

#### セキュリティ強化
- **監査ログシステム**: コンプライアンス対応
- **高度な入力検証**: Zodスキーマによる検証
- **ディレクトリトラバーサル防止**
- **危険なコマンド検出**
- **レート制限**: 設定可能な制限値

#### Claude統合改善
- **ローカルClaude CLI実行**: --printフラグ使用
- **リアルタイム出力ストリーミング**
- **ファイル変更検出・同期**
- **タイムアウト管理**: 5分間
- **エラーハンドリング改善**

## 2. Firebase Firestore API

### 2.1 コレクション構造

#### users コレクション
```
/users/{userId}
```

| フィールド | 型 | 説明 | 必須 |
|----------|---|------|-----|
| uid | string | Firebase Auth UID | ✓ |
| email | string | ユーザーのメールアドレス | ✓ |
| displayName | string | 表示名 | |
| photoURL | string | プロフィール画像URL | |
| githubUsername | string | GitHubユーザー名 | |
| createdAt | timestamp | アカウント作成日時 | ✓ |
| lastLoginAt | timestamp | 最終ログイン日時 | ✓ |

#### projects コレクション
```
/projects/{projectId}
```

| フィールド | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | プロジェクトID | ✓ |
| userId | string | 所有者のUID | ✓ |
| name | string | プロジェクト名 | ✓ |
| description | string | プロジェクトの説明 | |
| githubUrl | string | GitHubリポジトリURL | |
| createdAt | timestamp | 作成日時 | ✓ |
| updatedAt | timestamp | 更新日時 | ✓ |

#### files サブコレクション
```
/projects/{projectId}/files/{fileId}
```

| フィールド | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | ファイルID | ✓ |
| name | string | ファイル名 | ✓ |
| path | string | ファイルパス (例: "src/index.ts") | ✓ |
| content | string | ファイル内容 (テキストファイルのみ) | |
| size | number | ファイルサイズ (bytes) | ✓ |
| mimeType | string | MIMEタイプ | ✓ |
| isDirectory | boolean | ディレクトリかどうか | ✓ |
| createdAt | timestamp | 作成日時 | ✓ |
| updatedAt | timestamp | 更新日時 | ✓ |

#### specs サブコレクション（新機能！）
```
/projects/{projectId}/specs/{specId}
```

| フィールド | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | 仕様ID | ✓ |
| title | string | 仕様タイトル | ✓ |
| requirements | string[] | 元の要件リスト | ✓ |
| currentPhase | string | 現在のフェーズ | ✓ |
| requirements_md | string | 要件定義書 | |
| design_md | string | 設計書 | |
| tasks_md | string | 実装タスク | |
| metadata | object | メタデータ | |
| createdAt | timestamp | 作成日時 | ✓ |
| updatedAt | timestamp | 更新日時 | ✓ |

**currentPhase の値:**
- `requirements` - 要件定義フェーズ
- `design` - 設計フェーズ  
- `tasks` - 実装タスクフェーズ
- `completed` - 完了

#### executions サブコレクション
```
/projects/{projectId}/executions/{executionId}
```

| フィールド | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | 実行ID | ✓ |
| projectId | string | プロジェクトID | ✓ |
| command | string | 実行コマンド | ✓ |
| status | string | 実行状態 | ✓ |
| output | string | 実行出力 | |
| error | string | エラーメッセージ | |
| startedAt | timestamp | 開始日時 | ✓ |
| completedAt | timestamp | 完了日時 | |
| filesChanged | string[] | 変更されたファイルパス | |

**status の値:**
- `pending` - 実行待機中
- `running` - 実行中
- `completed` - 正常完了
- `failed` - エラー終了
- `cancelled` - キャンセル

### 2.2 Firestore セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // プロジェクトは所有者のみアクセス可能
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      
      // サブコレクションも同様のルール
      match /{subcollection}/{documentId} {
        allow read, write: if request.auth != null && 
          request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.userId;
      }
    }
  }
}
```

## 3. WebSocket API

### 3.1 接続

#### エンドポイント
```
ws://localhost:8080
```

#### 接続時の認証
```typescript
const socket = io('ws://localhost:8080', {
  auth: {
    token: 'firebase-id-token'
  }
});
```

### 3.2 入力検証

すべてのイベントデータはZodスキーマによる検証が実施されます。

#### 実行コマンドの検証
```typescript
// 検証スキーマ
execute: z.object({
  projectId: z.string().min(1).max(100),
  command: z.string().min(1).max(5000),
  targetFiles: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
})

// 危険なコマンドパターン
- rm -rf /
- sudo
- chmod 777
- eval()
- exec()
```

#### ファイル同期の検証
```typescript
fileSync: z.object({
  projectId: z.string().min(1).max(100),
  files: z.array(
    z.object({
      path: z.string().min(1).max(1000),
      content: z.string().max(10 * 1024 * 1024), // 10MB
      action: z.enum(['create', 'update', 'delete']),
    })
  ),
})
```

### 3.3 クライアント → サーバー イベント

#### auth - 認証
```typescript
// イベント名: 'auth'
{
  type: 'auth',
  token: string  // Firebase ID token
}

// レスポンス
{
  type: 'auth_success',
  userId: string
}
// または
{
  type: 'auth_error',
  message: string
}
```

#### execute - コマンド実行
```typescript
// イベント名: 'execute'
{
  type: 'execute',
  data: {
    projectId: string,      // プロジェクトID
    command: string,        // Claudeへの指示
    targetFiles?: string[], // 対象ファイル (オプション)
    timeout?: number        // タイムアウト (ms, デフォルト: 300000)
  }
}

// レスポンス
{
  type: 'execution_started',
  data: {
    executionId: string
  }
}
```

#### stop - 実行停止
```typescript
// イベント名: 'stop'
{
  type: 'stop',
  data: {
    executionId: string
  }
}

// レスポンス
{
  type: 'execution_stopped',
  data: {
    executionId: string
  }
}
```

#### file:sync - ファイル同期
```typescript
// イベント名: 'file:sync'
{
  type: 'file:sync',
  data: {
    projectId: string,
    action: 'download' | 'upload'
  }
}
```

### 3.3 サーバー → クライアント イベント

#### output - 実行出力
```typescript
// イベント名: 'output'
{
  type: 'output',
  data: {
    executionId: string,
    content: string,      // 出力内容
    timestamp: number,    // Unix timestamp
    stream: 'stdout' | 'stderr'
  }
}
```

#### complete - 実行完了
```typescript
// イベント名: 'complete'
{
  type: 'complete',
  data: {
    executionId: string,
    status: 'success' | 'error' | 'cancelled',
    exitCode?: number,
    filesChanged: string[],  // 変更されたファイルパス
    duration: number         // 実行時間 (ms)
  }
}
```

#### file:changed - ファイル変更通知
```typescript
// イベント名: 'file:changed'
{
  type: 'file:changed',
  data: {
    projectId: string,
    changes: Array<{
      path: string,
      action: 'created' | 'modified' | 'deleted'
    }>
  }
}
```

#### error - エラー
```typescript
// イベント名: 'error'
{
  type: 'error',
  data: {
    code: string,         // エラーコード
    message: string,      // エラーメッセージ
    details?: any         // 詳細情報
  }
}
```

### 3.4 サニタイゼーション

すべての入力は以下のサニタイゼーションが適用されます：

#### ファイルパス
- `..` の除去（ディレクトリトラバーサル防止）
- 先頭の `/` を除去
- 危険な文字の除去: `< > : " | ? * \0`
- パス区切り文字の正規化

#### コマンド
- nullバイトの除去
- 空白文字のトリミング
- 長さ制限 (5000文字)
- 危険なコマンドパターンの検出

### 3.5 エラーコード

| コード | 説明 |
|-------|------|
| AUTH_FAILED | 認証失敗 |
| AUTH_EXPIRED | トークン期限切れ |
| PROJECT_NOT_FOUND | プロジェクトが見つからない |
| PERMISSION_DENIED | アクセス権限なし |
| EXECUTION_TIMEOUT | 実行タイムアウト |
| EXECUTION_FAILED | 実行失敗 |
| FILE_NOT_FOUND | ファイルが見つからない |
| FILE_TOO_LARGE | ファイルサイズ超過 |
| BRIDGE_ERROR | ローカルブリッジエラー |
| VALIDATION_ERROR | 入力検証エラー |
| DANGEROUS_COMMAND | 危険なコマンド検出 |
| RATE_LIMIT_EXCEEDED | レート制限超過 |
| UNKNOWN_ERROR | 不明なエラー |

## 4. REST API (将来実装)

### 4.1 認証
すべてのAPIリクエストには、AuthorizationヘッダーにFirebase ID tokenを含める必要があります。

```
Authorization: Bearer <firebase-id-token>
```

### 4.2 エンドポイント（予定）

#### プロジェクト管理
- `GET /api/projects` - プロジェクト一覧
- `POST /api/projects` - プロジェクト作成
- `GET /api/projects/:id` - プロジェクト詳細
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除

#### ファイル管理
- `GET /api/projects/:id/files` - ファイル一覧
- `POST /api/projects/:id/files` - ファイルアップロード
- `GET /api/projects/:id/files/*` - ファイル取得
- `PUT /api/projects/:id/files/*` - ファイル更新
- `DELETE /api/projects/:id/files/*` - ファイル削除

#### 実行管理
- `GET /api/projects/:id/executions` - 実行履歴
- `POST /api/projects/:id/executions` - 実行開始
- `GET /api/projects/:id/executions/:execId` - 実行詳細
- `DELETE /api/projects/:id/executions/:execId` - 実行キャンセル

## 5. データ制限

### 5.1 サイズ制限
- ファイルサイズ: 最大 10MB
- プロジェクトサイズ: 最大 1GB
- 実行出力: 最大 10MB
- コマンド長: 最大 5000文字
- ファイルパス: 最大 1000文字
- プロジェクト名: 最大 100文字

### 5.2 レート制限

#### 一般APIエンドポイント
- ウィンドウ: 15分
- 最大リクエスト: 100回
- 対象: /health, /api/*

#### 実行API
- ウィンドウ: 1分
- 最大リクエスト: 5回
- 対象: /api/execute, WebSocket 'execute'イベント

#### ファイル操作API
- ウィンドウ: 1分
- 最大リクエスト: 30回
- 対象: /api/files/*, WebSocket 'file:sync'イベント

#### レート制限超過時のレスポンス
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60 // 秒単位
}
```

### 5.3 タイムアウト
- 実行タイムアウト: 5分（デフォルト）
- WebSocket接続: 30分（アイドル）
- API呼び出し: 30秒

## 6. 使用例

### 6.1 プロジェクト作成
```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const createProject = async (userId: string, name: string) => {
  const projectData = {
    userId,
    name,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const docRef = await addDoc(collection(db, 'projects'), projectData);
  return docRef.id;
};
```

### 6.2 Claude実行
```typescript
const socket = io('ws://localhost:8080', {
  auth: { token: await auth.currentUser?.getIdToken() }
});

socket.emit('execute', {
  type: 'execute',
  data: {
    projectId: 'project123',
    command: 'Create a React component for user profile'
  }
});

socket.on('output', (data) => {
  console.log(data.content);
});

socket.on('complete', (data) => {
  console.log('Execution completed:', data.status);
});
```

### 6.3 ファイル監視
```typescript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const watchFiles = (projectId: string) => {
  const q = query(
    collection(db, 'projects', projectId, 'files'),
    where('isDirectory', '==', false)
  );
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New file:', change.doc.data());
      }
      if (change.type === 'modified') {
        console.log('Modified file:', change.doc.data());
      }
      if (change.type === 'removed') {
        console.log('Removed file:', change.doc.data());
      }
    });
  });
};
```

### 6.4 仕様駆動開発の使用例（新機能！）
```typescript
// 仕様生成開始
const startSpecGeneration = (requirements: string[]) => {
  socket.emit('spec:start', {
    projectId: 'project123',
    title: 'User Management System',
    requirements: [
      'ユーザー認証システム',
      'プロフィール管理',
      'ロールベース権限',
      'ユーザー操作用APIエンドポイント'
    ],
    context: 'セキュリティ要件を持つECプラットフォーム'
  });
};

// 仕様生成イベントの監視
socket.on('spec:generated', (data) => {
  console.log(`${data.phase}ドキュメントが生成されました:`);
  console.log(data.content);
  
  if (data.metadata.mermaidDiagrams) {
    console.log('アーキテクチャ図:', data.metadata.mermaidDiagrams);
  }
  
  if (data.metadata.interfaces) {
    console.log('TypeScriptインターフェース:', data.metadata.interfaces);
  }
});

// フィードバックに基づく仕様改善
const refineSpec = (specId: string, feedback: string) => {
  socket.emit('spec:refine', {
    specId,
    feedback: 'OAuth統合と2FA対応を追加',
    phase: 'requirements'
  });
};
```

## 7. パフォーマンス指標

### 7.1 現在のパフォーマンス
- **フロントエンドビルドサイズ**: 766KB（gzip圧縮時207KB）
- **API応答時間**: 平均200ms未満
- **WebSocketレイテンシ**: 50ms未満
- **仕様生成時間**: 30-60秒
- **ファイル同期時間**: 5秒未満

### 7.2 スケーラビリティ目標
- **同時接続ユーザー**: 1000人以上
- **ユーザーあたりプロジェクト数**: 100個以上
- **プロジェクトあたりファイル数**: 1000個以上
- **実行タイムアウト**: 5分
- **稼働率**: 99.9%

## 8. コンプライアンス・セキュリティ

### 8.1 OWASP Top 10対応
- ✅ **A01: アクセス制御の不備** - Firebaseセキュリティルール、ユーザー固有データ
- ✅ **A02: 暗号化の不備** - HTTPS、セキュアトークン、暗号化ストレージ
- ✅ **A03: インジェクション** - 入力検証、パラメータ化クエリ、サニタイゼーション
- ✅ **A04: 安全でない設計** - セキュリティバイデザイン、脅威モデリング
- ✅ **A05: セキュリティ設定ミス** - セキュアデフォルト、強化された設定
- ✅ **A06: 脆弱なコンポーネント** - 定期更新、依存関係スキャン
- ✅ **A07: 識別・認証の不備** - 強力な認証、セッション管理
- ✅ **A08: ソフトウェア・データ整合性の不備** - ファイル整合性チェック、セキュア更新
- ✅ **A09: セキュリティログ監視不足** - 包括的な監査ログ
- ✅ **A10: サーバーサイドリクエストフォージェリ** - リクエスト検証、許可リスト

### 8.2 監査証跡
- **イベント保持期間**: 最低90日間
- **ログ形式**: 構造化JSON
- **モニタリング**: リアルタイムセキュリティアラート
- **コンプライアンス**: SOC 2 Type II対応準備完了

---

*最終更新: 2025年8月10日*
*APIバージョン: 2.0.0*