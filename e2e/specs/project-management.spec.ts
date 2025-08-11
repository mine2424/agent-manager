import { test, expect } from '@playwright/test';
import { ProjectPage } from '../pages/ProjectPage';
import { EditorPage } from '../pages/EditorPage';

test.describe('Project Management', () => {
  let projectPage: ProjectPage;
  let editorPage: EditorPage;

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
  });

  test('should create a new project', async ({ page }) => {
    await projectPage.goto();
    
    const projectName = `Test Project ${Date.now()}`;
    await projectPage.createProject(projectName, 'This is a test project');
    
    // Verify project appears in list
    await expect(await projectPage.projectExists(projectName)).toBeTruthy();
  });

  test('should open project details', async ({ page }) => {
    await projectPage.goto();
    
    // Create and open project
    const projectName = `Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await projectPage.openProject(projectName);
    
    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.locator('h1')).toContainText(projectName);
  });

  test('should delete a project', async ({ page }) => {
    await projectPage.goto();
    
    // Create project
    const projectName = `Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    
    // Delete project
    await projectPage.deleteProject(projectName);
    
    // Verify project is removed
    await expect(await projectPage.projectExists(projectName)).toBeFalsy();
  });

  test('should search projects', async ({ page }) => {
    await projectPage.goto();
    
    // Create multiple projects
    const project1 = `Alpha Project ${Date.now()}`;
    const project2 = `Beta Project ${Date.now()}`;
    const project3 = `Gamma Project ${Date.now()}`;
    
    await projectPage.createProject(project1);
    await projectPage.createProject(project2);
    await projectPage.createProject(project3);
    
    // Search for "Beta"
    await projectPage.searchProjects('Beta');
    
    // Only Beta project should be visible
    await expect(await projectPage.projectExists(project2)).toBeTruthy();
    await expect(await projectPage.projectExists(project1)).toBeFalsy();
    await expect(await projectPage.projectExists(project3)).toBeFalsy();
  });

  test('should handle empty project list', async ({ page }) => {
    await projectPage.goto();
    
    const emptyState = page.getByTestId('empty-state');
    
    // If no projects, should show empty state
    const projectCount = await projectPage.getProjectCount();
    if (projectCount === 0) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/no projects/i);
    }
  });

  test('should validate project name', async ({ page }) => {
    await projectPage.goto();
    await projectPage.newProjectButton.click();
    
    // Try to create with empty name
    await projectPage.createButton.click();
    
    // Should show validation error
    const errorMessage = page.getByTestId('validation-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/name is required/i);
  });

  test('should prevent duplicate project names', async ({ page }) => {
    await projectPage.goto();
    
    const projectName = `Unique Project ${Date.now()}`;
    
    // Create first project
    await projectPage.createProject(projectName);
    
    // Try to create duplicate
    await projectPage.newProjectButton.click();
    await projectPage.projectNameInput.fill(projectName);
    await projectPage.createButton.click();
    
    // Should show error
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/already exists/i);
  });

  test('should handle long project names', async ({ page }) => {
    await projectPage.goto();
    
    const longName = 'A'.repeat(256); // Very long name
    await projectPage.newProjectButton.click();
    await projectPage.projectNameInput.fill(longName);
    
    // Should truncate or show error
    const actualValue = await projectPage.projectNameInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(100); // Max length
  });

  test('should show project metadata', async ({ page }) => {
    await projectPage.goto();
    
    const projectName = `Metadata Project ${Date.now()}`;
    const description = 'Project with metadata';
    
    await projectPage.createProject(projectName, description);
    await projectPage.openProject(projectName);
    
    // Should display metadata
    await expect(page.locator('[data-testid="project-description"]')).toContainText(description);
    await expect(page.locator('[data-testid="created-at"]')).toBeVisible();
    await expect(page.locator('[data-testid="updated-at"]')).toBeVisible();
  });
});