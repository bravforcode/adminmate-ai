import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobForm } from '../../../src/components/jobs/JobForm'

vi.mock('../../../src/hooks/useJobs', () => ({ useCreateJob: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('../../../src/stores/authStore', () => ({ useAuthStore: vi.fn(() => ({ profile: { id: '1' }, company: { id: 'c1', country: 'TH' } })) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

describe('JobForm', () => {
  it('renders step 1 with title and department inputs', () => {
    render(<JobForm onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('Senior Frontend Developer')).toBeTruthy()
  })
})
