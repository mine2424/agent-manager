# オフラインモード機能仕様書

## 1. 概要

### 1.1 目的
Agent Managerをオフライン環境でも使用可能にし、ネットワーク接続が不安定な環境でも作業を継続できるようにします。

### 1.2 主要機能
- オフライン時のデータキャッシュ
- ローカルファースト編集
- バックグラウンド同期
- コンフリクト解決
- Progressive Web App (PWA) 対応

## 2. 技術アーキテクチャ

### 2.1 技術スタック
```typescript
{
  "offline": {
    "storage": {
      "database": "IndexedDB",
      "files": "Cache Storage API",
      "queue": "Background Sync API"
    },
    "sync": {
      "strategy": "Eventual Consistency",
      "conflict": "Last Write Wins / Manual Resolution"
    },
    "pwa": {
      "serviceWorker": "Workbox",
      "manifest": "Web App Manifest"
    }
  }
}
```

### 2.2 データフロー
```
オンライン時:
┌─────────┐ → Firebase → ┌─────────┐
│ Browser │ ← Sync     ← │IndexedDB│
└─────────┘              └─────────┘

オフライン時:
┌─────────┐     直接     ┌─────────┐
│ Browser │ ←─────────→ │IndexedDB│
└─────────┘              └─────────┘
     ↓
┌─────────────┐
│ Sync Queue  │ (オンライン復帰時に同期)
└─────────────┘
```

## 3. 機能詳細

### 3.1 オフラインストレージ

#### 3.1.1 IndexedDBスキーマ
```typescript
interface OfflineDatabase {
  projects: {
    key: string; // projectId
    value: Project & {
      syncStatus: 'synced' | 'pending' | 'conflict';
      lastSyncedAt: Date;
      localVersion: number;
    };
  };
  
  files: {
    key: string; // projectId/filepath
    value: FileNode & {
      localContent?: string;
      syncStatus: 'synced' | 'modified' | 'deleted';
      lastModifiedOffline?: Date;
    };
  };
  
  executions: {
    key: string; // executionId
    value: Execution & {
      isOffline: boolean;
      syncStatus: 'pending' | 'synced' | 'failed';
    };
  };
  
  syncQueue: {
    key: string; // operationId
    value: {
      type: 'create' | 'update' | 'delete';
      collection: string;
      documentId: string;
      data: any;
      timestamp: Date;
      retries: number;
    };
  };
}
```

#### 3.1.2 キャッシュ戦略
```typescript
class CacheManager {
  // キャッシュ優先度
  private priorities = {
    critical: ['projects', 'recentFiles'], // 常にキャッシュ
    high: ['executionHistory', 'userSettings'],
    medium: ['fileMetadata'],
    low: ['thumbnails', 'previews']
  };
  
  async cacheData(priority: 'critical' | 'high' | 'medium' | 'low') {
    const quota = await navigator.storage.estimate();
    if (quota.usage / quota.quota > 0.8) {
      await this.evictLowPriorityCache();
    }
    // キャッシュ処理
  }
}
```

### 3.2 オフライン編集

#### 3.2.1 ローカル変更の追跡
```typescript
interface LocalChange {
  id: string;
  fileId: string;
  type: 'edit' | 'create' | 'delete' | 'rename';
  timestamp: Date;
  changes: {
    before?: string;
    after?: string;
    diff?: Diff[];
  };
  userId: string;
}
```

#### 3.2.2 自動保存
```typescript
class OfflineEditor {
  private autoSaveInterval = 30000; // 30秒
  
  async autoSave(fileId: string, content: string) {
    // IndexedDBに保存
    await this.db.files.put({
      id: fileId,
      localContent: content,
      syncStatus: 'modified',
      lastModifiedOffline: new Date()
    });
    
    // 同期キューに追加
    await this.addToSyncQueue({
      type: 'update',
      collection: 'files',
      documentId: fileId,
      data: { content }
    });
  }
}
```

### 3.3 バックグラウンド同期

#### 3.3.1 Service Worker実装
```javascript
// service-worker.js
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-offline-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  const queue = await getSyncQueue();
  
  for (const operation of queue) {
    try {
      await syncOperation(operation);
      await removeFromQueue(operation.id);
    } catch (error) {
      await incrementRetryCount(operation.id);
    }
  }
}
```

#### 3.3.2 同期戦略
```typescript
class SyncManager {
  async sync() {
    // 1. ネットワーク状態確認
    if (!navigator.onLine) return;
    
    // 2. 認証状態確認
    const token = await this.getAuthToken();
    if (!token) return;
    
    // 3. 優先度順に同期
    await this.syncCriticalData();
    await this.syncHighPriorityData();
    await this.syncMediumPriorityData();
    await this.syncLowPriorityData();
  }
  
  private async syncWithRetry(operation: SyncOperation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.performSync(operation);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
  }
}
```

### 3.4 コンフリクト解決

