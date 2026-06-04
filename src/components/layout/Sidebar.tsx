import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { navItems } from '../../lib/navigation'
import { Plus, X } from 'lucide-react'

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const company = useAuthStore(s => s.company)
  const { t } = useTranslation('common')

  const flatNavItems = navItems.flatMap(item => item.children ? item.children : [item])

  return (
    <>
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 28, 46, 0.18)',
            zIndex: 40,
          }}
          className="md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <nav
        style={{
          position: 'fixed',
          left: 0, top: 0,
          height: '100%',
          width: '260px',
          backgroundColor: 'var(--color-navy-deep, #0f1c2e)',
          borderRight: 'none',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
        }}
        className={`${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo strip */}
        <div style={{
          padding: '20px 20px 18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-accent, #2980b9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                color: '#fff',
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: '15px', fontWeight: 400,
              }}>A</span>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: '15px', fontWeight: 400,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                margin: 0, lineHeight: 1.2,
              }}>AdminMate</p>
              <p style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.45)',
                margin: 0, fontWeight: 400,
                maxWidth: '140px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {company?.name || 'AI Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* New Request CTA */}
        <div style={{ padding: '14px 14px 10px 14px' }}>
          <button style={{
            width: '100%',
            backgroundColor: 'var(--color-accent, #2980b9)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            transition: 'opacity 0.2s ease-out',
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={15} />
            {t('nav.new_request')}
          </button>
        </div>

        {/* Navigation links */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {flatNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path!}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                backgroundColor: isActive ? 'rgba(41, 128, 185, 0.25)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-accent, #2980b9)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease-out',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'rgba(255,255,255,0.06)'
                  el.style.color = 'rgba(255,255,255,0.85)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'transparent'
                  el.style.color = 'rgba(255,255,255,0.55)'
                }
              }}
            >
              <item.icon size={17} style={{ flexShrink: 0 }} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>

        {/* Bottom — version */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.25)',
            margin: 0, letterSpacing: '0.05em',
          }}>
            AdminMate AI &nbsp;&mdash;&nbsp; v2.0
          </p>
        </div>
      </nav>
    </>
  )
}
