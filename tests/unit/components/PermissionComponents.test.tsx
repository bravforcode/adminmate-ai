import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, string>) => {
      if (opts) {
        let result = fallback ?? key
        for (const [k, v] of Object.entries(opts)) {
          result = result.replace(`{{${k}}}`, v)
        }
        return result
      }
      return fallback ?? key
    },
  }),
}))

import { PermissionDenied } from '../../../src/components/common/PermissionDenied'
import { NeedsConfiguration } from '../../../src/components/common/NeedsConfiguration'

describe('PermissionDenied', () => {
  it('renders access denied message', () => {
    render(<PermissionDenied />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText(/You do not have permission/)).toBeInTheDocument()
  })
})

describe('NeedsConfiguration', () => {
  it('renders generic configuration message', () => {
    render(<NeedsConfiguration />)
    expect(screen.getByText('Configuration Required')).toBeInTheDocument()
    expect(screen.getByText(/This feature requires additional configuration/)).toBeInTheDocument()
  })

  it('renders feature-specific message when feature prop provided', () => {
    render(<NeedsConfiguration feature="Payroll" />)
    expect(screen.getByText('Configuration Required')).toBeInTheDocument()
    expect(screen.getByText(/Payroll/)).toBeInTheDocument()
  })
})
