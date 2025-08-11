# 高度なセキュリティ機能仕様書

## 1. 概要

### 1.1 目的
Agent Managerのセキュリティを強化し、エンタープライズレベルのセキュリティ要件に対応できるようにします。

### 1.2 主要機能
- 多要素認証（MFA）
- 役割ベースアクセス制御（RBAC）
- 監査ログとコンプライアンス
- エンドツーエンド暗号化
- セキュリティポリシー管理

## 2. 認証・認可の強化

### 2.1 多要素認証（MFA）

#### 2.1.1 対応する認証方式
```typescript
enum AuthenticationMethod {
  TOTP = 'totp', // Time-based One-Time Password
  SMS = 'sms',
  EMAIL = 'email',
  WEBAUTHN = 'webauthn', // FIDOキー、生体認証
  BACKUP_CODES = 'backup_codes'
}

interface MFAConfig {
  userId: string;
  methods: {
    primary: AuthenticationMethod;
    backup: AuthenticationMethod[];
  };
  settings: {
    requiredForLogin: boolean;
    requiredForSensitiveOps: boolean;
    gracePeriod: number; // 分
  };
}
```

#### 2.1.2 WebAuthn実装
```typescript
class WebAuthnService {
  async register(userId: string): Promise<Credential> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Agent Manager",
          id: "agent-manager.app"
        },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: user.email,
          displayName: user.displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      }
    });
    
    return credential;
  }
}
```

### 2.2 役割ベースアクセス制御（RBAC）

#### 2.2.1 権限モデル
```typescript
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // 継承する役割
}

interface Permission {
  resource: string;
  actions: Action[];
  conditions?: Condition[];
}

enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  SHARE = 'share'
}

interface Condition {
  type: 'time' | 'ip' | 'attribute';
  operator: 'eq' | 'ne' | 'in' | 'contains';
  value: any;
}

// 組み込み役割
const builtInRoles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    permissions: [
      { resource: 'project:*', actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXECUTE, Action.SHARE] }
    ]
  },
  {
    id: 'editor',
    name: 'Editor',
    permissions: [
      { resource: 'project:*', actions: [Action.READ, Action.UPDATE, Action.EXECUTE] },
      { resource: 'file:*', actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] }
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissions: [
      { resource: 'project:*', actions: [Action.READ] },
      { resource: 'file:*', actions: [Action.READ] }
    ]
  }
];
```

#### 2.2.2 アクセス制御の実装
```typescript
class AccessControl {
  async checkPermission(
    user: User,
    resource: string,
    action: Action,
    context?: Context
  ): Promise<boolean> {
    // 1. ユーザーの役割を取得
    const roles = await this.getUserRoles(user.id);
    
    // 2. 各役割の権限をチェック
    for (const role of roles) {
      const permissions = await this.getRolePermissions(role);
      
      for (const permission of permissions) {
        if (this.matchesResource(permission.resource, resource) &&
            permission.actions.includes(action) &&
            this.checkConditions(permission.conditions, context)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private matchesResource(pattern: string, resource: string): boolean {
    // ワイルドカードマッチング
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(resource);
  }
}
```

## 3. 監査とコンプライアンス

### 3.1 監査ログ

#### 3.1.1 ログ形式
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  details: {
    ipAddress: string;
    userAgent: string;
    location?: {
      country: string;
      city: string;
    };
    changes?: {
      before: any;
      after: any;
    };
  };
  result: 'success' | 'failure';
  errorMessage?: string;
}
```

#### 3.1.2 監査対象イベント
```typescript
const auditableEvents = {
  // 認証関連
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_MFA_ENABLE: 'auth.mfa.enable',
  AUTH_MFA_DISABLE: 'auth.mfa.disable',
  
  // プロジェクト関連
  PROJECT_CREATE: 'project.create',
  PROJECT_DELETE: 'project.delete',
  PROJECT_SHARE: 'project.share',
  PROJECT_PERMISSION_CHANGE: 'project.permission.change',
  
  // ファイル関連
  FILE_CREATE: 'file.create',
  FILE_UPDATE: 'file.update',
  FILE_DELETE: 'file.delete',
  FILE_DOWNLOAD: 'file.download',
  
  // 実行関連
  EXECUTION_START: 'execution.start',
  EXECUTION_COMPLETE: 'execution.complete',
  
  // セキュリティ関連
  SECURITY_POLICY_CHANGE: 'security.policy.change',
  SUSPICIOUS_ACTIVITY: 'security.suspicious'
};
```

#### 3.1.3 ログ保存と検索
```typescript
class AuditLogService {
  async log(event: AuditLog): Promise<void> {
    // Firestoreに保存
    await this.firestore
      .collection('auditLogs')
      .doc(event.id)
      .set(event);
    
    // 重要なイベントは外部SIEMに転送
    if (this.isCriticalEvent(event)) {
      await this.sendToSIEM(event);
    }
  }
  
