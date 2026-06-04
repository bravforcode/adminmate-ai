import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, Page, UserRole } from '../types';
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Search,
  GitMerge,
  Network,
  FolderLock,
  CheckSquare,
  MessageSquare,
  UserSquare2,
  Settings,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  activePage: Page;
  setActivePage: (page: Page) => void;
  userRole: UserRole;
  setUserRole?: (role: UserRole) => void; // optional — no longer used for switching
  companyName: string;
  onLogout: () => void;
}

const LANGS: { code: Language; label: string }[] = [
  { code: 'TH', label: 'TH' },
  { code: 'EN', label: 'EN' },
  { code: 'VI', label: 'VI' },
  { code: 'ZH', label: '中' },
];

export default function Header({
  language,
  setLanguage,
  activePage,
  setActivePage,
  userRole,
  companyName,
  onLogout,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[language];

  const isApplicant = userRole === 'Applicant';

  // HR tabs
  const hrTabs = [
    { id: 'dashboard' as Page, label: t.dashboard, icon: LayoutDashboard },
    { id: 'jd-generator' as Page, label: t.jdGenerator, icon: FileText },
    { id: 'resume-upload' as Page, label: t.resumeUpload, icon: Search },
    { id: 'candidate-matching' as Page, label: t.candidateMatching, icon: GitMerge },
    { id: 'pipeline' as Page, label: t.candidatePipeline, icon: Network },
    { id: 'onboarding-manager' as Page, label: t.onboardingManager, icon: FolderLock },
    { id: 'settings' as Page, label: t.settings, icon: Settings },
  ];

  // Applicant tabs
  const applicantTabs = [
    { id: 'cv-builder' as Page, label: t.cvBuilder, icon: UserSquare2 },
    { id: 'onboarding-checklist' as Page, label: t.onboardingChecklist, icon: CheckSquare },
    { id: 'onboarding-assistant' as Page, label: t.onboardingAssistant, icon: MessageSquare },
  ];

  const currentTabs = isApplicant ? applicantTabs : hrTabs;

  const handleTabClick = (pageId: Page) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-subtle)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Top strip — Logo + Controls */}
      <div
        style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '60px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>A</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '17px',
                  fontWeight: 400,
                  color: 'var(--color-navy-deep)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                AdminMate
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                  backgroundColor: 'var(--color-accent-light)',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  letterSpacing: '0.06em',
                }}
              >
                AI
              </span>
            </div>
            <p
              style={{
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
                margin: 0,
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isApplicant ? t.navApplicantSuite : companyName}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Language switcher — desktop */}
          <div
            className="lang-switcher-desktop"
            style={{
              display: 'flex',
              gap: '2px',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                id={`header-lang-${l.code.toLowerCase()}`}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease-out',
                  backgroundColor: language === l.code ? 'var(--color-navy)' : 'transparent',
                  color: language === l.code ? '#ffffff' : 'var(--color-text-muted)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Vertical divider */}
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />

          {/* User avatar + role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isApplicant ? 'var(--color-accent-light)' : 'var(--color-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: isApplicant ? 'var(--color-navy)' : '#ffffff',
                flexShrink: 0,
              }}
            >
              {isApplicant ? 'AP' : 'HR'}
            </div>
            <div style={{ display: 'none' }} className="user-info-desktop">
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.3 }}>
                {isApplicant ? 'Job Applicant' : 'HR Manager'}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>
                {userRole}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            id="btn-logout"
            title={t.signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'color 0.25s ease-out, background-color 0.25s ease-out, border-color 0.25s ease-out',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.color = '#c0392b';
              el.style.backgroundColor = '#fdecea';
              el.style.borderColor = '#f0b0a8';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.color = 'var(--color-text-muted)';
              el.style.backgroundColor = 'transparent';
              el.style.borderColor = 'var(--color-border)';
            }}
          >
            <LogOut size={15} />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="btn-mobile-menu"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-navy)',
              cursor: 'pointer',
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Tab Navigation strip */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg)',
          overflowX: 'auto',
        }}
        className="no-scrollbar"
      >
        <div
          style={{
            maxWidth: '1320px',
            margin: '0 auto',
            padding: '0 32px',
            display: 'flex',
            gap: '0',
          }}
        >
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className="nav-tab"
                style={{
                  color: isActive ? 'var(--color-navy)' : 'var(--color-text-secondary)',
                  borderBottomColor: isActive ? 'var(--color-navy)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon
                  size={14}
                  style={{ color: isActive ? 'var(--color-navy)' : 'var(--color-text-muted)', flexShrink: 0 }}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            boxShadow: '0 16px 48px rgba(30, 58, 95, 0.12)',
            zIndex: 50,
          }}
        >
          <div style={{ padding: '16px 20px' }}>
            {/* Role badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface-alt)',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isApplicant ? 'var(--color-accent-light)' : 'var(--color-navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isApplicant ? 'var(--color-navy)' : '#fff',
                }}
              >
                {isApplicant ? 'AP' : 'HR'}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                  {isApplicant ? t.navApplicantSuite : t.navSmeSuite}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                  {companyName}
                </p>
              </div>
            </div>

            {/* Language switcher mobile */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '16px',
                backgroundColor: 'var(--color-surface-alt)',
                borderRadius: '8px',
                padding: '3px',
              }}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: language === l.code ? 'var(--color-navy)' : 'transparent',
                    color: language === l.code ? '#fff' : 'var(--color-text-muted)',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Nav tabs list */}
            <p
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '8px',
                paddingLeft: '4px',
              }}
            >
              {isApplicant ? t.navApplicantSuite : t.navSmeSuite}
            </p>
            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
                    color: isActive ? 'var(--color-navy)' : 'var(--color-text-secondary)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease-out',
                    marginBottom: '2px',
                  }}
                >
                  <Icon size={15} style={{ color: isActive ? 'var(--color-navy)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                  {tab.label}
                </button>
              );
            })}

            <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)', margin: '12px 0' }} />

            {/* Logout */}
            <button
              onClick={() => { setMobileMenuOpen(false); onLogout(); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#c0392b',
                fontSize: '13px',
                fontWeight: 500,
                textAlign: 'left',
                transition: 'background-color 0.2s ease-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdecea')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={15} style={{ color: '#c0392b', flexShrink: 0 }} />
              {t.signOut}
            </button>
          </div>
        </div>
      )}

      {/* Responsive CSS injection */}
      <style>{`
        @media (max-width: 768px) {
          .lang-switcher-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .user-info-desktop { display: block !important; }
        }
      `}</style>
    </header>
  );
}
