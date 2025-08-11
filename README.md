# Agent Manager

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🌟 Agent Manager - Cloud-based Claude Code Manager

A web-based development environment that allows you to run Claude Code from anywhere. Manage projects, edit files, and execute Claude commands through an intuitive interface accessible from both desktop and mobile devices.

### ✨ Features

#### Core Features
- **🔐 GitHub Authentication**: Secure login with GitHub OAuth
- **📁 Project Management**: Create, manage, and organize multiple projects
- **📝 File Editor**: Built-in Monaco editor with syntax highlighting
- **🚀 Claude Execution**: Run Claude Code commands directly from the browser
- **🔄 File Synchronization**: Automatic sync between local execution and cloud storage
- **📱 Mobile Optimized**: Full-featured mobile interface with touch gestures
- **💾 Cloud Storage**: All projects and files stored securely in Firebase

#### Advanced Features (New!)
- **📋 Spec-Driven Development**: Kiro-style specification generation from minimal input
- **🔍 EARS Notation**: Structured requirements with automated expansion
- **📊 Architecture Diagrams**: Auto-generated Mermaid diagrams
- **📝 3-Phase Documentation**: Requirements → Design → Implementation tasks
- **🔒 Security First**: OWASP Top 10 compliance, audit logging, rate limiting
- **⚡ Real-time Collaboration**: WebSocket-based live updates
- **🎨 Dark Mode**: Eye-friendly interface for long coding sessions

### 🛠 Tech Stack

#### Frontend
- React 18 + TypeScript
- Vite for fast development
- Monaco Editor for code editing
- Tailwind CSS for styling
- Socket.IO for real-time communication

#### Backend
- Node.js + Express
- Firebase (Firestore, Auth, Storage)
- Socket.IO for WebSocket connections
- Claude CLI integration

### 🚀 Getting Started

#### Prerequisites
- Node.js 18+ (tested with v24.4.1)
- npm or pnpm
- Claude CLI installed locally
- Firebase project setup
- GitHub OAuth App credentials

#### Quick Start
```bash
# Clone and setup
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager

# Automated setup
./scripts/setup-env.sh

# Start development servers
./scripts/start-dev.sh

# Open in browser
open http://localhost:5173
```

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager
```

2. Install dependencies:

**Using pnpm (recommended):**
```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install all dependencies
pnpm install
```

**Using npm:**
```bash
# Frontend
cd frontend
npm install

# Local Bridge
cd ../local-bridge
npm install
```

3. Configure environment variables:

Frontend (.env):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_LOCAL_BRIDGE_URL=http://localhost:8080
```

Local Bridge (.env):
```env
PORT=8080
FIREBASE_SERVICE_ACCOUNT=path/to/serviceAccount.json
CLAUDE_CLI_PATH=claude
```

4. Start the development servers:

**Using pnpm (recommended):**
```bash
# Start both servers in parallel
pnpm dev

# Or start individually
pnpm dev:frontend  # Frontend only
pnpm dev:bridge    # Local bridge only
```

