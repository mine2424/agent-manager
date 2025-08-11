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

// Helper to mock project and files
async function mockProjectData(page: Page) {
  // Mock project
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

  // Mock files
  await page.route('**/firestore/**/files', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        documents: [
          {
            name: 'files/file1',
            fields: {
              projectId: { stringValue: 'test-project' },
              path: { stringValue: 'test.py' },
              content: { stringValue: 'print("Hello from Python!")' },
              createdAt: { timestampValue: new Date().toISOString() },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          },
          {
            name: 'files/file2',
            fields: {
              projectId: { stringValue: 'test-project' },
              path: { stringValue: 'script.sh' },
              content: { stringValue: 'echo "Hello from Shell!"' },
              createdAt: { timestampValue: new Date().toISOString() },
              updatedAt: { timestampValue: new Date().toISOString() },
            },
          },
        ],
      }),
    })
  })
}

// Helper to mock WebSocket connection
async function mockWebSocket(page: Page) {
  await page.route('**/socket.io/**', (route) => {
    route.fulfill({
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    })
  })
}

test.describe('Code Execution', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectData(page)
    await mockWebSocket(page)
    
    // Mock execution history
    await page.route('**/firestore/**/executions', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          documents: [
            {
              name: 'executions/exec1',
              fields: {
                projectId: { stringValue: 'test-project' },
                command: { stringValue: 'python test.py' },
                status: { stringValue: 'completed' },
                output: { stringValue: 'Hello from Python!\n' },
                error: { stringValue: '' },
                startedAt: { timestampValue: new Date().toISOString() },
                completedAt: { timestampValue: new Date().toISOString() },
              },
            },
          ],
        }),
      })
    })
  })

  test('should display execution panel', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Should show execution panel
    await expect(page.getByText('実行')).toBeVisible()
    await expect(page.getByPlaceholder('コマンドを入力')).toBeVisible()
    await expect(page.getByRole('button', { name: '実行' })).toBeVisible()
  })

  test('should execute simple command', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock Socket.IO events
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          setTimeout(() => {
            window.postMessage({
              type: 'execution-output',
              data: { output: 'Command executed successfully\n' },
            }, '*')
            window.postMessage({
              type: 'execution-complete',
              data: { code: 0 },
            }, '*')
          }, 100)
        }
      })
    })
    
    // Enter command
    await page.getByPlaceholder('コマンドを入力').fill('echo "Hello World"')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show output
    await expect(page.getByText('Command executed successfully')).toBeVisible()
  })

  test('should validate dangerous commands', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    const dangerousCommands = [
      'rm -rf /',
      'sudo rm -rf /*',
      'chmod 777 /etc/passwd',
      'dd if=/dev/zero of=/dev/sda',
    ]
    
    for (const command of dangerousCommands) {
      await page.getByPlaceholder('コマンドを入力').fill(command)
      await page.getByRole('button', { name: '実行' }).click()
      
      // Should show validation error
      await expect(page.getByText(/危険なコマンド/)).toBeVisible()
      
      // Clear for next test
      await page.getByPlaceholder('コマンドを入力').clear()
    }
  })

  test('should handle long-running commands', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock long-running command
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          // Send periodic output
          let count = 0
          const interval = setInterval(() => {
            window.postMessage({
              type: 'execution-output',
              data: { output: `Progress: ${++count}/5\n` },
            }, '*')
            
            if (count >= 5) {
              clearInterval(interval)
              window.postMessage({
                type: 'execution-complete',
                data: { code: 0 },
              }, '*')
            }
          }, 500)
        }
      })
    })
    
    await page.getByPlaceholder('コマンドを入力').fill('python long_script.py')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show running state
    await expect(page.getByText('実行中...')).toBeVisible()
    
    // Should show incremental output
    await expect(page.getByText('Progress: 1/5')).toBeVisible()
    await expect(page.getByText('Progress: 3/5')).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('Progress: 5/5')).toBeVisible({ timeout: 3000 })
  })

  test('should handle command errors', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock error response
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          setTimeout(() => {
            window.postMessage({
              type: 'execution-error',
              data: { error: 'Command not found: invalid_command' },
            }, '*')
            window.postMessage({
              type: 'execution-complete',
              data: { code: 127 },
            }, '*')
          }, 100)
        }
      })
    })
    
    await page.getByPlaceholder('コマンドを入力').fill('invalid_command')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show error output
    await expect(page.getByText('Command not found: invalid_command')).toBeVisible()
    await expect(page.getByText('Exit code: 127')).toBeVisible()
  })

  test('should allow command cancellation', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock cancellable command
    await page.evaluate(() => {
      let cancelled = false
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          const interval = setInterval(() => {
            if (!cancelled) {
              window.postMessage({
                type: 'execution-output',
                data: { output: 'Still running...\n' },
              }, '*')
            } else {
              clearInterval(interval)
              window.postMessage({
                type: 'execution-cancelled',
                data: {},
              }, '*')
            }
          }, 500)
        } else if (event.data.type === 'cancel-execution') {
          cancelled = true
        }
      })
    })
    
    await page.getByPlaceholder('コマンドを入力').fill('sleep 60')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show cancel button
    await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible()
    
    // Cancel execution
    await page.getByRole('button', { name: 'キャンセル' }).click()
    
    // Should show cancellation message
    await expect(page.getByText('実行をキャンセルしました')).toBeVisible()
  })

  test('should display execution history', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Should show history
    await expect(page.getByText('実行履歴')).toBeVisible()
    await expect(page.getByText('python test.py')).toBeVisible()
    await expect(page.getByText('Hello from Python!')).toBeVisible()
  })

  test('should rerun commands from history', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Click rerun button in history
    const historyItem = page.locator('text=python test.py').locator('..')
    await historyItem.getByRole('button', { name: /再実行/ }).click()
    
    // Should populate command input
    await expect(page.getByPlaceholder('コマンドを入力')).toHaveValue('python test.py')
  })

  test('should support command shortcuts', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Type command and press Enter
    await page.getByPlaceholder('コマンドを入力').fill('ls -la')
    await page.getByPlaceholder('コマンドを入力').press('Enter')
    
    // Should execute command
    await expect(page.getByText('実行中...')).toBeVisible()
  })

  test('should handle environment variables', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock execution with env vars
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          window.postMessage({
            type: 'execution-output',
            data: { output: 'NODE_ENV=development\n' },
          }, '*')
          window.postMessage({
            type: 'execution-complete',
            data: { code: 0 },
          }, '*')
        }
      })
    })
    
    // Set environment variable
    await page.getByRole('button', { name: '環境変数' }).click()
    await page.getByPlaceholder('変数名').fill('NODE_ENV')
    await page.getByPlaceholder('値').fill('development')
    await page.getByRole('button', { name: '追加' }).click()
    
    // Execute command
    await page.getByPlaceholder('コマンドを入力').fill('echo $NODE_ENV')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show env var value
    await expect(page.getByText('NODE_ENV=development')).toBeVisible()
  })

  test('should handle working directory', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Change working directory
    await page.getByRole('button', { name: '作業ディレクトリ' }).click()
    await page.getByPlaceholder('ディレクトリパス').fill('/tmp')
    await page.getByRole('button', { name: '設定' }).click()
    
    // Should show updated working directory
    await expect(page.getByText('作業ディレクトリ: /tmp')).toBeVisible()
  })

  test('should clear output', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Execute a command first
    await page.evaluate(() => {
      window.postMessage({
        type: 'execution-output',
        data: { output: 'Some output\n' },
      }, '*')
    })
    
    await expect(page.getByText('Some output')).toBeVisible()
    
    // Clear output
    await page.getByRole('button', { name: 'クリア' }).click()
    
    // Output should be cleared
    await expect(page.getByText('Some output')).not.toBeVisible()
  })

  test('should handle ANSI colors in output', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Mock colored output
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'execute') {
          window.postMessage({
            type: 'execution-output',
            data: { output: '\x1b[32mSuccess!\x1b[0m\n' },
          }, '*')
          window.postMessage({
            type: 'execution-complete',
            data: { code: 0 },
          }, '*')
        }
      })
    })
    
    await page.getByPlaceholder('コマンドを入力').fill('npm test')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should render colored text
    const successText = page.getByText('Success!')
    await expect(successText).toBeVisible()
    await expect(successText).toHaveCSS('color', 'rgb(0, 128, 0)')
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/projects/test-project')
    
    // Execution panel should be accessible
    await expect(page.getByPlaceholder('コマンドを入力')).toBeVisible()
    await expect(page.getByRole('button', { name: '実行' })).toBeVisible()
    
    // Should be able to execute commands
    await page.getByPlaceholder('コマンドを入力').fill('echo "Mobile test"')
    await page.getByRole('button', { name: '実行' }).click()
  })

  test('should handle offline state', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Simulate offline
    await page.context().setOffline(true)
    
    // Try to execute command
    await page.getByPlaceholder('コマンドを入力').fill('echo "test"')
    await page.getByRole('button', { name: '実行' }).click()
    
    // Should show offline error
    await expect(page.getByText('オフラインです')).toBeVisible()
    
    // Restore online state
    await page.context().setOffline(false)
  })

  test('should support command templates', async ({ page }) => {
    await page.goto('/projects/test-project')
    
    // Open command templates
    await page.getByRole('button', { name: 'テンプレート' }).click()
    
    // Select a template
    await page.getByText('Python実行').click()
    
    // Should populate command with template
    await expect(page.getByPlaceholder('コマンドを入力')).toHaveValue('python {file}')
  })
})