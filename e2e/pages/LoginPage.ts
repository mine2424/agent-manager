import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly githubLoginButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.githubLoginButton = page.getByTestId('github-login');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: /log in/i });
    this.errorMessage = page.getByTestId('error-message');
    this.loadingSpinner = page.getByTestId('loading-spinner');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async loginWithGitHub() {
    await this.githubLoginButton.click();
    // Handle GitHub OAuth flow in tests
  }

  async loginWithCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async waitForLogin() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }
}