**Using npm:**
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Local Bridge
cd local-bridge
npm run dev
```

5. Open http://localhost:5173 in your browser

### 📱 Mobile Features

- **Swipe Navigation**: Swipe left/right to switch between tabs
- **Pull to Refresh**: Pull down to refresh file lists
- **Mobile Toolbar**: Quick access to save and close actions
- **Responsive Design**: Optimized layout for all screen sizes

### 🔒 Security

- Firebase Authentication with GitHub OAuth
- Secure token-based API access
- User-scoped data isolation
- Input sanitization and validation

### 📚 Documentation

#### Getting Started
- [Quick Start Guide](docs/quick-start.md)
- [Environment Setup](docs/firebase-setup.md)
- [Development Guide](docs/development-guide.md)

#### Features
- [Spec-Driven Development](docs/spec-driven-development.md)
- [Claude Integration](docs/claude-integration.md)
- [Security Implementation](docs/security-implementation.md)

#### Reference
- [API Specification](docs/api-specification.md)
- [Current Status](docs/current-status.md)
- [System Architecture](docs/system-ready.md)
- [Troubleshooting](docs/troubleshooting.md)

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### 📄 License

This project is licensed under the MIT License.

---

<a name="japanese"></a>
## 🌟 Agent Manager - クラウドベースのClaude Code管理ツール

どこからでもClaude Codeを実行できるWebベースの開発環境です。デスクトップとモバイルの両方からアクセス可能な直感的なインターフェースで、プロジェクトの管理、ファイルの編集、Claudeコマンドの実行ができます。

### ✨ 機能

#### コア機能
- **🔐 GitHub認証**: GitHub OAuthによる安全なログイン
- **📁 プロジェクト管理**: 複数プロジェクトの作成・管理・整理
- **📝 ファイルエディター**: シンタックスハイライト付きMonacoエディター内蔵
- **🚀 Claude実行**: ブラウザから直接Claude Codeコマンドを実行
- **🔄 ファイル同期**: ローカル実行とクラウドストレージ間の自動同期
- **📱 モバイル最適化**: タッチジェスチャー対応のフル機能モバイルインターフェース
- **💾 クラウドストレージ**: すべてのプロジェクトとファイルをFirebaseに安全に保存

#### 高度な機能（新機能！）
- **📋 仕様駆動開発**: Kiro式の最小入力からの仕様生成
- **🔍 EARS記法**: 自動拡張付き構造化要件定義
- **📊 アーキテクチャ図**: 自動生成されるMermaidダイアグラム
- **📝 3段階ドキュメント**: 要件 → 設計 → 実装タスク
- **🔒 セキュリティファースト**: OWASP Top 10準拠、監査ログ、レート制限
- **⚡ リアルタイムコラボレーション**: WebSocketベースのライブ更新
- **🎨 ダークモード**: 長時間のコーディングに優しいインターフェース

### 🛠 技術スタック

#### フロントエンド
- React 18 + TypeScript
- Vite（高速開発環境）
- Monaco Editor（コード編集）
- Tailwind CSS（スタイリング）
- Socket.IO（リアルタイム通信）

#### バックエンド
- Node.js + Express
- Firebase (Firestore, Auth, Storage)
- Socket.IO（WebSocket接続）
- Claude CLI統合

### 🚀 はじめに

#### 前提条件
- Node.js 18以上
- pnpm 8以上（またはnpm/yarn）
- Claude CLIがローカルにインストール済み
- Firebaseプロジェクトのセットアップ
- GitHub OAuth Appの認証情報

#### インストール

1. リポジトリをクローン:
```bash
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager
```

2. 依存関係をインストール:

**pnpmを使用（推奨）:**
```bash
# pnpmが未インストールの場合
npm install -g pnpm

# すべての依存関係をインストール
pnpm install
```

**npmを使用:**
```bash
# フロントエンド
cd frontend
npm install

# ローカルブリッジ
cd ../local-bridge
npm install
```

3. 環境変数を設定:

フロントエンド (.env):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_LOCAL_BRIDGE_URL=http://localhost:8080
```

ローカルブリッジ (.env):
```env
PORT=8080
FIREBASE_SERVICE_ACCOUNT=path/to/serviceAccount.json
CLAUDE_CLI_PATH=claude
```

4. 開発サーバーを起動:

**pnpmを使用（推奨）:**
```bash
# 両方のサーバーを並列で起動
pnpm dev

# または個別に起動
pnpm dev:frontend  # フロントエンドのみ
pnpm dev:bridge    # ローカルブリッジのみ
```

**npmを使用:**
```bash
# ターミナル1 - フロントエンド
cd frontend
npm run dev

# ターミナル2 - ローカルブリッジ
cd local-bridge
npm run dev
```

5. ブラウザで http://localhost:5173 を開く

### 📱 モバイル機能

- **スワイプナビゲーション**: 左右スワイプでタブ切り替え
- **プルトゥリフレッシュ**: 下にプルしてファイルリストを更新
- **モバイルツールバー**: 保存・閉じるアクションへのクイックアクセス
- **レスポンシブデザイン**: すべての画面サイズに最適化されたレイアウト

### 🔒 セキュリティ

- GitHub OAuthによるFirebase認証
- セキュアなトークンベースのAPIアクセス
- ユーザー単位のデータ分離
- 入力のサニタイズと検証

### 📚 ドキュメント

- [プロジェクト仕様書](docs/project-specification.md)
- [実装ガイド](docs/implementation-guide.md)
- [API仕様書](docs/api-specification.md)
- [現在の状況](docs/current-status.md)

### 🤝 コントリビューション

コントリビューションを歓迎します！お気軽にPull Requestを送ってください。

### 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。