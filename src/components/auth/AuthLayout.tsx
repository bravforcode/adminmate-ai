import { Logo } from '../brand/Logo'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

// AuthLayout is no longer used for LoginPage (replaced by inline LoginPage design)
// Kept for ForgotPassword, ResetPassword pages
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg, #f8fafc)',
      padding: '24px',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <Logo size={40} showText={false} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: '20px', fontWeight: 400,
            color: 'var(--color-navy-deep, #0f172a)',
            letterSpacing: '-0.02em', margin: '0 0 4px 0',
          }}>
            AdminMate AI
          </h1>
          <p style={{
            fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)',
            margin: 0, fontWeight: 400,
          }}>
            HR Intelligence for SME
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--color-surface, #ffffff)',
          border: '1px solid var(--color-border-subtle, #f1f5f9)',
          borderRadius: '14px',
          padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(37, 99, 235, 0.06)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: '24px', fontWeight: 400,
            color: 'var(--color-navy-deep, #0f172a)',
            letterSpacing: '-0.02em',
            margin: '0 0 4px 0',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontSize: '14px', fontWeight: 300,
              color: 'var(--color-text-secondary, #475569)',
              margin: '0 0 24px 0', lineHeight: 1.6,
            }}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
