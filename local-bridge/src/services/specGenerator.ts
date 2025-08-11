import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface SpecRequest {
  projectId: string;
  userId: string;
  title: string;
  requirements: string[];
  phase?: 'requirements' | 'design' | 'implementation';
}

export interface SpecDocument {
  type: 'requirements' | 'design' | 'tasks';
  content: string;
  metadata: {
    title: string;
    generatedAt: string;
    phase: string;
    version: string;
  };
}

export class SpecGenerator extends EventEmitter {
  private currentSpec: SpecRequest | null = null;
  private documents: Map<string, SpecDocument> = new Map();

  constructor() {
    super();
  }

  /**
   * Start a new spec generation process
   */
  async startSpec(request: SpecRequest): Promise<void> {
    this.currentSpec = request;
    this.documents.clear();
    
    this.emit('spec:started', {
      projectId: request.projectId,
      title: request.title
    });

    // Start with requirements phase
    await this.generateRequirements(request);
  }

  /**
   * Generate requirements document using EARS notation
   */
  private async generateRequirements(request: SpecRequest): Promise<SpecDocument> {
    const requirements = this.expandRequirements(request.requirements);
    const earsNotation = this.convertToEARS(requirements);
    
    const document: SpecDocument = {
      type: 'requirements',
      content: this.formatRequirementsDocument(request.title, requirements, earsNotation),
      metadata: {
        title: `${request.title} - Requirements`,
        generatedAt: new Date().toISOString(),
        phase: 'requirements',
        version: '1.0.0'
      }
    };

    this.documents.set('requirements', document);
    this.emit('document:generated', document);
    
    return document;
  }

  /**
   * Expand minimal requirements into detailed user stories (Kiro-style)
   */
  private expandRequirements(minimalReqs: string[]): string[] {
    const expanded: string[] = [];
    
    for (const req of minimalReqs) {
      expanded.push(req);
      
      // Auto-expand based on common patterns
      if (req.toLowerCase().includes('認証') || req.toLowerCase().includes('auth')) {
        expanded.push('ユーザー登録機能');
        expanded.push('パスワードリセット機能');
        expanded.push('セッション管理');
        expanded.push('多要素認証（オプション）');
      }
      
      if (req.toLowerCase().includes('管理') || req.toLowerCase().includes('admin')) {
        expanded.push('権限管理システム（RBAC）');
        expanded.push('監査ログ機能');
        expanded.push('管理者ダッシュボード');
      }
      
      if (req.toLowerCase().includes('api')) {
        expanded.push('認証・認可機能');
        expanded.push('レート制限');
        expanded.push('エラーハンドリング');
        expanded.push('OpenAPI仕様書');
      }
    }
    
    // Add security requirements automatically
    expanded.push('セキュリティ要件（自動追加）');
    expanded.push('- XSS対策');
    expanded.push('- CSRF保護');
    expanded.push('- SQLインジェクション対策');
    expanded.push('- 安全なセッション管理');
    
    return [...new Set(expanded)]; // Remove duplicates
  }

  /**
   * Convert requirements to EARS notation
   */
  private convertToEARS(requirements: string[]): string[] {
    const earsStatements: string[] = [];
    
    for (const req of requirements) {
      if (req.includes('認証') || req.includes('auth')) {
        earsStatements.push(`
WHEN ユーザーがログインを試行する際
GIVEN 正しい認証情報を入力した場合
THEN システムは認証を確認する
AND 成功時はダッシュボードにリダイレクトする
AND セッションを作成する`);
      }
      
      if (req.includes('権限') || req.includes('permission')) {
        earsStatements.push(`
WHERE 管理者権限が必要な機能に
IS アクセスが試行された場合
THE SYSTEM SHALL 権限レベルを確認する
AND 不十分な場合はアクセス拒否する
AND セキュリティイベントをログに記録する`);
      }
      
      if (req.includes('API')) {
        earsStatements.push(`
WHILE APIエンドポイントが呼び出されている間
THE SYSTEM SHALL リクエストを検証する
AND レート制限を適用する
AND 適切なレスポンスを返す
AND アクセスログを記録する`);
      }
    }
    
    return earsStatements;
  }

