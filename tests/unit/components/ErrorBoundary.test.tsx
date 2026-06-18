import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../../../src/components/common/ErrorBoundary'

const Broken = () => { throw new Error('Test crash') }

vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><div>OK</div></ErrorBoundary>)
    expect(screen.getByText('OK')).toBeTruthy()
  })

  it('shows fallback on error', () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Test crash')).toBeTruthy()
  })
})
