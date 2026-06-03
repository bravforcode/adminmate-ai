export function formatCurrency(amount: number, currency: string = 'THB', locale?: string): string {
  const locales: Record<string, string> = {
    THB: 'th-TH',
    VND: 'vi-VN',
    IDR: 'id-ID',
    USD: 'en-US',
  }

  const l = locale || locales[currency] || 'en-US'

  try {
    return new Intl.NumberFormat(l, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}
