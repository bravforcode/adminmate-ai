export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong'

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3
  label: PasswordStrength
  percent: number
  color: string
  hints: string[]
}

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  '12345678',
  '123456789',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'admin123',
  'letmein1',
  'welcome1',
  'monkey123',
  'dragon12',
])

function hasSequential(value: string, length: number): boolean {
  for (let i = 0; i <= value.length - length; i++) {
    let asc = true
    let desc = true
    for (let j = 1; j < length; j++) {
      const prev = value.charCodeAt(i + j - 1)
      const curr = value.charCodeAt(i + j)
      if (curr !== prev + 1) asc = false
      if (curr !== prev - 1) desc = false
    }
    if (asc || desc) return true
  }
  return false
}

export function evaluatePassword(password: string): PasswordStrengthResult {
  const hints: string[] = []
  if (!password) {
    return { score: 0, label: 'empty', percent: 0, color: 'bg-outline-variant', hints: [] }
  }

  let score = 0
  const length = password.length
  if (length >= 12) score += 1
  if (length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (length < 8) hints.push('Use at least 8 characters')
  if (!/[A-Z]/.test(password)) hints.push('Add an uppercase letter')
  if (!/[0-9]/.test(password)) hints.push('Add a number')
  if (!/[^A-Za-z0-9]/.test(password)) hints.push('Add a special character')
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = Math.max(0, score - 2)
    hints.push('Avoid common passwords')
  }
  if (hasSequential(password.toLowerCase(), 5)) {
    score = Math.max(0, score - 1)
    hints.push('Avoid long sequences')
  }

  let normalized: 0 | 1 | 2 | 3
  if (score <= 2) normalized = 0
  else if (score <= 3) normalized = 1
  else if (score <= 4) normalized = 2
  else normalized = 3

  const label: PasswordStrength =
    normalized === 0 ? 'weak' : normalized === 1 ? 'weak' : normalized === 2 ? 'medium' : 'strong'
  const percent = normalized === 0 ? 20 : normalized === 1 ? 40 : normalized === 2 ? 70 : 100
  const color =
    normalized === 0
      ? 'bg-error'
      : normalized === 1
        ? 'bg-error'
        : normalized === 2
          ? 'bg-tertiary'
          : 'bg-primary'

  return { score: normalized, label, percent, color, hints }
}
