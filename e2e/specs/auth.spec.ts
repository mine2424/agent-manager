import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Agent Manager/);
    await expect(loginPage.githubLoginButton).toBeVisible();
  });

  test('should show GitHub login button', async () => {
    await expect(loginPage.githubLoginButton).toBeVisible();
    await expect(loginPage.githubLoginButton).toHaveText(/GitHub/);
  });

  test('should redirect to dashboard after login', async ({ page, context }) => {
    // Mock authentication for testing
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Set localStorage for auth persistence
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      }));
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should protect routes when not authenticated', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/login');
  });

  test('should handle login errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await loginPage.loginWithCredentials('test@example.com', 'wrongpassword');
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');
  });

  test('should show loading state during authentication', async ({ page }) => {
    // Add delay to API response
    await page.route('**/api/auth/login', async (route) => {
      await page.waitForTimeout(1000);
      route.continue();
    });

    const loginPromise = loginPage.loginWithCredentials('test@example.com', 'password');
    
    // Check loading state appears
    await expect(loginPage.loadingSpinner).toBeVisible();
    
    await loginPromise;
  });

  test('should persist authentication across page refreshes', async ({ page, context }) => {
    // Set up authenticated state
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

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Refresh page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should logout successfully', async ({ page, context }) => {
    // Set up authenticated state
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    
    // Find and click logout button
    const logoutButton = page.getByTestId('logout-button');
    await logoutButton.click();
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Auth data should be cleared
    const authUser = await page.evaluate(() => localStorage.getItem('auth-user'));
    expect(authUser).toBeNull();
  });
});