import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, LoginStep } from '../types';
import { Mail, Lock, ArrowLeft, ArrowRight, Chrome } from 'lucide-react';

interface LoginViewProps {
  language: Language;
  onLoginSuccess: (email: string, role: 'Owner' | 'HR' | 'Admin' | 'Applicant') => void;
  setLanguage: (lang: Language) => void;
}

type SelectedRole = 'HR' | 'Applicant' | null;

const LANGS: { code: Language; label: string }[] = [
  { code: 'TH', label: 'TH' },
  { code: 'EN', label: 'EN' },
  { code: 'VI', label: 'VI' },
  { code: 'ZH', label: '中文' },
];

export default function LoginView({ language, onLoginSuccess, setLanguage }: LoginViewProps) {
  const [step, setStep] = useState<LoginStep>('role-select');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    setStep('login-form');
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleBack = () => {
    setStep('role-select');
    setSelectedRole(null);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(
        language === 'TH' ? 'กรุณากรอกอีเมลและรหัสผ่าน' :
        language === 'VI' ? 'Vui long nhap email va mat khau' :
        language === 'ZH' ? '请填写邮箱和密码' :
        'Please enter your email and password'
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (selectedRole === 'HR') {
        onLoginSuccess(email, 'HR');
      } else {
        onLoginSuccess(email, 'Applicant');
      }
    }, 900);
  };

  const handleAutofillHR = () => {
    setEmail('demo@adminmate.ai');
    setPassword('demo123');
    setError('');
  };

  const handleAutofillApplicant = () => {
    setEmail('applicant@adminmate.ai');
    setPassword('demo123');
    setError('');
  };

  const handleGoogleLogin = () => {
    onLoginSuccess('google@user.com', selectedRole === 'Applicant' ? 'Applicant' : 'HR');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>A</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 400,
              color: 'var(--color-navy-deep)',
              letterSpacing: '-0.02em',
            }}
          >
            AdminMate
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-accent)',
                backgroundColor: 'var(--color-accent-light)',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '6px',
                letterSpacing: '0.05em',
              }}
            >
              AI
            </span>
          </span>
        </div>

        {/* Language Switcher */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '8px', padding: '3px' }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              id={`lang-${l.code.toLowerCase()}`}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
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
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        {step === 'role-select' ? (
          /* ── STEP 1: ROLE SELECTION ── */
          <div style={{ width: '100%', maxWidth: '760px' }}>
            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <p className="t-label" style={{ marginBottom: '12px' }}>
                {t.tagline}
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(28px, 4vw, 44px)',
                  fontWeight: 400,
                  color: 'var(--color-navy-deep)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  margin: '0 0 14px 0',
                }}
              >
                {t.roleSelectTitle}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '16px',
                  fontWeight: 300,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {t.roleSelectSubtitle}
              </p>
            </div>

            {/* Role Cards — asymmetric: HR card offset up, Applicant offset down */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.95fr',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              {/* HR Card */}
              <div
                className="role-card"
                id="role-card-hr"
                onClick={() => handleRoleSelect('HR')}
                style={{ transform: 'translateY(-10px)' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect('HR')}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-navy)',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '22px',
                      fontWeight: 400,
                      color: 'var(--color-navy-deep)',
                      letterSpacing: '-0.02em',
                      margin: '0 0 6px 0',
                    }}
                  >
                    {t.hrRoleTitle}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 24px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {t.hrRoleSubtitle}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[t.hrFeature1, t.hrFeature2, t.hrFeature3].map((f, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-accent)',
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-navy)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t.signIn}
                    </span>
                    <ArrowRight size={16} color="var(--color-accent)" />
                  </div>
                </div>
              </div>

              {/* Applicant Card */}
              <div
                className="role-card"
                id="role-card-applicant"
                onClick={() => handleRoleSelect('Applicant')}
                style={{ transform: 'translateY(10px)' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect('Applicant')}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-accent-light)',
                      border: '1.5px solid var(--color-accent-dim)',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '22px',
                      fontWeight: 400,
                      color: 'var(--color-navy-deep)',
                      letterSpacing: '-0.02em',
                      margin: '0 0 6px 0',
                    }}
                  >
                    {t.applicantRoleTitle}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 24px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {t.applicantRoleSubtitle}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[t.applicantFeature1, t.applicantFeature2].map((f, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-accent)',
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-accent)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t.signIn}
                    </span>
                    <ArrowRight size={16} color="var(--color-accent)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom note — demo hint */}
            <p
              style={{
                textAlign: 'center',
                marginTop: '40px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
              }}
            >
              Demo: HR → demo@adminmate.ai / demo123 &nbsp;&nbsp;|&nbsp;&nbsp; Applicant → applicant@adminmate.ai / demo123
            </p>
          </div>
        ) : (
          /* ── STEP 2: LOGIN FORM ── */
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Back button */}
            <button
              onClick={handleBack}
              id="btn-back-role"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                padding: '0 0 32px 0',
                transition: 'color 0.25s ease-out',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).closest('button')!.style.color = 'var(--color-navy)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).closest('button')!.style.color = 'var(--color-text-secondary)')}
            >
              <ArrowLeft size={14} />
              {t.backToRoleSelect}
            </button>

            {/* Heading */}
            <div style={{ marginBottom: '36px' }}>
              <p className="t-label" style={{ marginBottom: '10px' }}>
                {t.signingInAs} &mdash; {selectedRole === 'HR' ? t.hrRoleTitle : t.applicantRoleTitle}
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  fontWeight: 400,
                  color: 'var(--color-navy-deep)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                {t.signIn}
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '7px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.email}
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    <Mail size={15} />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === 'HR' ? 'demo@adminmate.ai' : 'applicant@adminmate.ai'}
                    className="input-luxury"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label
                    htmlFor="login-password"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.password}
                  </label>
                  <button
                    type="button"
                    onClick={() => alert(language === 'TH' ? 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว (จำลอง)' : 'Password reset email sent (demo)')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: 'var(--color-accent)',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    <Lock size={15} />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-luxury"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fdecea',
                    border: '1px solid #f0b0a8',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--color-error)',
                    fontWeight: 400,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '6px', width: '100%', padding: '13px 28px' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner" style={{ width: '16px', height: '16px' }} />
                    {language === 'TH' ? 'กำลังเข้าสู่ระบบ...' :
                     language === 'VI' ? 'Dang dang nhap...' :
                     language === 'ZH' ? '正在登录...' : 'Signing in...'}
                  </span>
                ) : (
                  t.signIn
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider-text" style={{ margin: '24px 0' }}>
              {language === 'TH' ? 'หรือ' : language === 'VI' ? 'hoac' : language === 'ZH' ? '或' : 'or'}
            </div>

            {/* Google Login */}
            <button
              type="button"
              id="btn-google-login"
              onClick={handleGoogleLogin}
              className="btn-ghost"
              style={{ width: '100%' }}
            >
              <Chrome size={15} />
              {t.continueWithGoogle}
            </button>

            {/* Demo Credentials Box */}
            <div
              onClick={selectedRole === 'HR' ? handleAutofillHR : handleAutofillApplicant}
              id="demo-credentials-box"
              title={language === 'TH' ? 'คลิกเพื่อกรอกอัตโนมัติ' : 'Click to autofill'}
              style={{
                marginTop: '24px',
                padding: '16px 20px',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'border-color 0.25s ease-out, box-shadow 0.25s ease-out',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--color-accent)';
                el.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.1)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--color-border)';
                el.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-navy)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: '0 0 8px 0',
                    }}
                  >
                    {t.demoLogin}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 3px 0', fontFamily: 'monospace' }}>
                    {selectedRole === 'HR' ? 'demo@adminmate.ai' : 'applicant@adminmate.ai'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, fontFamily: 'monospace' }}>
                    demo123
                  </p>
                </div>
                <ArrowRight size={14} color="var(--color-accent)" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--color-border-subtle)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400, margin: 0 }}>
          &copy; {new Date().getFullYear()} AdminMate AI &nbsp;&mdash;&nbsp;
          {language === 'TH' ? 'ระบบบริหาร HR สำหรับ SME' :
           language === 'VI' ? 'He thong HR cho doanh nghiep SME' :
           language === 'ZH' ? '中小企业人力资源管理系统' :
           'HR Intelligence for SME'}
        </p>
      </div>
    </div>
  );
}
