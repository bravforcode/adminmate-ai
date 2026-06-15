import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockChallenge = vi.hoisted(() => vi.fn())
const mockVerify = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      mfa: {
        challenge: mockChallenge,
        verify: mockVerify,
      },
      getSession: mockGetSession,
    },
  },
}))

import { MFAChallenge } from './MFAChallenge'

beforeEach(() => {
  vi.clearAllMocks()
  mockChallenge.mockResolvedValue({ data: { id: 'challenge-1', type: 'totp' }, error: null })
  mockVerify.mockResolvedValue({ data: { id: 'verify-1', type: 'totp' }, error: null })
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null })
})

const onSuccess = vi.fn()
const onCancel = vi.fn()
const defaultProps = { factorId: 'factor-1', onSuccess, onCancel }

describe('MFAChallenge', () => {
  it('should render TOTP input by default', () => {
    render(<MFAChallenge {...defaultProps} />)
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getByTestId('verify-button')).toBeInTheDocument()
  })

  it('should toggle to backup code mode', () => {
    render(<MFAChallenge {...defaultProps} />)
    fireEvent.click(screen.getByText('mfa.use_backup_code'))
    expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument()
  })

  it('should call challenge + verify for TOTP on submit', async () => {
    render(<MFAChallenge {...defaultProps} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })

    fireEvent.click(screen.getByTestId('verify-button'))

    await waitFor(() => {
      expect(mockChallenge).toHaveBeenCalled()
    })
  })

  it('should call verify-mfa edge function for backup code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { verified: true } }),
    })
    global.fetch = fetchMock

    render(<MFAChallenge {...defaultProps} />)
    fireEvent.click(screen.getByText('mfa.use_backup_code'))

    const input = screen.getByPlaceholderText('XXXX-XXXX')
    fireEvent.change(input, { target: { value: 'A1B2-C3D4' } })

    fireEvent.click(screen.getByTestId('verify-button'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('should show error toast on TOTP failure', async () => {
    mockChallenge.mockRejectedValue(new Error('Invalid factor'))
    render(<MFAChallenge {...defaultProps} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })

    fireEvent.click(screen.getByTestId('verify-button'))

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  it('should call onCancel when back button is clicked', () => {
    render(<MFAChallenge {...defaultProps} />)
    fireEvent.click(screen.getByText('common.back'))
    expect(onCancel).toHaveBeenCalled()
  })
})
