import { test, expect, devices } from '@playwright/test';
import { ProjectPage } from '../pages/ProjectPage';
import { EditorPage } from '../pages/EditorPage';

// Run these tests only on mobile devices
test.use(devices['iPhone 12']);

test.describe('Mobile Experience', () => {
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
  });

  test('should show mobile layout', async ({ page }) => {
    await page.goto('/projects');
    
    // Mobile menu should be visible
    const mobileMenu = page.getByTestId('mobile-menu');
    await expect(mobileMenu).toBeVisible();
    
    // Desktop sidebar should be hidden
    const desktopSidebar = page.getByTestId('desktop-sidebar');
    await expect(desktopSidebar).not.toBeVisible();
  });

  test('should navigate with swipe gestures', async ({ page }) => {
    const projectPage = new ProjectPage(page);
    const projectName = `Mobile Test ${Date.now()}`;
    
    await projectPage.goto();
    await projectPage.createProject(projectName);
    await projectPage.openProject(projectName);
    
    // Should show files tab by default
    await expect(page.getByTestId('files-tab')).toHaveClass(/active/);
    
    // Swipe left to go to editor tab
    await page.locator('[data-testid="swipeable-content"]').swipe({
      direction: 'left',
      distance: 100,
    });
    
    await page.waitForTimeout(500);
    await expect(page.getByTestId('editor-tab')).toHaveClass(/active/);
    
    // Swipe left again to go to execution tab
    await page.locator('[data-testid="swipeable-content"]').swipe({
      direction: 'left',
      distance: 100,
    });
    
    await page.waitForTimeout(500);
    await expect(page.getByTestId('execution-tab')).toHaveClass(/active/);
    
    // Swipe right to go back
    await page.locator('[data-testid="swipeable-content"]').swipe({
      direction: 'right',
      distance: 100,
    });
    
    await page.waitForTimeout(500);
    await expect(page.getByTestId('editor-tab')).toHaveClass(/active/);
  });

  test('should support pull-to-refresh', async ({ page }) => {
    const projectPage = new ProjectPage(page);
    await projectPage.goto();
    
    // Perform pull-to-refresh gesture
    await page.locator('[data-testid="pull-to-refresh"]').swipe({
      direction: 'down',
      distance: 150,
    });
    
    // Should show refresh indicator
    await expect(page.getByTestId('refresh-indicator')).toBeVisible();
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('refresh-indicator')).not.toBeVisible();
  });

  test('should show mobile toolbar in editor', async ({ page }) => {
    const projectPage = new ProjectPage(page);
    const editorPage = new EditorPage(page);
    const projectName = `Mobile Editor ${Date.now()}`;
    
    await projectPage.goto();
    await projectPage.createProject(projectName);
    await projectPage.openProject(projectName);
    
    // Create and open a file
    await editorPage.createFile('test.js', 'console.log("mobile");');
    
    // Mobile toolbar should be visible
    const mobileToolbar = page.getByTestId('mobile-toolbar');
    await expect(mobileToolbar).toBeVisible();
    
    // Should have save and close buttons
    await expect(mobileToolbar.getByTestId('save-button')).toBeVisible();
    await expect(mobileToolbar.getByTestId('close-button')).toBeVisible();
  });

  test('should handle touch interactions', async ({ page }) => {
    const projectPage = new ProjectPage(page);
    await projectPage.goto();
    
    const projectName = `Touch Test ${Date.now()}`;
    await projectPage.createProject(projectName);
    
    // Long press to show context menu
    const projectCard = page.locator(`[data-testid^="project-card-"]`).filter({ hasText: projectName });
    await projectCard.tap({ modifiers: ['Alt'] }); // Simulate long press
    
    // Context menu should appear
    const contextMenu = page.getByTestId('context-menu');
    await expect(contextMenu).toBeVisible();
    
    // Should have mobile-specific options
    await expect(contextMenu.getByText('Share')).toBeVisible();
    await expect(contextMenu.getByText('Delete')).toBeVisible();
  });

  test('should optimize performance on mobile', async ({ page }) => {
    await page.goto('/projects');
    
    // Check if lazy loading is enabled
    const images = page.locator('img');
    const lazyImages = await images.evaluateAll((imgs) => 
      imgs.filter(img => img.loading === 'lazy').length
    );
    
    expect(lazyImages).toBeGreaterThan(0);
    
    // Check if infinite scroll is working
    const projectList = page.getByTestId('project-list');
    await projectList.scrollIntoViewIfNeeded();
    
    // Scroll to bottom
    await projectList.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    
    // Should load more items or show load more button
    const loadMore = page.getByTestId('load-more');
    if (await loadMore.isVisible()) {
      await loadMore.tap();
      await page.waitForTimeout(500);
    }
  });

  test('should handle offline mode', async ({ page, context }) => {
    await page.goto('/projects');
    
    // Go offline
    await context.setOffline(true);
    
    // Should show offline indicator
    await expect(page.getByTestId('offline-indicator')).toBeVisible();
    
    // Cached content should still be accessible
    const cachedProjects = page.getByTestId('cached-projects');
    await expect(cachedProjects).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Offline indicator should disappear
    await expect(page.getByTestId('offline-indicator')).not.toBeVisible();
  });

  test('should adapt UI for small screens', async ({ page }) => {
    await page.goto('/projects');
    
    // Check responsive breakpoints
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768); // Mobile breakpoint
    
    // Text should be readable
    const fontSize = await page.locator('body').evaluate((el) => 
      window.getComputedStyle(el).fontSize
    );
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);
    
    // Buttons should be touch-friendly
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    const box = await firstButton.boundingBox();
    
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44); // iOS HIG minimum
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle orientation changes', async ({ page, context }) => {
    await page.goto('/projects');
    
    // Portrait orientation
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    
    // Should show mobile layout
    await expect(page.getByTestId('mobile-layout')).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);
    
    // Should adapt layout for landscape
    const landscape = page.getByTestId('landscape-layout');
    if (await landscape.isVisible()) {
      // Landscape-specific layout adjustments
      await expect(landscape).toBeVisible();
    }
  });

  test('should support mobile-specific features', async ({ page }) => {
    await page.goto('/projects');
    
    // Share functionality
    const shareButton = page.getByTestId('share-button');
    if (await shareButton.isVisible()) {
      await shareButton.tap();
      
      // Should trigger Web Share API or show share modal
      const shareModal = page.getByTestId('share-modal');
      await expect(shareModal).toBeVisible();
    }
    
    // Install PWA prompt
    const installButton = page.getByTestId('install-pwa');
    if (await installButton.isVisible()) {
      await installButton.tap();
      // PWA install prompt would appear
    }
    
    // Dark mode toggle
    const darkModeToggle = page.getByTestId('dark-mode-toggle');
    await darkModeToggle.tap();
    
    // Should toggle dark mode
    const isDarkMode = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    );
    expect(isDarkMode).toBeTruthy();
  });
});