  /**
   * Format requirements document
   */
  private formatRequirementsDocument(title: string, requirements: string[], earsNotation: string[]): string {
    return `# ${title} - Requirements Specification

## Generated: ${new Date().toISOString()}

## Overview
This document defines the requirements for ${title} using the Kiro spec-driven development methodology.

## User Stories (Auto-expanded from minimal input)

${requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

## EARS Notation Requirements

${earsNotation.join('\n\n')}

## Acceptance Criteria

### Functional Requirements
- All user stories must be implemented
- System must handle edge cases gracefully
- Error messages must be user-friendly

### Non-Functional Requirements
- Response time < 200ms for API calls
- Support for 1000+ concurrent users
- 99.9% uptime SLA
- WCAG 2.1 AA compliance

### Security Requirements
- OWASP Top 10 compliance
- Data encryption at rest and in transit
- Regular security audits
- Penetration testing before release

## Next Steps
1. Review and approve requirements
2. Proceed to design phase
3. Generate design.md document
`;
  }

  /**
   * Generate design document with Mermaid diagrams
   */
  async generateDesign(projectContext?: any): Promise<SpecDocument> {
    if (!this.currentSpec) {
      throw new Error('No active spec session');
    }

    const architecture = this.analyzeArchitecture(projectContext);
    const mermaidDiagrams = this.generateMermaidDiagrams(this.currentSpec.title);
    const interfaces = this.generateTypeScriptInterfaces(this.currentSpec.title);

    const document: SpecDocument = {
      type: 'design',
      content: this.formatDesignDocument(this.currentSpec.title, architecture, mermaidDiagrams, interfaces),
      metadata: {
        title: `${this.currentSpec.title} - Design`,
        generatedAt: new Date().toISOString(),
        phase: 'design',
        version: '1.0.0'
      }
    };

    this.documents.set('design', document);
    this.emit('document:generated', document);
    
    return document;
  }

  /**
   * Analyze existing architecture
   */
  private analyzeArchitecture(context?: any): any {
    return {
      frontend: 'React + TypeScript',
      backend: 'Node.js + Express',
      database: 'Firebase Firestore',
      authentication: 'Firebase Auth',
      deployment: 'Firebase Hosting',
      patterns: ['Repository Pattern', 'Service Layer', 'Clean Architecture']
    };
  }

  /**
   * Generate Mermaid diagrams
   */
  private generateMermaidDiagrams(title: string): string {
    return `
\`\`\`mermaid
graph TB
    Client[React Client] --> API[Express API Gateway]
    API --> Auth[Auth Service]
    API --> Business[Business Logic]
    API --> Data[Data Layer]
    
    Auth --> Firebase[Firebase Auth]
    Data --> Firestore[(Firestore DB)]
    
    Business --> Validator[Validation Service]
    Business --> Transformer[Data Transformer]
    
    style Client fill:#61dafb
    style API fill:#68a063
    style Firebase fill:#ffa000
    style Firestore fill:#1976d2
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Auth
    participant Database
    
    User->>Frontend: Submit Request
    Frontend->>API: API Call with Token
    API->>Auth: Validate Token
    Auth-->>API: Token Valid
    API->>Database: Query Data
    Database-->>API: Return Data
    API-->>Frontend: JSON Response
    Frontend-->>User: Display Result
\`\`\`
`;
  }

