import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../services/firebase'
import React from 'react'

// Mock Firebase auth
vi.mock('firebase/auth')
vi.mock('../../services/firebase', () => ({
  auth: {},
  githubProvider: {},
}))

describe('AuthContext', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    providerData: [{ uid: 'github-username' }],
  }

  let authStateCallback: ((user: any) => void) | null = null
  let unsubscribe: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock onAuthStateChanged
    unsubscribe = vi.fn()
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      authStateCallback = callback as (user: any) => void
      // Simulate initial auth check
      setTimeout(() => (callback as (user: any) => void)(null), 0)
      return unsubscribe
    })
  })

  afterEach(() => {
    authStateCallback = null
  })

  describe('AuthProvider', () => {
    it('should provide auth context to children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    it('should handle auth state changes', async () => {
      const TestComponent = () => {
        const { user, loading } = useAuth()
        return (
          <div>
            <div>Loading: {loading.toString()}</div>
            <div>User: {user ? user.email : 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially loading
      expect(screen.getByText('Loading: true')).toBeInTheDocument()

      // After auth state is determined (no user)
      await waitFor(() => {
        expect(screen.getByText('Loading: false')).toBeInTheDocument()
        expect(screen.getByText('User: No user')).toBeInTheDocument()
      })

      // Simulate user sign in
      act(() => {
        authStateCallback?.(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByText('User: test@example.com')).toBeInTheDocument()
      })
    })

    it('should map Firebase user to app user correctly', async () => {
      const TestComponent = () => {
        const { user } = useAuth()
        return (
          <div>
            {user && (
              <>
                <div>UID: {user.uid}</div>
                <div>Email: {user.email}</div>
                <div>Name: {user.displayName}</div>
                <div>Photo: {user.photoURL}</div>
                <div>GitHub: {user.githubUsername}</div>
              </>
            )}
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Sign in user
      act(() => {
        authStateCallback?.(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByText('UID: test-user-123')).toBeInTheDocument()
        expect(screen.getByText('Email: test@example.com')).toBeInTheDocument()
        expect(screen.getByText('Name: Test User')).toBeInTheDocument()
        expect(screen.getByText('Photo: https://example.com/photo.jpg')).toBeInTheDocument()
        expect(screen.getByText('GitHub: github-username')).toBeInTheDocument()
      })
    })

    it('should handle user without GitHub username', async () => {
      const userWithoutGithub = {
        ...mockUser,
        providerData: [],
      }

      const TestComponent = () => {
        const { user } = useAuth()
        return <div>{user ? `GitHub: ${user.githubUsername || 'None'}` : 'No user'}</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        authStateCallback?.(userWithoutGithub)
      })

      await waitFor(() => {
        expect(screen.getByText('GitHub: None')).toBeInTheDocument()
      })
    })

    it('should unsubscribe on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      )

      expect(onAuthStateChanged).toHaveBeenCalled()

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponent = () => {
        try {
          useAuth()
          return <div>Should not render</div>
        } catch (error) {
          return <div>{(error as Error).message}</div>
        }
      }

      render(<TestComponent />)

      expect(screen.getByText('useAuth must be used within an AuthProvider')).toBeInTheDocument()
    })

    it('should provide signIn function', async () => {
      vi.mocked(signInWithPopup).mockResolvedValueOnce({
        user: mockUser,
      } as any)

      const TestComponent = () => {
        const { signIn } = useAuth()
        return <button onClick={signIn}>Sign In</button>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const button = screen.getByText('Sign In')
      button.click()

      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.any(Object))
      })
    })

    it('should handle signIn errors', async () => {
      const error = new Error('Auth failed')
      vi.mocked(signInWithPopup).mockRejectedValueOnce(error)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        const { signIn } = useAuth()
        const [error, setError] = React.useState<string | null>(null)

        const handleSignIn = async () => {
          try {
            await signIn()
          } catch (err) {
            setError((err as Error).message)
          }
        }

        return (
          <div>
            <button onClick={handleSignIn}>Sign In</button>
            {error && <div>Error: {error}</div>}
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const button = screen.getByText('Sign In')
      button.click()

      await waitFor(() => {
        expect(screen.getByText('Error: Auth failed')).toBeInTheDocument()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing in:', error)
      })

      consoleErrorSpy.mockRestore()
    })

    it('should provide signOut function', async () => {
      vi.mocked(signOut).mockResolvedValueOnce(undefined)

      const TestComponent = () => {
        const { signOut } = useAuth()
        return <button onClick={signOut}>Sign Out</button>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const button = screen.getByText('Sign Out')
      button.click()

      await waitFor(() => {
        expect(signOut).toHaveBeenCalledWith(auth)
      })
    })

    it('should handle signOut errors', async () => {
      const error = new Error('Sign out failed')
      vi.mocked(signOut).mockRejectedValueOnce(error)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        const { signOut } = useAuth()
        const [error, setError] = React.useState<string | null>(null)

        const handleSignOut = async () => {
          try {
            await signOut()
          } catch (err) {
            setError((err as Error).message)
          }
        }

        return (
          <div>
            <button onClick={handleSignOut}>Sign Out</button>
            {error && <div>Error: {error}</div>}
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const button = screen.getByText('Sign Out')
      button.click()

      await waitFor(() => {
        expect(screen.getByText('Error: Sign out failed')).toBeInTheDocument()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', error)
      })

      consoleErrorSpy.mockRestore()
    })

    it('should log successful operations', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      vi.mocked(signInWithPopup).mockResolvedValueOnce({
        user: mockUser,
      } as any)
      vi.mocked(signOut).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      // Test sign in
      await result.current.signIn()
      expect(consoleLogSpy).toHaveBeenCalledWith('Signed in successfully:', 'test@example.com')

      // Test sign out
      await result.current.signOut()
      expect(consoleLogSpy).toHaveBeenCalledWith('Signed out successfully')

      consoleLogSpy.mockRestore()
    })
  })

  describe('Loading states', () => {
    it('should start with loading true', () => {
      const TestComponent = () => {
        const { loading } = useAuth()
        return <div>Loading: {loading.toString()}</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByText('Loading: true')).toBeInTheDocument()
    })

    it('should set loading false after auth check', async () => {
      const TestComponent = () => {
        const { loading } = useAuth()
        return <div>Loading: {loading.toString()}</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading: false')).toBeInTheDocument()
      })
    })

    it('should handle rapid auth state changes', async () => {
      const TestComponent = () => {
        const { user } = useAuth()
        return <div>{user ? user.email : 'No user'}</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Rapid changes
      act(() => {
        authStateCallback?.(mockUser)
        authStateCallback?.(null)
        authStateCallback?.(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })
  })
})