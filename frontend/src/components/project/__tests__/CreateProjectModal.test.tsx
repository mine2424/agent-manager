import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateProjectModal } from '../CreateProjectModal'

// Mock useIsMobile hook
vi.mock('../../../hooks/useMediaQuery', () => ({
  useIsMobile: () => false
}))

describe('CreateProjectModal', () => {
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
  })

  it('should not render when isOpen is false', () => {
    render(
      <CreateProjectModal
        isOpen={false}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.queryByText('新しいプロジェクトを作成')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.getByText('新しいプロジェクトを作成')).toBeInTheDocument()
    expect(screen.getByLabelText(/プロジェクト名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/説明/)).toBeInTheDocument()
  })

  it('should require project name', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const submitButton = screen.getByText('作成')
    expect(submitButton).toBeDisabled()

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    await user.type(nameInput, 'Test Project')

    expect(submitButton).toBeEnabled()
  })

  it('should validate project name format', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    
    // Type invalid project name
    await user.type(nameInput, 'Project@#$%')
    await user.tab() // Trigger validation

    await waitFor(() => {
      expect(screen.getByText('プロジェクト名は英数字、日本語、ハイフン、アンダースコアのみ使用できます')).toBeInTheDocument()
    })
  })

  it('should validate project name length', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    const longName = 'a'.repeat(101)
    
    await user.type(nameInput, longName)
    await user.tab()

    await waitFor(() => {
      const errorText = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && 
               element?.classList.contains('text-red-600') &&
               content.includes('100文字以内')
      })
      expect(errorText).toBeInTheDocument()
    })
  })

  it('should validate description length', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const descriptionInput = screen.getByLabelText(/説明/)
    const longDescription = 'a'.repeat(501)
    
    await user.type(descriptionInput, longDescription)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('500文字以内で入力してください')).toBeInTheDocument()
    })
  })

  it('should call onCreate with sanitized values', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    const descriptionInput = screen.getByLabelText(/説明/)

    await user.type(nameInput, '  Test Project  ')
    await user.type(descriptionInput, '  Test Description  ')
    await user.click(screen.getByText('作成'))

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(
        'Test Project', // Trimmed
        'Test Description' // Trimmed
      )
    })
  })

  it('should reset form and close modal after successful creation', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    const descriptionInput = screen.getByLabelText(/説明/)

    await user.type(nameInput, 'Test Project')
    await user.type(descriptionInput, 'Test Description')
    await user.click(screen.getByText('作成'))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should handle creation errors', async () => {
    const user = userEvent.setup()
    const error = new Error('Creation failed')
    mockOnCreate.mockRejectedValueOnce(error)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    await user.type(screen.getByLabelText(/プロジェクト名/), 'Test Project')
    await user.click(screen.getByText('作成'))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create project:', error)
    })

    // Modal should remain open on error
    expect(mockOnClose).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should disable buttons while creating', async () => {
    const user = userEvent.setup()
    
    // Make onCreate return a slow promise
    mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    await user.type(screen.getByLabelText(/プロジェクト名/), 'Test Project')
    await user.click(screen.getByText('作成'))

    // Buttons should be disabled during creation
    expect(screen.getByText('作成中...')).toBeDisabled()
    expect(screen.getByText('キャンセル')).toBeDisabled()
  })

  it('should close modal when cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    await user.click(screen.getByText('キャンセル'))

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockOnCreate).not.toHaveBeenCalled()
  })

  it('should clear validation errors when typing valid input', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    
    // Type invalid name
    await user.type(nameInput, 'Invalid@Name')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('プロジェクト名は英数字、日本語、ハイフン、アンダースコアのみ使用できます')).toBeInTheDocument()
    })

    // Clear and type valid name
    await user.clear(nameInput)
    await user.type(nameInput, 'Valid Name')

    await waitFor(() => {
      expect(screen.queryByText('プロジェクト名は英数字、日本語、ハイフン、アンダースコアのみ使用できます')).not.toBeInTheDocument()
    })
  })

  it('should show red border for invalid inputs', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    
    // Initially should have normal border
    expect(nameInput).toHaveClass('border-gray-300')

    // Type invalid name
    await user.type(nameInput, 'Invalid@Name')
    await user.tab()

    await waitFor(() => {
      expect(nameInput).toHaveClass('border-red-500')
      expect(nameInput).toHaveClass('focus:ring-red-500')
    })
  })

  it('should accept Japanese characters in project name', async () => {
    const user = userEvent.setup()

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    )

    const nameInput = screen.getByLabelText(/プロジェクト名/)
    await user.type(nameInput, '日本語プロジェクト123')
    await user.click(screen.getByText('作成'))

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('日本語プロジェクト123', '')
    })
  })
})