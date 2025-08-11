import { test, expect, Page } from '@playwright/test'

// Helper to mock authentication
async function mockAuth(page: Page) {
  await page.route('**/api/auth/**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
        },
      }),
    })
  })
}

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockAuth(page)
    
    // Mock Firestore responses
    await page.route('**/firestore/**', (route) => {
      if (route.request().url().includes('projects')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            documents: [
              {
                name: 'projects/project1',
                fields: {
                  name: { stringValue: 'Test Project 1' },
                  description: { stringValue: 'Description 1' },
                  userId: { stringValue: 'test-user-123' },
                  createdAt: { timestampValue: new Date().toISOString() },
                  updatedAt: { timestampValue: new Date().toISOString() },
                },
              },
              {
                name: 'projects/project2',
                fields: {
                  name: { stringValue: 'Test Project 2' },
                  description: { stringValue: 'Description 2' },
                  userId: { stringValue: 'test-user-123' },
                  createdAt: { timestampValue: new Date().toISOString() },
                  updatedAt: { timestampValue: new Date().toISOString() },
                },
              },
            ],
          }),
        })
      }
    })
  })

  test('should display project list', async ({ page }) => {
    await page.goto('/projects')
    
    // Should show project cards
    await expect(page.getByText('Test Project 1')).toBeVisible()
    await expect(page.getByText('Test Project 2')).toBeVisible()
    await expect(page.getByText('Description 1')).toBeVisible()
    await expect(page.getByText('Description 2')).toBeVisible()
  })

  test('should show empty state when no projects', async ({ page }) => {
    // Override mock to return empty projects
    await page.route('**/firestore/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ documents: [] }),
      })
    })
    
    await page.goto('/projects')
    
    // Should show empty state
    await expect(page.getByText('プロジェクトがありません')).toBeVisible()
    await expect(page.getByText('最初のプロジェクトを作成しましょう')).toBeVisible()
    await expect(page.getByRole('button', { name: 'プロジェクトを作成' })).toBeVisible()
  })

  test('should open create project modal', async ({ page }) => {
    await page.goto('/projects')
    
    // Click create button
    await page.getByRole('button', { name: '新規プロジェクト' }).click()
    
    // Modal should be visible
    await expect(page.getByText('新しいプロジェクトを作成')).toBeVisible()
    await expect(page.getByLabel('プロジェクト名')).toBeVisible()
    await expect(page.getByLabel('説明')).toBeVisible()
  })

  test('should validate project name', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: '新規プロジェクト' }).click()
    
    // Type invalid project name
    const nameInput = page.getByLabel('プロジェクト名')
    await nameInput.fill('Invalid@Project#Name')
    await nameInput.blur()
    
    // Should show validation error
    await expect(page.getByText('プロジェクト名は英数字、日本語、ハイフン、アンダースコアのみ使用できます')).toBeVisible()
    
    // Create button should be disabled
    const createButton = page.getByRole('button', { name: '作成' })
    await expect(createButton).toBeDisabled()
  })

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: '新規プロジェクト' }).click()
    
    // Fill form
    await page.getByLabel('プロジェクト名').fill('My New Project')
    await page.getByLabel('説明').fill('This is a test project')
    
    // Mock create response
    await page.route('**/firestore/**/projects', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'projects/new-project-id',
            fields: {
              name: { stringValue: 'My New Project' },
              description: { stringValue: 'This is a test project' },
            },
          }),
        })
      }
    })
    
    // Click create
    await page.getByRole('button', { name: '作成' }).click()
    
    // Should close modal and show success message
    await expect(page.getByText('新しいプロジェクトを作成')).not.toBeVisible()
    await expect(page.getByText('プロジェクトを作成しました')).toBeVisible()
  })

  test('should navigate to project detail page', async ({ page }) => {
    await page.goto('/projects')
    
    // Click on project card
    await page.getByText('Test Project 1').click()
    
    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/projects\/project1/)
  })

  test('should handle project deletion', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock delete response
    await page.route('**/firestore/**/projects/**', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200 })
      }
    })
    
    // Click delete button (assuming it exists in the UI)
    const projectCard = page.locator('text=Test Project 1').locator('..')
    await projectCard.getByRole('button', { name: /削除/ }).click()
    
    // Confirm deletion in dialog
    await page.getByRole('button', { name: '削除する' }).click()
    
    // Should show success message
    await expect(page.getByText('プロジェクトを削除しました')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/projects')
    
    // Check mobile layout
    await expect(page.getByText('Test Project 1')).toBeVisible()
    
    // Create button should be visible
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible()
  })

  test('should handle loading state', async ({ page }) => {
    // Delay the response to see loading state
    await page.route('**/firestore/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        body: JSON.stringify({ documents: [] }),
      })
    })
    
    await page.goto('/projects')
    
    // Should show loading spinner
    await expect(page.getByRole('progressbar')).toBeVisible()
    
    // Wait for loading to complete
    await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 2000 })
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/firestore/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })
    
    await page.goto('/projects')
    
    // Should show error message
    await expect(page.getByText('プロジェクトの取得に失敗しました')).toBeVisible()
  })
})