import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher } from '../../../src/components/layout/LanguageSwitcher'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { changeLanguage: vi.fn() } }) }))
vi.mock('../../../src/stores/uiStore', () => ({ useUIStore: vi.fn(() => ({ language: 'th', setLanguage: vi.fn() })) }))

describe('LanguageSwitcher', () => {
  it('renders all 4 language buttons', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByText(/TH/)).toBeTruthy()
    expect(screen.getByText(/EN/)).toBeTruthy()
    expect(screen.getByText(/VI/)).toBeTruthy()
    expect(screen.getByText(/中文/)).toBeTruthy()
  })
})