  /**
   * Generate TypeScript interfaces
   */
  private generateTypeScriptInterfaces(title: string): string {
    return `
\`\`\`typescript
// Domain Entities
export interface ${this.toPascalCase(title)}Entity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string;
  readonly status: EntityStatus;
}

// Use Cases
export interface ${this.toPascalCase(title)}UseCase {
  create(data: Create${this.toPascalCase(title)}DTO): Promise<${this.toPascalCase(title)}Entity>;
  update(id: string, data: Update${this.toPascalCase(title)}DTO): Promise<${this.toPascalCase(title)}Entity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<${this.toPascalCase(title)}Entity | null>;
  findAll(filter?: FilterOptions): Promise<${this.toPascalCase(title)}Entity[]>;
}

// DTOs
export interface Create${this.toPascalCase(title)}DTO {
  // Add specific fields based on requirements
}

export interface Update${this.toPascalCase(title)}DTO {
  // Add specific fields based on requirements
}

// Repository Interface
export interface ${this.toPascalCase(title)}Repository {
  save(entity: ${this.toPascalCase(title)}Entity): Promise<void>;
  findById(id: string): Promise<${this.toPascalCase(title)}Entity | null>;
  findAll(filter?: FilterOptions): Promise<${this.toPascalCase(title)}Entity[]>;
  delete(id: string): Promise<void>;
}
\`\`\`
`;
  }

  /**
   * Format design document
   */
  private formatDesignDocument(title: string, architecture: any, diagrams: string, interfaces: string): string {
    return `# ${title} - Design Specification

## Generated: ${new Date().toISOString()}

## Architecture Overview

### Technology Stack
- Frontend: ${architecture.frontend}
- Backend: ${architecture.backend}
- Database: ${architecture.database}
- Authentication: ${architecture.authentication}
- Deployment: ${architecture.deployment}

### Design Patterns
${architecture.patterns.map((p: string) => `- ${p}`).join('\n')}

## System Architecture

${diagrams}

## TypeScript Interfaces

${interfaces}

## API Design

### Endpoints
- \`POST /api/${this.toKebabCase(title)}\` - Create new resource
- \`GET /api/${this.toKebabCase(title)}/:id\` - Get resource by ID
- \`PUT /api/${this.toKebabCase(title)}/:id\` - Update resource
- \`DELETE /api/${this.toKebabCase(title)}/:id\` - Delete resource
- \`GET /api/${this.toKebabCase(title)}\` - List resources with pagination

### Security
- JWT authentication required
- Rate limiting: 100 requests per minute
- Input validation on all endpoints
- CORS configuration for frontend origin only

## Database Schema

### Collections
- \`${this.toKebabCase(title)}\` - Main entity collection
- \`${this.toKebabCase(title)}_audit\` - Audit log collection

### Indexes
- Primary: \`id\` (unique)
- Secondary: \`createdAt\`, \`status\`, \`createdBy\`

## Next Steps
1. Review and approve design
2. Proceed to implementation planning
3. Generate tasks.md document
`;
  }

  /**
   * Generate implementation tasks document
   */
  async generateTasks(): Promise<SpecDocument> {
    if (!this.currentSpec) {
      throw new Error('No active spec session');
    }

    const tasks = this.generateImplementationTasks(this.currentSpec.title);
    const timeline = this.generateTimeline(tasks);
    const qualityChecks = this.generateQualityChecks();

    const document: SpecDocument = {
      type: 'tasks',
      content: this.formatTasksDocument(this.currentSpec.title, tasks, timeline, qualityChecks),
      metadata: {
        title: `${this.currentSpec.title} - Implementation Tasks`,
        generatedAt: new Date().toISOString(),
        phase: 'implementation',
        version: '1.0.0'
      }
    };

    this.documents.set('tasks', document);
    this.emit('document:generated', document);
    
    return document;
  }

