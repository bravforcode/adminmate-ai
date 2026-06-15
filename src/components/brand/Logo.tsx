export function Logo({ size = 32, showText = true, variant = 'default' }: {
  size?: number
  showText?: boolean
  variant?: 'default' | 'light'
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#0f172a'
  const accentColor = variant === 'light' ? '#93c5fd' : '#2563eb'
  const badgeBg = variant === 'light' ? 'rgba(255,255,255,0.15)' : '#dbeafe'
  const badgeText = variant === 'light' ? '#bfdbfe' : '#60a5fa'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AdminMate logo"
      >
        <rect width="32" height="32" rx="8" fill={accentColor} />
        <path
          d="M8 22V10l8 8 8-8v12"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 14l6-6 6 6"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-serif, "DM Serif Display", Georgia, serif)',
            fontSize: `${size * 0.56}px`,
            fontWeight: 400,
            color: textColor,
            letterSpacing: '-0.02em',
          }}
        >
          AdminMate
          <span
            style={{
              fontFamily: 'var(--font-sans, Inter, sans-serif)',
              fontSize: `${size * 0.3}px`,
              fontWeight: 600,
              color: badgeText,
              backgroundColor: badgeBg,
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '6px',
              letterSpacing: '0.05em',
            }}
          >
            AI
          </span>
        </span>
      )}
    </div>
  )
}
