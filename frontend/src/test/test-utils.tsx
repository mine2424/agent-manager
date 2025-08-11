import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { User } from 'firebase/auth'
import { vi } from 'vitest'

interface WrapperProps {
  children: React.ReactNode
}

interface RenderOptions {
  route?: string
  user?: Partial<User> | null
}

// Mock user for testing
export const mockUser: Partial<User> = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
}

// Custom render function that includes providers
export function render(ui: React.ReactElement, options: RenderOptions = {}) {
  const { route = '/', user = null } = options

  // Set initial route
  window.history.pushState({}, 'Test page', route)

  // Mock AuthContext if needed
  const MockedAuthProvider = ({ children }: WrapperProps) => {
    const contextValue = {
      user: user as User | null,
      loading: false,
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
    }

    return (
      <AuthContext.Provider value={contextValue as any}>
        {children}
      </AuthContext.Provider>
    )
  }

  function Wrapper({ children }: WrapperProps) {
    return (
      <BrowserRouter>
        <MockedAuthProvider>
          {children}
        </MockedAuthProvider>
      </BrowserRouter>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'