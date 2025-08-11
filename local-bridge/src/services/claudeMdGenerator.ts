import * as fs from 'fs/promises';
import * as path from 'path';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from './logger';

interface ProjectContext {
  projectId: string;
  projectName: string;
  description?: string;
  techStack: string[];
  recentFiles: FileInfo[];
  recentExecutions: ExecutionInfo[];
  projectStructure: string;
  conventions: CodeConventions;
  customInstructions?: string;
}

interface FileInfo {
  path: string;
  lastModified: Date;
  summary?: string;
}

interface ExecutionInfo {
  command: string;
  timestamp: Date;
  result: string;
}

interface CodeConventions {
  language: string;
  style: string;
  linting: string[];
  testing: string;
  patterns: string[];
}

export class ClaudeMdGenerator {
  private projectCache: Map<string, ProjectContext> = new Map();

  /**
   * Generate CLAUDE.md file for a project
   */
  async generateClaudeMd(projectId: string, userId: string): Promise<string> {
    try {
      logger.info('Generating CLAUDE.md', { projectId, userId });

      // Gather project context
      const context = await this.gatherProjectContext(projectId, userId);
      
      // Generate markdown content
      const content = this.generateMarkdownContent(context);
      
      // Save to project directory
      const filePath = await this.saveClaudeMd(projectId, content);
      
      logger.info('CLAUDE.md generated successfully', { projectId, filePath });
      return content;
    } catch (error) {
      logger.error('Failed to generate CLAUDE.md', { error, projectId });
      throw error;
    }
  }

  /**
   * Gather comprehensive project context
   */
  private async gatherProjectContext(projectId: string, userId: string): Promise<ProjectContext> {
    // Check cache first
    if (this.projectCache.has(projectId)) {
      const cached = this.projectCache.get(projectId)!;
      // Cache for 5 minutes
      if (Date.now() - cached.conventions.language.length < 300000) {
        return cached;
      }
    }

    // Fetch project details
    const projectQuery = query(
      collection(db, 'projects'),
      where('id', '==', projectId),
      where('userId', '==', userId)
    );
    const projectSnapshot = await getDocs(projectQuery);
    
    if (projectSnapshot.empty) {
      throw new Error('Project not found');
    }

    const projectData = projectSnapshot.docs[0].data();

    // Fetch recent files
    const filesQuery = query(
      collection(db, 'projects', projectId, 'files'),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );
    const filesSnapshot = await getDocs(filesQuery);
    
    const recentFiles: FileInfo[] = filesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        path: data.path,
        lastModified: data.updatedAt?.toDate() || new Date(),
        summary: this.generateFileSummary(data)
      };
    });

    // Fetch recent executions
    const executionsQuery = query(
      collection(db, 'projects', projectId, 'executions'),
      orderBy('startedAt', 'desc'),
      limit(10)
    );
    const executionsSnapshot = await getDocs(executionsQuery);
    
    const recentExecutions: ExecutionInfo[] = executionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        command: data.command,
        timestamp: data.startedAt?.toDate() || new Date(),
        result: data.status
      };
    });

    // Analyze project structure
    const projectStructure = await this.analyzeProjectStructure(recentFiles);
    
    // Detect conventions
    const conventions = await this.detectCodeConventions(recentFiles, projectData);

    const context: ProjectContext = {
      projectId,
      projectName: projectData.name,
      description: projectData.description,
      techStack: this.detectTechStack(recentFiles),
      recentFiles,
      recentExecutions,
      projectStructure,
      conventions,
      customInstructions: projectData.customInstructions
    };

    // Cache the context
    this.projectCache.set(projectId, context);

    return context;
  }

  /**
   * Generate markdown content for CLAUDE.md
   */
  private generateMarkdownContent(context: ProjectContext): string {
    const content = `# CLAUDE.md - Project Context for ${context.projectName}

## Project Overview
${context.description || 'No description provided.'}

## Technology Stack
${context.techStack.map(tech => `- ${tech}`).join('\n')}

## Project Structure
\`\`\`
${context.projectStructure}
\`\`\`

## Code Conventions

### Language & Style
- Primary Language: ${context.conventions.language}
- Code Style: ${context.conventions.style}
- Linting Rules: ${context.conventions.linting.join(', ')}
- Testing Framework: ${context.conventions.testing}

### Design Patterns
${context.conventions.patterns.map(pattern => `- ${pattern}`).join('\n')}

## Recent Activity

### Recently Modified Files
${context.recentFiles.slice(0, 10).map(file => 
  `- \`${file.path}\` - ${file.summary || 'Modified'} (${this.formatDate(file.lastModified)})`
).join('\n')}

### Recent Commands
${context.recentExecutions.slice(0, 5).map(exec => 
  `- \`${exec.command}\` - ${exec.result} (${this.formatDate(exec.timestamp)})`
).join('\n')}

## Development Guidelines

