# Agent Manager - API仕様書

## 1. 概要

Agent Managerは3つの主要なAPIインターフェースを提供します：
1. **Firebase Firestore API** - データ永続化
2. **WebSocket API** - リアルタイム通信
3. **REST API** (将来実装) - 外部連携用

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

### 3.2 クライアント → サーバー イベント

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

### 3.4 エラーコード

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
- コマンド長: 最大 1000文字

### 5.2 レート制限
- API呼び出し: 1000回/時間
- 実行: 100回/日
- 同時実行: 1つ/プロジェクト

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