#### 3.4.1 コンフリクト検出
```typescript
interface ConflictDetector {
  detectConflict(local: FileVersion, remote: FileVersion): ConflictType | null;
}

enum ConflictType {
  CONTENT_CONFLICT = 'content',
  DELETE_CONFLICT = 'delete',
  RENAME_CONFLICT = 'rename'
}
```

#### 3.4.2 解決戦略
```typescript
class ConflictResolver {
  async resolve(conflict: Conflict): Promise<Resolution> {
    switch (conflict.type) {
      case ConflictType.CONTENT_CONFLICT:
        return this.resolveContentConflict(conflict);
      case ConflictType.DELETE_CONFLICT:
        return this.resolveDeleteConflict(conflict);
      case ConflictType.RENAME_CONFLICT:
        return this.resolveRenameConflict(conflict);
    }
  }
  
  private async resolveContentConflict(conflict: ContentConflict) {
    // 戦略オプション
    const strategy = await this.getUserPreference();
    
    switch (strategy) {
      case 'last-write-wins':
        return conflict.local.timestamp > conflict.remote.timestamp
          ? conflict.local : conflict.remote;
      
      case 'manual':
        return this.showConflictDialog(conflict);
      
      case 'merge':
        return this.autoMerge(conflict);
    }
  }
}
```

## 4. Progressive Web App (PWA) 実装

### 4.1 Service Worker設定
```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,svg,woff2}'
  ],
  swDest: 'dist/sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firebase-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 // 1日
        }
      }
    }
  ]
};
```

### 4.2 アプリマニフェスト
```json
{
  "name": "Agent Manager",
  "short_name": "AgentMgr",
  "description": "Claude Code実行環境",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a202c",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "offline_enabled": true,
  "prefer_related_applications": false
}
```

## 5. UI/UX設計

### 5.1 オフラインインジケーター
```tsx
const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2">
      <div className="flex items-center justify-center">
        <OfflineIcon className="mr-2" />
        <span>オフラインモード - 変更は自動的に同期されます</span>
      </div>
    </div>
  );
};
```

### 5.2 同期ステータス表示
```tsx
const SyncStatus: React.FC = () => {
  const { pending, syncing, lastSynced } = useSyncStatus();
  
  return (
    <div className="sync-status">
      {syncing && <LoadingSpinner size="sm" />}
      {pending > 0 && (
        <Badge variant="warning">{pending}件の未同期</Badge>
      )}
      {lastSynced && (
        <span className="text-sm text-gray-500">
          最終同期: {formatRelativeTime(lastSynced)}
        </span>
      )}
    </div>
  );
};
```

## 6. パフォーマンス最適化

### 6.1 ストレージ管理
```typescript
class StorageManager {
  async cleanup() {
    const quota = await navigator.storage.estimate();
    const usagePercent = (quota.usage / quota.quota) * 100;
    
    if (usagePercent > 90) {
      // 古いキャッシュを削除
      await this.removeOldCache();
    }
    
    if (usagePercent > 95) {
      // 低優先度データを削除
      await this.removeLowPriorityData();
    }
  }
  
  private async removeOldCache() {
    const threshold = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30日
    // 古いデータを削除
  }
}
```

### 6.2 差分同期
```typescript
class DeltaSync {
  async syncFile(fileId: string) {
    const local = await this.getLocalVersion(fileId);
    const remote = await this.getRemoteVersion(fileId);
    
    if (local.hash === remote.hash) return;
    
    const delta = this.calculateDelta(local.content, remote.content);
    await this.applyDelta(fileId, delta);
  }
}
```

## 7. セキュリティ

### 7.1 ローカルデータ暗号化
```typescript
class SecureStorage {
  private async encrypt(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
}
```

## 8. 実装計画

### Phase 1: 基礎実装（1週間）
- [ ] IndexedDBセットアップ
- [ ] 基本的なオフラインストレージ
- [ ] Service Worker登録

### Phase 2: オフライン編集（2週間）
- [ ] ローカル編集機能
- [ ] 自動保存
- [ ] 変更追跡

### Phase 3: 同期機能（2週間）
- [ ] バックグラウンド同期
- [ ] コンフリクト検出
- [ ] 解決UI

### Phase 4: PWA化（1週間）
- [ ] マニフェスト設定
- [ ] アイコン・スプラッシュ画面
- [ ] インストール促進UI

## 9. 技術的課題

### 9.1 ストレージ制限
- ブラウザごとの容量制限
- 永続化の保証なし
- クォータ管理の複雑さ

### 9.2 同期の複雑性
- 大量データの効率的な同期
- 部分的な同期失敗の処理
- バッテリー消費への配慮

## 10. MVP向け簡易実装案

### 10.1 最小機能セット
1. **読み取り専用キャッシュ**: プロジェクトとファイルの表示のみ
2. **オフライン通知**: ネットワーク状態の表示
3. **キュー表示**: 未同期アイテムの可視化

### 10.2 実装工数
- 基本実装: 5日
- テスト: 2日
- 統合: 1日

合計: 約1週間