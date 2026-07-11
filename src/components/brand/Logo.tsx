export function Logo({ size = 32, showText = true, variant = 'default' }: {
  size?: number
  showText?: boolean
  variant?: 'default' | 'light'
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#0c1222'
  const badgeBg = variant === 'light' ? 'rgba(255,255,255,0.15)' : '#fff1eb'
  const badgeText = variant === 'light' ? '#ffccbc' : '#e84118'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AdminMate AI logo"
      >
        {/* Cloud shape */}
        <path
          d="M8 22.5c-2.2 0-4-1.5-4-3.5 0-1.7 1.3-3.2 3.1-3.6C7.2 12.8 9.8 10 13 10c3.8 0 7 2.9 7.3 6.6 1.9.3 3.2 1.8 3.2 3.6 0 2-1.8 3.5-4 3.5H8z"
          fill="url(#cloudGrad)"
        />
        {/* Brain / neural nodes */}
        <circle cx="12.5" cy="18" r="1.5" fill="#ffffff" opacity="0.9" />
        <circle cx="16" cy="16" r="1.8" fill="#ffffff" />
        <circle cx="19.5" cy="18" r="1.5" fill="#ffffff" opacity="0.9" />
        <circle cx="14" cy="20.5" r="1.2" fill="#ffffff" opacity="0.7" />
        <circle cx="18" cy="20.5" r="1.2" fill="#ffffff" opacity="0.7" />
        {/* Synapses */}
        <line x1="12.5" y1="18" x2="16" y2="16" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        <line x1="16" y1="16" x2="19.5" y2="18" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        <line x1="12.5" y1="18" x2="14" y2="20.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />
        <line x1="19.5" y1="18" x2="18" y2="20.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />
        <line x1="14" y1="20.5" x2="18" y2="20.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />
        <defs>
          <linearGradient id="cloudGrad" x1="4" y1="10" x2="27" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e84118" />
            <stop offset="1" stopColor="#ff6348" />
          </linearGradient>
        </defs>
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
