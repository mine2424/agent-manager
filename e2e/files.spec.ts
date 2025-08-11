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

// Helper to mock project data
async function mockProject(page: Page) {
  await page.route('**/firestore/**/projects/test-project', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        name: 'projects/test-project',
        fields: {
          name: { stringValue: 'Test Project' },
          description: { stringValue: 'Test Description' },
          userId: { stringValue: 'test-user-123' },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    })
  })
}

test.describe('File Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProject(page)
    
    // Mock Firestore file responses
    await page.route('**/firestore/**/files', (route) => {
      if (route.request().url().includes('projectId')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            documents: [
              {
                name: 'files/file1',
                fields: {
                  projectId: { stringValue: 'test-project' },
                  path: { stringValue: 'src/index.js' },
                  content: { stringValue: 'console.log("Hello World");' },
                  createdAt: { timestampValue: new Date().toISOString() },
                  updatedAt: { timestampValue: new Date().toISOString() },
                },
              },
              {
                name: 'files/file2',
                fields: {
                  projectId: { stringValue: 'test-project' },
                  path: { stringValue: 'src/utils.js' },
                  content: { stringValue: 'export const add = (a, b) => a + b;' },
                  createdAt: { timestampValue: new Date().toISOString() },
                  updatedAt: { timestampValue: new Date().toISOString() },
                },
              },
              {
                name: 'files/file3',
                fields: {
                  projectId: { stringValue: 'test-project' },
                  path: { stringValue: 'README.md' },
                  content: { stringValue: '# Test Project\n\nThis is a test project.' },
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

  test('should display file list', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Should show file list
    await expect(page.getByText('src/index.js')).toBeVisible()
    await expect(page.getByText('src/utils.js')).toBeVisible()
    await expect(page.getByText('README.md')).toBeVisible()
  })

  test('should show file content when selected', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Click on a file
    await page.getByText('src/index.js').click()
    
    // Should show file content in editor
    await expect(page.getByText('console.log("Hello World");')).toBeVisible()
  })

  test('should create a new file', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock create file response
    await page.route('**/firestore/**/files', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'files/new-file',
            fields: {
              projectId: { stringValue: 'test-project' },
              path: { stringValue: 'src/new-file.js' },
              content: { stringValue: '' },
              createdAt: { timestampValue: new Date().toISOString() },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          }),
        })
      }
    })
    
    // Click new file button
    await page.getByRole('button', { name: /新規ファイル/ }).click()
    
    // Enter file path
    await page.getByPlaceholder('ファイルパス').fill('src/new-file.js')
    await page.getByRole('button', { name: '作成' }).click()
    
    // Should show success message
    await expect(page.getByText('ファイルを作成しました')).toBeVisible()
  })

  test('should validate file path', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    await page.getByRole('button', { name: /新規ファイル/ }).click()
    
    // Try invalid file paths
    const invalidPaths = [
      '../../../etc/passwd',
      '/etc/passwd',
      'src/../../../sensitive',
      'file\0name.js',
    ]
    
    for (const path of invalidPaths) {
      await page.getByPlaceholder('ファイルパス').fill(path)
      await page.getByRole('button', { name: '作成' }).click()
      
      // Should show validation error
      await expect(page.getByText(/無効なファイルパス/)).toBeVisible()
      
      // Clear input for next test
      await page.getByPlaceholder('ファイルパス').clear()
    }
  })

  test('should update file content', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Select a file
    await page.getByText('src/index.js').click()
    
    // Mock update response
    await page.route('**/firestore/**/files/file1', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'files/file1',
            fields: {
              content: { stringValue: 'console.log("Updated!");' },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          }),
        })
      }
    })
    
    // Edit content
    const editor = page.locator('[role="textbox"]')
    await editor.clear()
    await editor.fill('console.log("Updated!");')
    
    // Save changes (assuming Ctrl+S or Save button)
    await page.keyboard.press('Control+s')
    
    // Should show success message
    await expect(page.getByText('ファイルを保存しました')).toBeVisible()
  })

  test('should delete a file', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock delete response
    await page.route('**/firestore/**/files/file1', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200 })
      }
    })
    
    // Right-click on file or find delete button
    const fileItem = page.locator('text=src/index.js').locator('..')
    await fileItem.getByRole('button', { name: /削除/ }).click()
    
    // Confirm deletion
    await page.getByRole('button', { name: '削除する' }).click()
    
    // Should show success message
    await expect(page.getByText('ファイルを削除しました')).toBeVisible()
  })

  test('should show empty state when no files', async ({ page }) => {
    // Override mock to return empty files
    await page.route('**/firestore/**/files', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ documents: [] }),
      })
    })
    
    await page.goto('/projects/test-project')
    
    // Should show empty state
    await expect(page.getByText('ファイルがありません')).toBeVisible()
    await expect(page.getByText('最初のファイルを作成しましょう')).toBeVisible()
  })

  test('should filter files by search', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Search for "utils"
    await page.getByPlaceholder('ファイルを検索').fill('utils')
    
    // Should only show matching file
    await expect(page.getByText('src/utils.js')).toBeVisible()
    await expect(page.getByText('src/index.js')).not.toBeVisible()
    await expect(page.getByText('README.md')).not.toBeVisible()
  })

  test('should display file tree structure', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Should show folder structure
    await expect(page.getByText('src')).toBeVisible()
    
    // Expand folder
    await page.getByText('src').click()
    
    // Should show files in folder
    await expect(page.getByText('index.js')).toBeVisible()
    await expect(page.getByText('utils.js')).toBeVisible()
  })

  test('should handle file upload', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock upload response
    await page.route('**/firestore/**/files', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'files/uploaded-file',
            fields: {
              projectId: { stringValue: 'test-project' },
              path: { stringValue: 'uploaded.txt' },
              content: { stringValue: 'Uploaded content' },
              createdAt: { timestampValue: new Date().toISOString() },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          }),
        })
      }
    })
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content'),
    })
    
    // Should show success message
    await expect(page.getByText('ファイルをアップロードしました')).toBeVisible()
  })

  test('should reject large files', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Try to upload large file (>10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
    const fileInput = page.locator('input[type="file"]')
    
    await fileInput.setInputFiles({
      name: 'large.txt',
      mimeType: 'text/plain',
      buffer: largeBuffer,
    })
    
    // Should show error message
    await expect(page.getByText('ファイルサイズが大きすぎます')).toBeVisible()
  })

  test('should handle syntax highlighting', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Select JavaScript file
    await page.getByText('src/index.js').click()
    
    // Check for syntax highlighting classes
    const codeEditor = page.locator('.monaco-editor, .cm-editor')
    await expect(codeEditor).toBeVisible()
    
    // Should have syntax highlighted elements
    await expect(page.locator('.token.keyword, .cm-keyword')).toBeVisible()
  })

  test('should support multiple file selection', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Select multiple files with Ctrl/Cmd
    await page.getByText('src/index.js').click()
    await page.getByText('src/utils.js').click({ modifiers: ['Control'] })
    
    // Should show bulk actions
    await expect(page.getByText('2 ファイル選択中')).toBeVisible()
    await expect(page.getByRole('button', { name: '選択したファイルを削除' })).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/projects/test-project')
    
    // File list should be visible
    await expect(page.getByText('src/index.js')).toBeVisible()
    
    // Editor should adapt to mobile view
    await page.getByText('src/index.js').click()
    await expect(page.getByText('console.log("Hello World");')).toBeVisible()
  })

  test('should handle file errors gracefully', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock error response for file creation
    await page.route('**/firestore/**/files', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      }
    })
    
    // Try to create a file
    await page.getByRole('button', { name: /新規ファイル/ }).click()
    await page.getByPlaceholder('ファイルパス').fill('error.js')
    await page.getByRole('button', { name: '作成' }).click()
    
    // Should show error message
    await expect(page.getByText('ファイルの作成に失敗しました')).toBeVisible()
  })
})