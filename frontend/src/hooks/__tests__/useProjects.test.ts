import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjects } from '../useProjects'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { mockUser } from '../../test/test-utils'

// Mock dependencies
vi.mock('firebase/firestore')
vi.mock('react-hot-toast')
vi.mock('../../services/firebase', () => ({
  db: {},
  auth: {},
  githubProvider: {},
}))
const mockUseAuth = vi.fn(() => ({ user: mockUser }))
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))
const mockUseErrorHandler = vi.fn()
vi.mock('../../utils/errorHandler', () => ({
  withErrorHandling: vi.fn(async (fn) => {
    try {
      return await fn()
    } catch (error) {
      // Simulate errorHandler behavior - return undefined on error
      return undefined
    }
  }),
  useErrorHandler: () => mockUseErrorHandler,
}))

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock to default state
    mockUseAuth.mockReturnValue({ user: mockUser })
    // Mock serverTimestamp
    vi.mocked(serverTimestamp).mockReturnValue('mock-timestamp' as any)
    // Mock doc function
    vi.mocked(doc).mockReturnValue('mock-doc-ref' as any)
    // Mock collection function
    vi.mocked(collection).mockReturnValue('mock-collection-ref' as any)
  })

  it('should fetch projects for authenticated user', async () => {
    const mockProjects = [
      {
        id: '1',
        userId: mockUser.uid,
        name: 'Project 1',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      },
      {
        id: '2',
        userId: mockUser.uid,
        name: 'Project 2',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      },
    ]

    const mockSnapshot = {
      docs: mockProjects.map(project => ({
        id: project.id,
        data: () => project,
      })),
    }

    vi.mocked(onSnapshot).mockImplementation((_query, onNext: any) => {
      onNext(mockSnapshot)
      return vi.fn() // unsubscribe function
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Project 1')
    expect(result.current.error).toBeNull()
  })

  it('should return empty array when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null as any })

    const { result } = renderHook(() => useProjects())

    expect(result.current.projects).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle Firestore errors', async () => {
    const mockError = new Error('Firestore error')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    vi.mocked(onSnapshot).mockImplementation((_query, _onNext, onError: any) => {
      // Call error callback asynchronously to simulate real behavior
      setTimeout(() => onError(mockError), 0)
      return vi.fn()
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.error).toBe('プロジェクトの取得に失敗しました')
    })

    expect(result.current.loading).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching projects:', mockError)
    
    consoleErrorSpy.mockRestore()
  })

  it('should create a new project', async () => {
    const mockDocRef = { id: 'new-project-id' }
    vi.mocked(addDoc).mockResolvedValue(mockDocRef as any)
    vi.mocked(toast.success).mockImplementation(() => 'toast-id' as any)

    const { result } = renderHook(() => useProjects())

    const projectId = await result.current.createProject('New Project', 'Description')

    expect(projectId).toBe('new-project-id')
    expect(addDoc).toHaveBeenCalledWith(
      'mock-collection-ref',
      expect.objectContaining({
        userId: mockUser.uid,
        name: 'New Project',
        description: 'Description',
        createdAt: 'mock-timestamp',
        updatedAt: 'mock-timestamp',
      })
    )
    expect(toast.success).toHaveBeenCalledWith('プロジェクトを作成しました')
  })

  it('should handle project creation errors', async () => {
    const mockError = new Error('Creation failed')
    vi.mocked(addDoc).mockRejectedValue(mockError)
    
    // The hook already has errorHandler mocked

    const { result } = renderHook(() => useProjects())

    const projectId = await result.current.createProject('New Project')
    
    // withErrorHandling should return undefined on error
    expect(projectId).toBeUndefined()
  })

  it('should update a project', async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined)
    vi.mocked(toast.success).mockImplementation(() => 'toast-id' as any)

    const { result } = renderHook(() => useProjects())

    await result.current.updateProject('project-id', { name: 'Updated Name' })

    expect(updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        name: 'Updated Name',
        updatedAt: 'mock-timestamp',
      })
    )
    expect(toast.success).toHaveBeenCalledWith('プロジェクトを更新しました')
  })

  it('should delete a project', async () => {
    vi.mocked(deleteDoc).mockResolvedValue(undefined)
    vi.mocked(toast.success).mockImplementation(() => 'toast-id' as any)

    const { result } = renderHook(() => useProjects())

    await result.current.deleteProject('project-id')

    expect(deleteDoc).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('プロジェクトを削除しました')
  })

  it('should throw error when creating project without authentication', async () => {
    mockUseAuth.mockReturnValue({ user: null as any })

    const { result } = renderHook(() => useProjects())

    await expect(result.current.createProject('New Project')).rejects.toThrow('ユーザーが認証されていません')
  })

  it('should unsubscribe from Firestore on unmount', async () => {
    const unsubscribe = vi.fn()
    vi.mocked(onSnapshot).mockImplementation((_query, onNext: any) => {
      // Simulate initial data load
      setTimeout(() => {
        onNext({ docs: [] })
      }, 0)
      return unsubscribe
    })

    const { unmount } = renderHook(() => useProjects())

    // Wait a bit for effect to run
    await new Promise(resolve => setTimeout(resolve, 10))

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should handle projects with missing timestamps gracefully', async () => {
    const mockProjects = [
      {
        id: '1',
        userId: mockUser.uid,
        name: 'Project without timestamps',
        createdAt: null,
        updatedAt: null,
      },
    ]

    const mockSnapshot = {
      docs: mockProjects.map(project => ({
        id: project.id,
        data: () => project,
      })),
    }

    vi.mocked(onSnapshot).mockImplementation((_query, onNext: any) => {
      onNext(mockSnapshot)
      return vi.fn()
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects[0].createdAt).toBeUndefined()
    expect(result.current.projects[0].updatedAt).toBeUndefined()
  })
})