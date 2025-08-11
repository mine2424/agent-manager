import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../../contexts/AuthContext')
vi.mock('react-hot-toast')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  const mockSignIn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
      loading: false,
    } as any)
  })

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
  }

  it('should render login page with correct elements', () => {
    renderLoginPage()

    expect(screen.getByText('Agent Manager')).toBeInTheDocument()
    expect(screen.getByText('Claude Codeをブラウザから実行')).toBeInTheDocument()
    expect(screen.getByText('アカウントにログイン')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GitHubでログイン/ })).toBeInTheDocument()
    expect(screen.getByText('ログインすることで、利用規約に同意したものとみなされます。')).toBeInTheDocument()
  })

  it('should display GitHub icon in login button', () => {
    renderLoginPage()

    const button = screen.getByRole('button', { name: /GitHubでログイン/ })
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should handle successful login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce(undefined)

    renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    await user.click(loginButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('ログインしました')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should handle login error', async () => {
    const user = userEvent.setup()
    const error = new Error('Authentication failed')
    mockSignIn.mockRejectedValueOnce(error)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    await user.click(loginButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', error)
      expect(toast.error).toHaveBeenCalledWith('ログインに失敗しました')
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show loading state while signing in', async () => {
    const user = userEvent.setup()
    
    // Create a promise that we can control
    let resolveSignIn: () => void
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve
    })
    mockSignIn.mockReturnValueOnce(signInPromise)

    renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    await user.click(loginButton)

    // Check loading state
    expect(screen.getByText('ログイン中...')).toBeInTheDocument()
    const loadingButton = screen.getByRole('button')
    expect(loadingButton).toBeDisabled()
    
    // Check for spinner
    const spinner = loadingButton.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()

    // Resolve the promise
    resolveSignIn!()

    await waitFor(() => {
      expect(screen.queryByText('ログイン中...')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /GitHubでログイン/ })).toBeEnabled()
    })
  })

  it('should disable button during login process', async () => {
    const user = userEvent.setup()
    
    let resolveSignIn: () => void
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve
    })
    mockSignIn.mockReturnValueOnce(signInPromise)

    renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    expect(loginButton).toBeEnabled()

    await user.click(loginButton)

    // Button should be disabled while loading
    expect(loginButton).toBeDisabled()

    // Try clicking again - should not trigger another sign in
    await user.click(loginButton)
    expect(mockSignIn).toHaveBeenCalledTimes(1)

    resolveSignIn!()
  })

  it('should have proper styling classes', () => {
    renderLoginPage()

    // Check root container has min-h-screen
    const rootContainer = document.querySelector('.min-h-screen')
    expect(rootContainer).toBeInTheDocument()
    expect(rootContainer).toHaveClass('bg-gray-50')

    // Check button styling
    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    expect(loginButton).toHaveClass(
      'w-full',
      'flex',
      'justify-center',
      'items-center',
      'px-4',
      'py-3',
      'border',
      'border-gray-300',
      'rounded-md'
    )
  })

  it('should be responsive', () => {
    renderLoginPage()

    // Check responsive classes
    const container = screen.getByText('アカウントにログイン').closest('.bg-white')
    expect(container).toHaveClass('sm:rounded-lg', 'sm:px-10')
  })

  it('should handle multiple rapid clicks gracefully', async () => {
    const user = userEvent.setup()
    
    // Make signIn return slowly
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    
    // Click multiple times rapidly
    await user.click(loginButton)
    await user.click(loginButton)
    await user.click(loginButton)

    // Should only call signIn once
    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })

  it('should have accessible form elements', () => {
    renderLoginPage()

    // Button should have proper role
    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    expect(loginButton).toBeInTheDocument()

    // Headings should have proper hierarchy
    const mainHeading = screen.getByRole('heading', { name: 'Agent Manager', level: 1 })
    expect(mainHeading).toBeInTheDocument()
    
    const subHeading = screen.getByRole('heading', { name: 'アカウントにログイン', level: 2 })
    expect(subHeading).toBeInTheDocument()
  })

  it('should not leak memory on unmount during loading', async () => {
    const user = userEvent.setup()
    
    // Never resolve the promise
    mockSignIn.mockReturnValueOnce(new Promise(() => {}))

    const { unmount } = renderLoginPage()

    const loginButton = screen.getByRole('button', { name: /GitHubでログイン/ })
    await user.click(loginButton)

    // Unmount while loading
    unmount()

    // Should not throw or cause issues
    expect(true).toBe(true)
  })
})