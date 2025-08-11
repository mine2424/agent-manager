import { test, expect } from '@playwright/test';
import { ProjectPage } from '../pages/ProjectPage';
import { EditorPage } from '../pages/EditorPage';

test.describe('Claude Execution', () => {
  let projectPage: ProjectPage;
  let editorPage: EditorPage;
  let projectName: string;

  test.beforeEach(async ({ page, context }) => {
    // Set up authentication
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      }));
    });

    projectPage = new ProjectPage(page);
    editorPage = new EditorPage(page);

    // Create a test project
    projectName = `Execution Test ${Date.now()}`;
    await projectPage.goto();
    await projectPage.createProject(projectName);
    await projectPage.openProject(projectName);
  });

  test('should create and edit files', async ({ page }) => {
    // Create a new file
    await editorPage.createFile('test.js', 'console.log("Hello World");');
    
    // Verify file appears in list
    await expect(await editorPage.fileExists('test.js')).toBeTruthy();
    
    // Verify content
    const content = await editorPage.getEditorContent();
    expect(content).toContain('Hello World');
  });

  test('should execute Claude commands', async ({ page }) => {
    // Mock WebSocket connection for testing
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
    });

    await editorPage.createFile('index.js', '// Initial content');
    
    // Execute a Claude command
    await editorPage.executeCommand('Add a function to calculate fibonacci');
    
    // Wait for execution to complete
    await editorPage.waitForExecutionComplete();
    
    // Check output panel
    const output = await editorPage.getOutput();
    expect(output).toBeTruthy();
  });

  test('should show execution progress', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
    });

    const executePromise = editorPage.executeCommand('Create a React component');
    
    // Check for running indicator
    await expect(page.getByTestId('execution-running')).toBeVisible();
    
    await executePromise;
    await editorPage.waitForExecutionComplete();
    
    // Running indicator should be gone
    await expect(page.getByTestId('execution-running')).not.toBeVisible();
  });

  test('should handle execution errors', async ({ page }) => {
    // Mock WebSocket to simulate error
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
      (window as any).mockExecutionError = true;
    });

    await editorPage.executeCommand('Invalid command');
    
    // Should show error in output
    const output = await editorPage.getOutput();
    expect(output).toContain('error');
  });

  test('should stop execution', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
      (window as any).mockLongExecution = true;
    });

    // Start long-running execution
    editorPage.executeCommand('Long running task');
    
    // Wait for execution to start
    await expect(page.getByTestId('execution-running')).toBeVisible();
    
    // Click stop button
    const stopButton = page.getByTestId('stop-execution');
    await stopButton.click();
    
    // Should stop execution
    await expect(page.getByTestId('execution-stopped')).toBeVisible();
  });

  test('should sync files after execution', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
      (window as any).mockFileChanges = ['newfile.js', 'updated.js'];
    });

    await editorPage.executeCommand('Create new files');
    await editorPage.waitForExecutionComplete();
    
    // Check if new files appear in list
    await page.waitForTimeout(1000); // Wait for sync
    await expect(await editorPage.fileExists('newfile.js')).toBeTruthy();
  });

  test('should generate CLAUDE.md', async ({ page }) => {
    // Create some files first
    await editorPage.createFile('app.js', 'const app = express();');
    await editorPage.createFile('README.md', '# Test Project');
    
    // Generate CLAUDE.md
    await editorPage.generateClaudeMd();
    
    // Check if CLAUDE.md content is displayed
    const claudeMdContent = page.getByTestId('claude-md-content');
    await expect(claudeMdContent).toBeVisible();
    await expect(claudeMdContent).toContainText('Project Overview');
    await expect(claudeMdContent).toContainText('Technology Stack');
  });

  test('should handle multiple concurrent executions', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
    });

    // Start first execution
    const exec1 = editorPage.executeCommand('First command');
    
    // Try to start second execution
    await page.waitForTimeout(100);
    await editorPage.commandInput.fill('Second command');
    await editorPage.executeButton.click();
    
    // Should queue or show warning
    const warning = page.getByTestId('execution-warning');
    await expect(warning).toBeVisible();
    
    await exec1;
  });

  test('should preserve output history', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
    });

    // Execute multiple commands
    await editorPage.executeCommand('Command 1');
    await editorPage.waitForExecutionComplete();
    
    await editorPage.executeCommand('Command 2');
    await editorPage.waitForExecutionComplete();
    
    // Output should contain both executions
    const output = await editorPage.getOutput();
    expect(output).toContain('Command 1');
    expect(output).toContain('Command 2');
  });

  test('should handle WebSocket disconnection', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).mockWebSocket = true;
    });

    // Simulate disconnection
    await page.evaluate(() => {
      (window as any).simulateDisconnect = true;
    });

    await editorPage.executeCommand('Test command');
    
    // Should show reconnection message
    const reconnectMessage = page.getByTestId('websocket-reconnecting');
    await expect(reconnectMessage).toBeVisible();
  });
});