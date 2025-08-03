# Agent Manager - 実装ガイド

## 1. セットアップ手順

### 1.1 リポジトリのクローン
```bash
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager
```

### 1.2 Firebase プロジェクトの設定

#### 1.2.1 Firebase Console での作業
1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. 新しいプロジェクトを作成
3. 以下のサービスを有効化：
   - Authentication
   - Firestore Database
   - Storage

#### 1.2.2 GitHub OAuth の設定
1. Firebase Console → Authentication → Sign-in method
2. GitHubプロバイダーを有効化
3. [GitHub Developer Settings](https://github.com/settings/developers) で新しいOAuth Appを作成：
   - **Application name**: Agent Manager
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: `https://[your-project-id].firebaseapp.com/__/auth/handler`
4. GitHub OAuth AppのClient IDとClient SecretをFirebaseに設定

#### 1.2.3 Firestore の初期化
1. Firebase Console → Firestore Database
2. 「データベースを作成」をクリック
3. 本番環境モードを選択
4. リージョンは`asia-northeast1`を選択

### 1.3 フロントエンドのセットアップ

```bash
cd frontend
cp .env.example .env
```

`.env`ファイルを編集：
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_LOCAL_BRIDGE_URL=http://localhost:8080
```

依存関係のインストールと起動：
```bash
npm install
npm run dev
```

### 1.4 ローカルブリッジのセットアップ

```bash
cd ../local-bridge
cp .env.example .env
```

`.env`ファイルを編集：
```env
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

依存関係のインストールと起動：
```bash
npm install
npm run dev
```

### 1.5 Firebase セキュリティルールのデプロイ

プロジェクトルートで：
```bash
npm install -g firebase-tools
firebase login
firebase init
# Firestore と Storage を選択
firebase deploy --only firestore:rules,storage:rules
```

## 2. 開発フロー

### 2.1 ディレクトリ構造

```
agent-manager/
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── components/    # UIコンポーネント
│   │   ├── contexts/      # React Context
│   │   ├── hooks/         # カスタムフック
│   │   ├── pages/         # ページコンポーネント
│   │   ├── services/      # API/Firebase サービス
│   │   ├── types/         # TypeScript型定義
│   │   └── utils/         # ユーティリティ関数
│   └── public/           # 静的ファイル
├── local-bridge/          # Node.js ローカルサーバー
│   ├── src/
│   │   ├── handlers/      # WebSocketハンドラー
│   │   ├── services/      # ビジネスロジック
│   │   ├── types/         # TypeScript型定義
│   │   └── utils/         # ユーティリティ関数
│   └── dist/             # ビルド出力
└── docs/                 # ドキュメント
```

### 2.2 コンポーネント実装パターン

#### 基本的なコンポーネント
```tsx
import React from 'react';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Action
        </button>
      )}
    </div>
  );
};
```

#### Firestore連携パターン
```tsx
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      
      setProjects(projectsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { projects, loading };
};
```

### 2.3 WebSocket通信パターン

#### クライアント側
```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_LOCAL_BRIDGE_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to local bridge');
    });

    this.socket.on('output', (data) => {
      // Handle real-time output
    });
  }

  execute(projectId: string, command: string) {
    this.socket?.emit('execute', {
      projectId,
      command
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
```

## 3. トラブルシューティング

### 3.1 よくある問題

#### Firebase認証エラー
- **問題**: "auth/popup-blocked"
- **解決**: ポップアップブロッカーを無効化

#### CORS エラー
- **問題**: ローカルブリッジへの接続でCORSエラー
- **解決**: `.env`の`ALLOWED_ORIGINS`を確認

#### Claude CLI が見つからない
- **問題**: "claude: command not found"
- **解決**: Claude CLIがPATHに含まれているか確認

### 3.2 デバッグ方法

#### フロントエンド
```javascript
// Firebase デバッグを有効化
import { enableLogging } from 'firebase/firestore';
enableLogging(true);
```

#### ローカルブリッジ
```javascript
// 詳細ログを有効化
DEBUG=* npm run dev
```

## 4. ベストプラクティス

### 4.1 状態管理
- グローバル状態は最小限に
- Firebase リアルタイムリスナーの適切なクリーンアップ
- ローディング状態とエラー状態の管理

### 4.2 セキュリティ
- 環境変数は絶対にコミットしない
- Firebaseセキュリティルールは厳格に
- ユーザー入力は常にサニタイズ

### 4.3 パフォーマンス
- 大きなファイルは遅延読み込み
- Firestoreクエリは必要最小限に
- WebSocket接続は適切に管理

## 5. テスト

### 5.1 手動テスト手順

1. **認証フロー**
   - ログインページでGitHubログイン
   - ダッシュボードへのリダイレクト確認
   - ログアウト機能の確認

2. **プロジェクト管理**（Phase 2で実装予定）
   - プロジェクト作成
   - プロジェクト一覧表示
   - プロジェクト削除

3. **実行機能**（Phase 3で実装予定）
   - コマンド実行
   - リアルタイム出力確認
   - 実行停止

### 5.2 自動テスト（将来実装）
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 6. デプロイメント

### 6.1 フロントエンドのデプロイ
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### 6.2 セキュリティルールのデプロイ
```bash
firebase deploy --only firestore:rules,storage:rules
```

### 6.3 ローカルブリッジの配布
- 各プラットフォーム用のバイナリ作成
- 自動更新機能の実装（将来）

## 7. 貢献ガイドライン

### 7.1 コミットメッセージ
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更
refactor: リファクタリング
test: テスト追加・修正
chore: ビルドプロセスなどの変更
```

### 7.2 プルリクエスト
1. featureブランチを作成
2. 変更を実装
3. テストを実行
4. PRを作成

## 8. リソース

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Socket.io Documentation](https://socket.io/docs)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)