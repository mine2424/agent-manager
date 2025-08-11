# リアルタイムコラボレーション機能仕様書

## 1. 概要

### 1.1 目的
Agent Managerにリアルタイムコラボレーション機能を追加し、複数のユーザーが同時に同じプロジェクトで作業できるようにします。

### 1.2 主要機能
- リアルタイム共同編集
- ユーザープレゼンス表示
- カーソル位置の共有
- コメントとアノテーション
- 変更履歴とコンフリクト解決

## 2. 技術アーキテクチャ

### 2.1 技術スタック
```typescript
{
  "realtime": {
    "server": "Firebase Realtime Database / Firestore",
    "protocol": "WebRTC + WebSocket",
    "conflictResolution": "Operational Transformation (OT)",
    "library": "Yjs or ShareJS"
  }
}
```

### 2.2 データフロー
```
┌─────────────┐     WebSocket      ┌─────────────┐
│   User A    │ ←───────────────→ │             │
│  (Editor)   │                    │  Realtime   │
└─────────────┘                    │   Server    │
                                   │             │
┌─────────────┐     WebSocket      │             │
│   User B    │ ←───────────────→ │             │
│  (Editor)   │                    └─────────────┘
└─────────────┘
```

## 3. 機能詳細

### 3.1 共同編集機能

#### 3.1.1 同時編集
```typescript
interface CollaborativeEdit {
  documentId: string;
  userId: string;
  operation: {
    type: 'insert' | 'delete';
    position: number;
    content?: string;
    length?: number;
  };
  timestamp: number;
  version: number;
}
```

#### 3.1.2 カーソル共有
```typescript
interface CursorPosition {
  userId: string;
  documentId: string;
  position: {
    line: number;
    column: number;
  };
  selection?: {
    start: Position;
    end: Position;
  };
  color: string;
  userName: string;
}
```

### 3.2 プレゼンス機能

#### 3.2.1 オンラインユーザー表示
```typescript
interface UserPresence {
  userId: string;
  userName: string;
  avatar: string;
  status: 'active' | 'idle' | 'away';
  currentFile?: string;
  lastActivity: Date;
  color: string; // カーソル色
}
```

#### 3.2.2 アクティビティ表示
- 現在編集中のファイル
- 最後のアクティビティ時刻
- アイドル状態の検出

### 3.3 コメント機能

#### 3.3.1 インラインコメント
```typescript
interface Comment {
  id: string;
  userId: string;
  projectId: string;
  fileId: string;
  position: {
    line: number;
    startColumn?: number;
    endColumn?: number;
  };
  content: string;
  resolved: boolean;
  replies: Reply[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 変更履歴

#### 3.4.1 バージョン管理
```typescript
interface Version {
  id: string;
  projectId: string;
  fileId: string;
  version: number;
  changes: Change[];
  author: string;
  message?: string;
  createdAt: Date;
}
```

## 4. コンフリクト解決

### 4.1 Operational Transformation (OT)
```typescript
class OperationalTransform {
  // 操作の変換
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position < op2.position) {
        return [op1, { ...op2, position: op2.position + op1.length }];
      } else {
        return [{ ...op1, position: op1.position + op2.length }, op2];
      }
    }
    // ... 他の変換ロジック
  }
}
```

### 4.2 コンフリクト検出と解決
- 自動マージ可能な変更
- 手動解決が必要な変更
- 3-wayマージビュー

## 5. UI/UX設計

### 5.1 コラボレーションインジケーター
```tsx
<CollaborationBar>
  <ActiveUsers users={activeUsers} />
  <CursorIndicators cursors={remoteCursors} />
  <CommentIndicators comments={activeComments} />
</CollaborationBar>
```

### 5.2 リアルタイム通知
- ユーザーの参加/離脱
- ファイルの変更
- コメントの追加
- コンフリクトの発生

## 6. パフォーマンス最適化

### 6.1 デバウンシング
```typescript
const debouncedSync = debounce((changes: Change[]) => {
  syncToServer(changes);
}, 100); // 100ms
```

### 6.2 差分同期
- 変更箇所のみの送信
- バッチング処理
- 圧縮アルゴリズム

## 7. セキュリティ

### 7.1 アクセス制御
```typescript
interface ProjectPermission {
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
  };
}
```

### 7.2 データ暗号化
- エンドツーエンド暗号化（オプション）
- 転送時の暗号化（必須）

## 8. 実装計画

### Phase 1: 基礎実装（2週間）
- [ ] WebSocketサーバーのセットアップ
- [ ] 基本的なプレゼンス機能
- [ ] シンプルな共同編集

### Phase 2: 高度な機能（3週間）
- [ ] Operational Transformation実装
- [ ] カーソル共有
- [ ] コメント機能

### Phase 3: 最適化と統合（2週間）
- [ ] パフォーマンス最適化
- [ ] UIの洗練
- [ ] テストとバグ修正

## 9. 技術的課題

### 9.1 スケーラビリティ
- 同時接続ユーザー数の制限
- サーバーリソースの管理
- データ同期の効率化

### 9.2 信頼性
- ネットワーク切断時の処理
- データ整合性の保証
- 自動リカバリー機能

## 10. 代替案

### 10.1 サードパーティサービス
- **Liveblocks**: リアルタイムコラボレーションAPI
- **Convergence**: エンタープライズ向けコラボレーションプラットフォーム
- **Firebase Realtime Database**: Googleのリアルタイムデータベース

### 10.2 シンプルな実装
- ファイルロック方式
- 順次編集（非リアルタイム）
- 通知ベースの更新

## 11. MVP向け簡易実装案

### 11.1 最小機能セット
1. **ファイルロック**: 編集中は他ユーザーが編集不可
2. **プレゼンス表示**: オンラインユーザーの表示のみ
3. **更新通知**: ファイル保存時に他ユーザーに通知

### 11.2 実装工数
- 基本実装: 1週間
- テスト: 3日
- 統合: 2日

合計: 約2週間（1人月の50%）