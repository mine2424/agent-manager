import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
    
    // Should show login content
    await expect(page.getByRole('heading', { name: 'Agent Manager' })).toBeVisible()
    await expect(page.getByText('Claude Codeをクラウドで管理')).toBeVisible()
    await expect(page.getByRole('button', { name: /GitHubでログイン/ })).toBeVisible()
  })

  test('should show login button with correct styling', async ({ page }) => {
    await page.goto('/login')
    
    const loginButton = page.getByRole('button', { name: /GitHubでログイン/ })
    await expect(loginButton).toBeVisible()
    
    // Check button has GitHub icon
    const githubIcon = loginButton.locator('svg')
    await expect(githubIcon).toBeVisible()
  })

  test('should initiate GitHub OAuth flow when login button is clicked', async ({ page, context }) => {
    await page.goto('/login')
    
    // Listen for popup
    const popupPromise = context.waitForEvent('page')
    
    // Click login button
    await page.getByRole('button', { name: /GitHubでログイン/ }).click()
    
    // Wait for popup to open
    const popup = await popupPromise
    
    // Check that popup navigates to GitHub OAuth
    await expect(popup).toHaveURL(/github\.com/)
    
    // Close popup
    await popup.close()
  })

  test('should show features list on login page', async ({ page }) => {
    await page.goto('/login')
    
    const features = [
      'どこからでもClaude Codeを実行',
      'プロジェクトファイルをクラウドで管理',
      'リアルタイムの実行結果確認',
      'モバイルデバイス対応',
    ]
    
    for (const feature of features) {
      await expect(page.getByText(feature)).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    
    // Check that content is properly displayed on mobile
    await expect(page.getByRole('heading', { name: 'Agent Manager' })).toBeVisible()
    await expect(page.getByRole('button', { name: /GitHubでログイン/ })).toBeVisible()
    
    // Features should still be visible
    await expect(page.getByText('どこからでもClaude Codeを実行')).toBeVisible()
  })

  test('should protect routes for unauthenticated users', async ({ page }) => {
    // Try to access protected routes
    const protectedRoutes = [
      '/projects',
      '/projects/123',
      '/dashboard',
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    }
  })
})