  async search(query: AuditQuery): Promise<AuditLog[]> {
    let firestoreQuery = this.firestore.collection('auditLogs');
    
    if (query.userId) {
      firestoreQuery = firestoreQuery.where('userId', '==', query.userId);
    }
    
    if (query.startDate && query.endDate) {
      firestoreQuery = firestoreQuery
        .where('timestamp', '>=', query.startDate)
        .where('timestamp', '<=', query.endDate);
    }
    
    if (query.action) {
      firestoreQuery = firestoreQuery.where('action', '==', query.action);
    }
    
    return firestoreQuery.get();
  }
}
```

### 3.2 コンプライアンス機能

#### 3.2.1 データ保持ポリシー
```typescript
interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // 日数
  action: 'delete' | 'archive' | 'anonymize';
  exceptions?: {
    condition: string;
    retentionPeriod: number;
  }[];
}

const retentionPolicies: RetentionPolicy[] = [
  {
    dataType: 'auditLogs',
    retentionPeriod: 2555, // 7年
    action: 'archive'
  },
  {
    dataType: 'executionLogs',
    retentionPeriod: 90,
    action: 'delete',
    exceptions: [{
      condition: 'hasError',
      retentionPeriod: 180
    }]
  },
  {
    dataType: 'userActivity',
    retentionPeriod: 365,
    action: 'anonymize'
  }
];
```

#### 3.2.2 データエクスポート（GDPR対応）
```typescript
class DataExportService {
  async exportUserData(userId: string): Promise<UserDataPackage> {
    const data: UserDataPackage = {
      profile: await this.getUserProfile(userId),
      projects: await this.getUserProjects(userId),
      files: await this.getUserFiles(userId),
      executions: await this.getUserExecutions(userId),
      auditLogs: await this.getUserAuditLogs(userId),
      settings: await this.getUserSettings(userId)
    };
    
    // データを暗号化してパッケージング
    const encrypted = await this.encryptPackage(data);
    
    return encrypted;
  }
  
  async deleteUserData(userId: string): Promise<void> {
    // GDPR準拠の完全削除
    await Promise.all([
      this.deleteUserProfile(userId),
      this.deleteUserProjects(userId),
      this.deleteUserFiles(userId),
      this.anonymizeAuditLogs(userId)
    ]);
  }
}
```

## 4. エンドツーエンド暗号化

### 4.1 暗号化アーキテクチャ
```typescript
interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  keyLength: 256;
  iterations: 100000;
}

class E2EEncryption {
  // クライアントサイドでの暗号化
  async encryptFile(file: File, userKey: CryptoKey): Promise<EncryptedFile> {
    const fileKey = await this.generateFileKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // ファイルを暗号化
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      fileKey,
      await file.arrayBuffer()
    );
    
    // ファイルキーをユーザーキーで暗号化
    const encryptedFileKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      userKey,
      await crypto.subtle.exportKey('raw', fileKey)
    );
    
    return {
      content: encryptedContent,
      encryptedKey: encryptedFileKey,
      iv,
      metadata: {
        fileName: file.name,
        size: file.size,
        type: file.type
      }
    };
  }
  
  // キー管理
  async rotateKeys(userId: string): Promise<void> {
    const newKeyPair = await this.generateKeyPair();
    const oldKeyPair = await this.getUserKeyPair(userId);
    
    // 既存のファイルキーを再暗号化
    const files = await this.getUserFiles(userId);
    for (const file of files) {
      const fileKey = await this.decryptFileKey(file.encryptedKey, oldKeyPair.privateKey);
      const newEncryptedKey = await this.encryptFileKey(fileKey, newKeyPair.publicKey);
      await this.updateFileKey(file.id, newEncryptedKey);
    }
    
    // 新しいキーペアを保存
    await this.saveUserKeyPair(userId, newKeyPair);
  }
}
```

### 4.2 ゼロ知識アーキテクチャ
```typescript
class ZeroKnowledgeAuth {
  // SRP (Secure Remote Password) プロトコル
  async register(email: string, password: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const verifier = await this.computeVerifier(email, password, salt);
    
    // サーバーにはパスワードではなく検証値のみを送信
    await this.api.register({
      email,
      salt: btoa(String.fromCharCode(...salt)),
      verifier: btoa(String.fromCharCode(...verifier))
    });
  }
  
  async login(email: string, password: string): Promise<Session> {
    // SRPハンドシェイク
    const { salt, serverPublicKey } = await this.api.startLogin(email);
    const clientKeyPair = await this.generateEphemeralKeyPair();
    
    const sharedSecret = await this.computeSharedSecret(
      clientKeyPair.privateKey,
      serverPublicKey,
      email,
      password,
      salt
    );
    
    const proof = await this.computeProof(sharedSecret);
    const { serverProof, sessionKey } = await this.api.verifyLogin(proof);
    
    // サーバー証明の検証
    if (!await this.verifyServerProof(serverProof, sharedSecret)) {
      throw new Error('Server authentication failed');
    }
    
    return { sessionKey };
  }
}
```

## 5. セキュリティポリシー管理

### 5.1 組織レベルポリシー
```typescript
interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'block' | 'warn' | 'audit';
  scope: {
    users?: string[];
    groups?: string[];
    projects?: string[];
  };
}