### File Naming Conventions
- Components: PascalCase (e.g., \`UserProfile.tsx\`)
- Utilities: camelCase (e.g., \`formatDate.ts\`)
- Styles: kebab-case (e.g., \`user-profile.css\`)
- Tests: *.test.ts or *.spec.ts

### Directory Structure
- \`/src\` - Source code
- \`/tests\` - Test files
- \`/docs\` - Documentation
- \`/public\` - Static assets

### Git Workflow
- Branch naming: \`feature/\`, \`bugfix/\`, \`hotfix/\`
- Commit format: \`type(scope): description\`
- PR reviews required before merge

### Testing Requirements
- Unit tests for utilities and services
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows

## Custom Instructions
${context.customInstructions || `
When working on this project:
1. Follow existing code patterns and conventions
2. Maintain consistent error handling
3. Add appropriate logging for debugging
4. Update tests when modifying functionality
5. Document complex logic with comments
6. Use TypeScript strict mode
7. Optimize for performance and readability
`}

## Security Considerations
- Input validation on all user inputs
- Sanitization of file paths and commands
- Rate limiting on API endpoints
- Authentication required for all operations
- Audit logging for sensitive actions

## Performance Guidelines
- Lazy load large components
- Implement code splitting
- Use React.memo for expensive renders
- Optimize bundle size (<1MB)
- Cache API responses where appropriate

## Useful Commands
\`\`\`bash
# Development
npm run dev           # Start development servers
npm run test         # Run test suite
npm run lint         # Check code quality
npm run build        # Production build

# Project-specific
npm run generate:spec    # Generate specification
npm run analyze         # Analyze bundle size
npm run deploy          # Deploy to production
\`\`\`

## API Endpoints
- \`POST /api/execute\` - Execute Claude commands
- \`GET /api/projects/:id/files\` - List project files
- \`POST /api/specs/generate\` - Generate specifications
- \`WebSocket /socket.io\` - Real-time updates

## Environment Variables
- \`VITE_FIREBASE_*\` - Firebase configuration
- \`VITE_LOCAL_BRIDGE_URL\` - API server URL
- \`CLAUDE_CLI_PATH\` - Claude executable path
- \`NODE_ENV\` - Environment (development/production)

## Known Issues & TODOs
- [ ] Optimize bundle size for mobile
- [ ] Implement offline mode
- [ ] Add more comprehensive error recovery
- [ ] Enhance performance monitoring

## Recent Changes
${this.generateRecentChanges(context)}

---
*Generated: ${new Date().toISOString()}*
*This file helps Claude understand the project context and conventions.*
`;

    return content;
  }

  /**
   * Analyze project structure from files
   */
  private async analyzeProjectStructure(files: FileInfo[]): Promise<string> {
    const structure = new Map<string, Set<string>>();
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        const parent = currentPath;
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        
        if (!structure.has(parent)) {
          structure.set(parent, new Set());
        }
        structure.get(parent)!.add(parts[i]);
      }
      
      // Add file to its directory
      const dir = parts.slice(0, -1).join('/');
      if (!structure.has(dir)) {
        structure.set(dir, new Set());
      }
      structure.get(dir)!.add(parts[parts.length - 1]);
    });

    // Build tree representation
    const buildTree = (path: string = '', indent: number = 0): string => {
      const items = structure.get(path);
      if (!items) return '';
      
      return Array.from(items).sort().map(item => {
        const fullPath = path ? `${path}/${item}` : item;
        const isDir = structure.has(fullPath);
        const prefix = '  '.repeat(indent) + (isDir ? '📁 ' : '📄 ');
        
        let result = prefix + item;
        if (isDir && indent < 3) { // Limit depth
          const subtree = buildTree(fullPath, indent + 1);
          if (subtree) result += '\n' + subtree;
        }
        return result;
      }).join('\n');
    };

    return buildTree() || 'No structure available';
  }

  /**
   * Detect technology stack from files
   */
  private detectTechStack(files: FileInfo[]): string[] {
    const stack = new Set<string>();
    const fileNames = files.map(f => f.path.toLowerCase());
    
    // Frontend frameworks
    if (fileNames.some(f => f.includes('react') || f.endsWith('.tsx') || f.endsWith('.jsx'))) {
      stack.add('React');
    }
    if (fileNames.some(f => f.includes('vue') || f.endsWith('.vue'))) {
      stack.add('Vue.js');
    }
    if (fileNames.some(f => f.includes('angular'))) {
      stack.add('Angular');
    }
    
    // Backend
    if (fileNames.some(f => f.includes('express') || f.includes('server'))) {
      stack.add('Express.js');
    }
    if (fileNames.some(f => f.includes('nest'))) {
      stack.add('NestJS');
    }
    
    // Languages
    if (fileNames.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      stack.add('TypeScript');
    }
    if (fileNames.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) {
      stack.add('JavaScript');
    }
    if (fileNames.some(f => f.endsWith('.py'))) {
      stack.add('Python');
    }
    
    // Build tools
    if (fileNames.some(f => f.includes('vite'))) {
      stack.add('Vite');
    }
    if (fileNames.some(f => f.includes('webpack'))) {
      stack.add('Webpack');
    }
    
    // Testing
    if (fileNames.some(f => f.includes('vitest') || f.includes('jest'))) {
      stack.add('Vitest/Jest');
    }
    if (fileNames.some(f => f.includes('playwright'))) {
      stack.add('Playwright');
    }
    
    // Databases & Services
    if (fileNames.some(f => f.includes('firebase'))) {
      stack.add('Firebase');
    }
    if (fileNames.some(f => f.includes('mongo'))) {
      stack.add('MongoDB');
    }
    if (fileNames.some(f => f.includes('postgres') || f.includes('pg'))) {
      stack.add('PostgreSQL');
    }
    
    // Styling
    if (fileNames.some(f => f.includes('tailwind'))) {
      stack.add('Tailwind CSS');
    }
    if (fileNames.some(f => f.includes('styled-components'))) {
      stack.add('Styled Components');
    }
    
    return Array.from(stack);
  }

  /**
   * Detect code conventions from project
   */
  private async detectCodeConventions(files: FileInfo[], projectData: any): Promise<CodeConventions> {
    const fileExtensions = files.map(f => path.extname(f.path));
    const hasTypeScript = fileExtensions.includes('.ts') || fileExtensions.includes('.tsx');
    const hasJavaScript = fileExtensions.includes('.js') || fileExtensions.includes('.jsx');
    
    return {
      language: hasTypeScript ? 'TypeScript' : hasJavaScript ? 'JavaScript' : 'Unknown',
      style: 'Prettier + ESLint',
      linting: ['@typescript-eslint/recommended', 'react-hooks/recommended'],
      testing: 'Vitest + React Testing Library',
      patterns: [
        'Repository Pattern for data access',
        'Service Layer for business logic',
        'Custom hooks for shared logic',
        'Context API for state management',
        'Error boundaries for error handling'
      ]
    };
  }

  /**
   * Generate file summary
   */
  private generateFileSummary(fileData: any): string {
    const ext = path.extname(fileData.path);
    const name = path.basename(fileData.path, ext);
    
    // Provide contextual summaries based on file type
    if (ext === '.tsx' || ext === '.jsx') {
      return `React component`;
    } else if (ext === '.ts' || ext === '.js') {
      if (name.includes('service')) return 'Service layer';
      if (name.includes('util')) return 'Utility functions';
      if (name.includes('hook')) return 'React hook';
      if (name.includes('handler')) return 'Event handler';
      return 'JavaScript/TypeScript module';
    } else if (ext === '.css' || ext === '.scss') {
      return 'Styles';
    } else if (ext === '.json') {
      if (name === 'package') return 'Package configuration';
      return 'JSON data';
    } else if (ext === '.md') {
      return 'Documentation';
    }
    
    return 'Modified';
  }

  /**
   * Generate recent changes section
   */
  private generateRecentChanges(context: ProjectContext): string {
    const changes: string[] = [];
    
    // Analyze recent executions for patterns
    const recentCommands = context.recentExecutions.map(e => e.command);
    if (recentCommands.some(cmd => cmd.includes('test'))) {
      changes.push('- Added or modified tests');
    }
    if (recentCommands.some(cmd => cmd.includes('spec'))) {
      changes.push('- Generated specifications');
    }
    if (recentCommands.some(cmd => cmd.includes('refactor'))) {
      changes.push('- Code refactoring');
    }
    
    // Analyze file changes
    const recentPaths = context.recentFiles.map(f => f.path);
    if (recentPaths.some(p => p.includes('component'))) {
      changes.push('- Updated React components');
    }
    if (recentPaths.some(p => p.includes('api') || p.includes('service'))) {
      changes.push('- Modified API/service layer');
    }
    if (recentPaths.some(p => p.includes('test'))) {
      changes.push('- Updated test suite');
    }
    
    return changes.length > 0 ? changes.join('\n') : '- No recent significant changes';
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Save CLAUDE.md to project directory
   */
  private async saveClaudeMd(projectId: string, content: string): Promise<string> {
    const projectDir = path.join(process.cwd(), 'temp', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    const filePath = path.join(projectDir, 'CLAUDE.md');
    await fs.writeFile(filePath, content, 'utf-8');
    
    return filePath;
  }

  /**
   * Update CLAUDE.md when project changes
   */
  async updateClaudeMd(projectId: string, userId: string, changeType: string): Promise<void> {
    try {
      // Invalidate cache to force regeneration
      this.projectCache.delete(projectId);
      
      // Regenerate with latest context
      await this.generateClaudeMd(projectId, userId);
      
      logger.info('CLAUDE.md updated', { projectId, changeType });
    } catch (error) {
      logger.error('Failed to update CLAUDE.md', { error, projectId, changeType });
    }
  }
}

export const claudeMdGenerator = new ClaudeMdGenerator();