  /**
   * Generate implementation tasks
   */
  private generateImplementationTasks(title: string): any[] {
    return [
      {
        phase: 'Phase 1: Backend Foundation',
        tasks: [
          'Set up database schema and migrations',
          'Implement domain entities and value objects',
          'Create repository interfaces and implementations',
          'Set up dependency injection container',
          'Implement authentication middleware'
        ],
        duration: '3 days'
      },
      {
        phase: 'Phase 2: Business Logic',
        tasks: [
          'Implement use case handlers',
          'Add validation rules and error handling',
          'Create data transformation services',
          'Implement audit logging',
          'Add unit tests for business logic'
        ],
        duration: '4 days'
      },
      {
        phase: 'Phase 3: API Layer',
        tasks: [
          'Create REST API endpoints',
          'Implement request/response DTOs',
          'Add input validation middleware',
          'Set up rate limiting',
          'Generate OpenAPI documentation'
        ],
        duration: '3 days'
      },
      {
        phase: 'Phase 4: Frontend Implementation',
        tasks: [
          'Create React components',
          'Implement state management',
          'Add form validation',
          'Integrate with API',
          'Add loading states and error handling'
        ],
        duration: '5 days'
      },
      {
        phase: 'Phase 5: Testing & Deployment',
        tasks: [
          'Write integration tests',
          'Perform security testing',
          'Set up CI/CD pipeline',
          'Deploy to staging environment',
          'Conduct user acceptance testing'
        ],
        duration: '3 days'
      }
    ];
  }

  /**
   * Generate timeline
   */
  private generateTimeline(tasks: any[]): string {
    const totalDays = tasks.reduce((sum, phase) => {
      const days = parseInt(phase.duration) || 0;
      return sum + days;
    }, 0);

    return `Total Duration: ${totalDays} days (${Math.ceil(totalDays / 5)} weeks)`;
  }

  /**
   * Generate quality checks
   */
  private generateQualityChecks(): string[] {
    return [
      'Code coverage > 80%',
      'All tests passing',
      'No critical security vulnerabilities',
      'Performance benchmarks met',
      'Accessibility audit passed',
      'Code review completed',
      'Documentation updated'
    ];
  }

  /**
   * Format tasks document
   */
  private formatTasksDocument(title: string, tasks: any[], timeline: string, qualityChecks: string[]): string {
    const tasksContent = tasks.map(phase => `
### ${phase.phase}
**Duration:** ${phase.duration}

${phase.tasks.map((task: string, i: number) => `${i + 1}. [ ] ${task}`).join('\n')}
`).join('\n');

    return `# ${title} - Implementation Plan

## Generated: ${new Date().toISOString()}

## Timeline
${timeline}

## Implementation Phases

${tasksContent}

## Quality Checkpoints

${qualityChecks.map(check => `- [ ] ${check}`).join('\n')}

## Risk Mitigation

### Technical Risks
- **Database Performance**: Use indexing and caching strategies
- **Security Vulnerabilities**: Regular security audits and penetration testing
- **Scalability Issues**: Implement horizontal scaling from the start
- **Integration Failures**: Comprehensive integration testing

### Process Risks
- **Scope Creep**: Strict adherence to requirements document
- **Timeline Delays**: Buffer time included in estimates
- **Resource Availability**: Cross-training team members

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Deployed to staging
- [ ] UAT completed
- [ ] Production deployment approved

## Next Steps
1. Begin Phase 1 implementation
2. Set up daily standups
3. Track progress in project management tool
4. Regular stakeholder updates
`;
  }

  /**
   * Save generated documents to files
   */
  async saveDocuments(outputDir: string): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const [type, document] of this.documents) {
      const filename = `${type}.md`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, document.content);
      
      this.emit('document:saved', {
        type,
        path: filepath
      });
    }
  }

  /**
   * Get all generated documents
   */
  getDocuments(): Map<string, SpecDocument> {
    return this.documents;
  }

  /**
   * Continue to next phase
   */
  async nextPhase(): Promise<void> {
    if (!this.currentSpec) {
      throw new Error('No active spec session');
    }

    switch (this.currentSpec.phase) {
      case 'requirements':
        this.currentSpec.phase = 'design';
        await this.generateDesign();
        break;
      case 'design':
        this.currentSpec.phase = 'implementation';
        await this.generateTasks();
        break;
      case 'implementation':
        this.emit('spec:completed', {
          projectId: this.currentSpec.projectId,
          documents: Array.from(this.documents.keys())
        });
        break;
      default:
        this.currentSpec.phase = 'requirements';
        await this.generateRequirements(this.currentSpec);
    }
  }

  // Utility functions
  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  private toKebabCase(str: string): string {
    return str.replace(/\s+/g, '-').toLowerCase();
  }
}