interface SecurityRule {
  type: string;
  condition: string;
  action: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const defaultPolicies: SecurityPolicy[] = [
  {
    id: 'password-policy',
    name: 'パスワードポリシー',
    rules: [
      {
        type: 'password',
        condition: 'length >= 12',
        action: 'require',
        severity: 'high'
      },
      {
        type: 'password',
        condition: 'complexity === high',
        action: 'require',
        severity: 'medium'
      }
    ],
    enforcement: 'block'
  },
  {
    id: 'access-policy',
    name: 'アクセスポリシー',
    rules: [
      {
        type: 'ip',
        condition: 'not in allowedRanges',
        action: 'block',
        severity: 'critical'
      },
      {
        type: 'time',
        condition: 'outside businessHours',
        action: 'require-mfa',
        severity: 'medium'
      }
    ],
    enforcement: 'block'
  }
];
```

### 5.2 異常検知とレスポンス
```typescript
class AnomalyDetection {
  private patterns: Map<string, UserBehaviorPattern> = new Map();
  
  async analyzeActivity(userId: string, activity: UserActivity): Promise<AnomalyScore> {
    const pattern = await this.getUserPattern(userId);
    
    const scores = {
      location: this.scoreLocation(activity.location, pattern.locations),
      time: this.scoreTime(activity.timestamp, pattern.activeTimes),
      action: this.scoreAction(activity.action, pattern.commonActions),
      volume: this.scoreVolume(activity.volume, pattern.normalVolume)
    };
    
    const totalScore = this.calculateTotalScore(scores);
    
    if (totalScore > 0.8) {
      await this.triggerSecurityAlert({
        userId,
        activity,
        score: totalScore,
        details: scores
      });
    }
    
    return { score: totalScore, details: scores };
  }
  
  private async triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
    // 1. 監査ログに記録
    await this.auditLog.log({
      action: 'security.anomaly_detected',
      userId: alert.userId,
      details: alert
    });
    
    // 2. リスクレベルに応じた対応
    if (alert.score > 0.9) {
      // アカウント一時停止
      await this.suspendAccount(alert.userId);
      // 管理者に通知
      await this.notifyAdmins(alert);
    } else {
      // 追加認証を要求
      await this.requireReauthentication(alert.userId);
    }
  }
}
```

## 6. UI/UX実装

### 6.1 セキュリティダッシュボード
```tsx
const SecurityDashboard: React.FC = () => {
  return (
    <div className="security-dashboard">
      <SecurityOverview />
      <ActiveThreats />
      <AuditLogViewer />
      <PolicyManager />
      <UserActivityMap />
    </div>
  );
};

const SecurityOverview: React.FC = () => {
  const { score, issues } = useSecurityScore();
  
  return (
    <Card>
      <h2>セキュリティスコア</h2>
      <CircularProgress value={score} max={100} />
      <IssuesList issues={issues} />
    </Card>
  );
};
```

### 6.2 MFA設定画面
```tsx
const MFASettings: React.FC = () => {
  const [methods, setMethods] = useState<MFAMethod[]>([]);
  
  return (
    <div className="mfa-settings">
      <h2>多要素認証の設定</h2>
      
      <MFAMethodList 
        methods={methods}
        onAdd={addMethod}
        onRemove={removeMethod}
        onSetPrimary={setPrimaryMethod}
      />
      
      <BackupCodes onGenerate={generateBackupCodes} />
      
      <TrustedDevices 
        devices={trustedDevices}
        onRevoke={revokeDevice}
      />
    </div>
  );
};
```

## 7. 実装計画

### Phase 1: 基本的なセキュリティ強化（2週間）
- [ ] MFA基本実装（TOTP）
- [ ] 基本的なRBAC
- [ ] 監査ログ基盤

### Phase 2: 高度な認証（2週間）
- [ ] WebAuthn対応
- [ ] ゼロ知識認証
- [ ] SSO統合

### Phase 3: コンプライアンス機能（2週間）
- [ ] データ保持ポリシー
- [ ] GDPR対応機能
- [ ] レポート生成

### Phase 4: 暗号化と異常検知（3週間）
- [ ] E2E暗号化
- [ ] 異常検知システム
- [ ] セキュリティダッシュボード

## 8. MVP向け実装優先度

### 8.1 必須機能
1. **基本的なMFA**: TOTPのみ対応
2. **シンプルなRBAC**: Owner/Editor/Viewerの3役割
3. **基本監査ログ**: ログイン、主要操作のみ

### 8.2 簡易実装案
```typescript
// 簡易MFA実装
class SimpleMFA {
  async enableTOTP(userId: string): Promise<string> {
    const secret = speakeasy.generateSecret();
    await this.saveUserSecret(userId, secret.base32);
    return secret.otpauth_url;
  }
  
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const secret = await this.getUserSecret(userId);
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
  }
}
```

### 8.3 実装工数
- 基本実装: 2週間
- テスト: 1週間
- ドキュメント: 3日

合計: 約3週間