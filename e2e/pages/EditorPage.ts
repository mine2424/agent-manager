import { Page, Locator } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly newFileButton: Locator;
  readonly fileNameInput: Locator;
  readonly createFileButton: Locator;
  readonly fileList: Locator;
  readonly editor: Locator;
  readonly saveButton: Locator;
  readonly executeButton: Locator;
  readonly commandInput: Locator;
  readonly outputPanel: Locator;
  readonly claudeMdTab: Locator;
  readonly generateClaudeMdButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newFileButton = page.getByTestId('new-file');
    this.fileNameInput = page.getByTestId('file-name');
    this.createFileButton = page.getByTestId('create-file');
    this.fileList = page.locator('[data-testid="file-list"]');
    this.editor = page.locator('.monaco-editor');
    this.saveButton = page.getByTestId('save-file');
    this.executeButton = page.getByTestId('execute-command');
    this.commandInput = page.getByTestId('command-input');
    this.outputPanel = page.getByTestId('output-panel');
    this.claudeMdTab = page.getByTestId('claude-tab');
    this.generateClaudeMdButton = page.getByTestId('generate-claude-md');
  }

  async createFile(fileName: string, content?: string) {
    await this.newFileButton.click();
    await this.fileNameInput.fill(fileName);
    await this.createFileButton.click();
    
    if (content) {
      await this.page.waitForTimeout(500); // Wait for editor to load
      await this.typeInEditor(content);
      await this.saveFile();
    }
  }

  async openFile(fileName: string) {
    const fileItem = this.fileList.locator(`[data-testid="file-${fileName}"]`);
    await fileItem.click();
    await this.page.waitForTimeout(500); // Wait for file to load
  }

  async typeInEditor(content: string) {
    await this.editor.click();
    // Clear existing content
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Delete');
    // Type new content
    await this.page.keyboard.type(content);
  }

  async saveFile() {
    // Use keyboard shortcut
    await this.page.keyboard.press('Control+s');
    // Or click save button if visible
    if (await this.saveButton.isVisible()) {
      await this.saveButton.click();
    }
    await this.page.waitForTimeout(500); // Wait for save
  }

  async executeCommand(command: string) {
    await this.commandInput.fill(command);
    await this.executeButton.click();
    // Wait for execution to start
    await this.page.waitForSelector('[data-testid="execution-running"]', { timeout: 5000 });
  }

  async waitForExecutionComplete(timeout: number = 30000) {
    await this.page.waitForSelector('[data-testid="execution-complete"]', { timeout });
  }

  async getOutput(): Promise<string> {
    return await this.outputPanel.textContent() || '';
  }

  async generateClaudeMd() {
    await this.claudeMdTab.click();
    await this.generateClaudeMdButton.click();
    // Wait for generation
    await this.page.waitForSelector('[data-testid="claude-md-content"]', { timeout: 10000 });
  }

  async getEditorContent(): Promise<string> {
    // Get content from Monaco editor
    const content = await this.page.evaluate(() => {
      const editor = (window as any).monaco?.editor?.getModels()[0];
      return editor?.getValue() || '';
    });
    return content;
  }

  async fileExists(fileName: string): Promise<boolean> {
    const fileItem = this.fileList.locator(`[data-testid="file-${fileName}"]`);
    return await fileItem.isVisible();
  }
}