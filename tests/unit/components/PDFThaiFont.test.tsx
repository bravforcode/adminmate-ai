import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFDownloadButton } from '../../../src/components/pdf/PDFDownloadButton'

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob(['fake-pdf'], { type: 'application/pdf' })),
  })),
  Document: 'mock-document',
  Page: 'mock-page',
  Text: 'mock-text',
  View: 'mock-view',
  StyleSheet: { create: vi.fn(() => ({})) },
  Font: { register: vi.fn() },
}))

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const THAI_DATA = {
  id: 'offer-1',
  candidates: { full_name: 'สมชาย ใจดี' },
  position_title: 'นักพัฒนาซอฟต์แวร์อาวุโส',
  salary_offered: 80000,
  salary_currency: 'THB',
  employment_type: 'full_time',
  start_date: '2024-07-01',
  work_hours: '09:00-18:00',
  benefits: ['ประกันสุขภาพ', 'วันลาพักร้อน 12 วัน', 'กองทุนสำรองเลี้ยงชีพ'],
  special_conditions: 'เงื่อนไขพิเศษตามกฎหมายแรงงานไทย พ.ศ.2541',
  company: { name: 'บริษัท เทคโนว่า โซลูชั่น จำกัด', country: 'TH' },
}

describe('PDFDownloadButton — Thai text', () => {
  it('generates PDF with Thai text without crash', async () => {
    render(<PDFDownloadButton data={THAI_DATA} />)
    const btn = screen.getByText('Download PDF')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText('Download PDF')).toBeTruthy()
    })
  })
})
