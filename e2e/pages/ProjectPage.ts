import { Page, Locator } from '@playwright/test';

export class ProjectPage {
  readonly page: Page;
  readonly newProjectButton: Locator;
  readonly projectNameInput: Locator;
  readonly projectDescriptionInput: Locator;
  readonly createButton: Locator;
  readonly projectCards: Locator;
  readonly searchInput: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newProjectButton = page.getByTestId('new-project');
    this.projectNameInput = page.getByTestId('project-name');
    this.projectDescriptionInput = page.getByTestId('project-description');
    this.createButton = page.getByTestId('create-project');
    this.projectCards = page.locator('[data-testid^="project-card-"]');
    this.searchInput = page.getByPlaceholder('Search projects...');
    this.deleteButton = page.getByTestId('delete-project');
    this.confirmDeleteButton = page.getByTestId('confirm-delete');
  }

  async goto() {
    await this.page.goto('/projects');
  }

  async createProject(name: string, description?: string) {
    await this.newProjectButton.click();
    await this.projectNameInput.fill(name);
    if (description) {
      await this.projectDescriptionInput.fill(description);
    }
    await this.createButton.click();
    // Wait for modal to close
    await this.page.waitForTimeout(500);
  }

  async openProject(projectName: string) {
    const projectCard = this.page.locator(`[data-testid^="project-card-"]`).filter({ hasText: projectName });
    await projectCard.click();
    await this.page.waitForURL(/\/projects\/.+/);
  }

  async deleteProject(projectName: string) {
    const projectCard = this.page.locator(`[data-testid^="project-card-"]`).filter({ hasText: projectName });
    const deleteBtn = projectCard.locator('[data-testid="delete-project"]');
    await deleteBtn.click();
    await this.confirmDeleteButton.click();
    // Wait for deletion
    await this.page.waitForTimeout(500);
  }

  async searchProjects(query: string) {
    await this.searchInput.fill(query);
    // Wait for search debounce
    await this.page.waitForTimeout(300);
  }

  async getProjectCount(): Promise<number> {
    return await this.projectCards.count();
  }

  async projectExists(projectName: string): Promise<boolean> {
    const projectCard = this.page.locator(`[data-testid^="project-card-"]`).filter({ hasText: projectName });
    return await projectCard.isVisible();
  }
}