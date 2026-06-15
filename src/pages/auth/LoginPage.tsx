import { useState } from 'react'
import { LoginForm } from '../../components/auth/LoginForm'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Logo } from '../../components/brand/Logo'

type SelectedRole = 'hr' | 'applicant' | null
type LoginStep = 'role-select' | 'login-form'

const LANGS = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
  { code: 'vi', label: 'VI' },
  { code: 'zh', label: '中文' },
]

const ROLE_CONTENT = {
  th: {
    selectTitle: 'เลือกพื้นที่ทำงาน',
    selectSub: 'เลือกว่าวันนี้คุณจะใช้งาน AdminMate AI ในฐานะใด',
    hrTitle: 'HR / นายจ้าง',
    hrSub: 'บริหารการสรรหาบุคลากรของ SME คุณ',
    hrF1: 'เขียน JD ด้วย AI',
    hrF2: 'คัดกรองและจัดอันดับผู้สมัคร',
    hrF3: 'จัดการเอกสาร Onboarding',
    apTitle: 'ผู้สมัครงาน',
    apSub: 'สร้างโปรไฟล์และติดตามความคืบหน้า',
    apF1: 'สร้าง CV มืออาชีพ',
    apF2: 'ดูงานที่ต้องทำก่อนเริ่มงาน',
    back: 'เปลี่ยนพื้นที่ทำงาน',
    signingAs: 'เข้าสู่ระบบในฐานะ',
    footer: 'ระบบบริหาร HR สำหรับ SME',
  },
  en: {
    selectTitle: 'Select your workspace',
    selectSub: 'Choose how you will use AdminMate AI today',
    hrTitle: 'HR / Employer',
    hrSub: 'Manage your SME hiring operations',
    hrF1: 'Create job descriptions with AI',
    hrF2: 'Screen and rank candidates',
    hrF3: 'Manage onboarding documents',
    apTitle: 'Job Applicant',
    apSub: 'Build your profile and track your progress',
    apF1: 'Build a professional CV',
    apF2: 'Complete onboarding tasks',
    back: 'Change workspace',
    signingAs: 'Signing in as',
    footer: 'HR Intelligence for SME',
  },
  vi: {
    selectTitle: 'Chon khong gian lam viec',
    selectSub: 'Chon cach ban su dung AdminMate AI hom nay',
    hrTitle: 'HR / Nha tuyen dung',
    hrSub: 'Quan ly tuyen dung SME cua ban',
    hrF1: 'Tao mo ta cong viec bang AI',
    hrF2: 'Sang loc va xep hang ung vien',
    hrF3: 'Quan ly tai lieu onboarding',
    apTitle: 'Nguoi xin viec',
    apSub: 'Xay dung ho so va theo doi tien trinh',
    apF1: 'Tao CV chuyen nghiep',
    apF2: 'Hoan thanh nhiem vu onboarding',
    back: 'Doi khong gian',
    signingAs: 'Dang nhap voi tu cach',
    footer: 'He thong HR cho doanh nghiep SME',
  },
  zh: {
    selectTitle: '选择工作区',
    selectSub: '选择您今天使用 AdminMate AI 的身份',
    hrTitle: 'HR / 雇主',
    hrSub: '管理中小企业招聘运营',
    hrF1: '用 AI 创建职位描述',
    hrF2: '筛选和排名候选人',
    hrF3: '管理入职文件',
    apTitle: '求职者',
    apSub: '建立个人档案并跟踪进度',
    apF1: '创建专业简历',
    apF2: '完成入职任务',
    back: '更改工作区',
    signingAs: '以此身份登录',
    footer: '中小企业人力资源管理系统',
  },
}

export function LoginPage() {
  const { i18n } = useTranslation()
  const setLanguage = useUIStore(s => s.setLanguage)
  const currentLang = useUIStore(s => s.language) || 'th'

  const [step, setStep] = useState<LoginStep>('role-select')
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null)

  const langKey = (currentLang === 'th' ? 'th' : currentLang === 'vi' ? 'vi' : currentLang === 'zh' ? 'zh' : 'en') as keyof typeof ROLE_CONTENT
  const c = ROLE_CONTENT[langKey] || ROLE_CONTENT.en

  const switchLang = (code: string) => {
    i18n.changeLanguage(code)
    setLanguage(code)
  }

  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role)
    setStep('login-form')
  }

  const handleBack = () => {
    setStep('role-select')
    setSelectedRole(null)
  }

  return (
    <div
      className="animate-gradient"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 50%, #dce8fa 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating shapes */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div
          className="animate-float1"
          style={{
            position: 'absolute', top: '10%', left: '5%',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          className="animate-float2"
          style={{
            position: 'absolute', top: '60%', right: '8%',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)',
          }}
        />
        <div
          className="animate-float1"
          style={{
            position: 'absolute', bottom: '15%', left: '20%',
            width: '180px', height: '180px', borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)',
            animationDelay: '-3s',
            animationDuration: '12s',
          }}
        />
        <div
          className="animate-float2"
          style={{
            position: 'absolute', top: '30%', left: '50%',
            width: '150px', height: '150px', borderRadius: '30% 70% 50% 50% / 50% 40% 60% 50%',
            background: 'radial-gradient(circle, rgba(147,197,253,0.05) 0%, transparent 70%)',
            animationDelay: '-5s',
            animationDuration: '9s',
          }}
        />
        <div
          className="animate-pulse-subtle"
          style={{
            position: 'absolute', top: '20%', right: '25%',
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Logo size={32} />

        {/* Language Switcher */}
        <div
          style={{
            display: 'flex', gap: '2px',
            backgroundColor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px', padding: '3px',
          }}
        >
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              id={`login-lang-${l.code}`}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.04em',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.25s ease-out',
                backgroundColor: currentLang === l.code ? '#2563eb' : 'transparent',
                color: currentLang === l.code ? '#ffffff' : '#94a3b8',
              }}
              aria-pressed={currentLang === l.code}
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
          position: 'relative',
          zIndex: 1,
        }}
      >
        {step === 'role-select' ? (
          <div style={{ width: '100%', maxWidth: '800px' }} className="animate-fade-in-up">

            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>

              <h1
                style={{
                  fontFamily: 'var(--font-serif, "DM Serif Display", Georgia, serif)',
                  fontSize: 'clamp(30px, 4.5vw, 48px)',
                  fontWeight: 400,
                  color: '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  margin: '0 0 12px 0',
                }}
              >
                {c.selectTitle}
              </h1>
              <p
                style={{
                  fontSize: '16px', fontWeight: 300,
                  color: '#475569',
                  lineHeight: 1.6, margin: 0,
                }}
              >
                {c.selectSub}
              </p>
            </div>

            {/* Role cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* HR Card */}
              <div
                id="role-card-hr"
                onClick={() => handleRoleSelect('hr')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleRoleSelect('hr')}
                className="stagger-1 animate-fade-in-up"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '40px 32px',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = '#2563eb'
                  el.style.transform = 'scale(1.02)'
                  el.style.boxShadow = '0 24px 56px rgba(37, 99, 235, 0.14)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = '#e2e8f0'
                  el.style.transform = 'scale(1)'
                  el.style.boxShadow = '0 4px 24px rgba(37, 99, 235, 0.06)'
                }}
              >
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    marginBottom: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(37,99,235,0.2)',
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-serif, "DM Serif Display", Georgia, serif)',
                    fontSize: '22px', fontWeight: 400,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    margin: '0 0 6px 0',
                  }}
                >
                  {c.hrTitle}
                </h2>
                <p
                  style={{
                    fontSize: '13px', fontWeight: 400,
                    color: '#475569',
                    margin: '0 0 24px 0', lineHeight: 1.55,
                  }}
                >
                  {c.hrSub}
                </p>
                <ul
                  style={{
                    listStyle: 'none', padding: 0,
                    margin: '0 0 28px 0',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                >
                  {[c.hrF1, c.hrF2, c.hrF3].map((f, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      fontSize: '13px', color: '#0f172a',
                    }}>
                      <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        backgroundColor: '#2563eb', flexShrink: 0,
                      }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px', fontWeight: 700,
                      color: '#2563eb',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    Sign In
                  </span>
                  <ArrowRight size={16} color="#2563eb" />
                </div>
              </div>

              {/* Applicant Card */}
              <div
                id="role-card-applicant"
                onClick={() => handleRoleSelect('applicant')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleRoleSelect('applicant')}
                className="stagger-2 animate-fade-in-up"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '40px 32px',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = '#60a5fa'
                  el.style.transform = 'scale(1.02)'
                  el.style.boxShadow = '0 24px 56px rgba(96, 165, 250, 0.13)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = '#e2e8f0'
                  el.style.transform = 'scale(1)'
                  el.style.boxShadow = '0 4px 24px rgba(37, 99, 235, 0.06)'
                }}
              >
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: '#dbeafe',
                    border: '1.5px solid #93c5fd',
                    marginBottom: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="#60a5fa" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-serif, "DM Serif Display", Georgia, serif)',
                    fontSize: '22px', fontWeight: 400,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    margin: '0 0 6px 0',
                  }}
                >
                  {c.apTitle}
                </h2>
                <p
                  style={{
                    fontSize: '13px', fontWeight: 400,
                    color: '#475569',
                    margin: '0 0 24px 0', lineHeight: 1.55,
                  }}
                >
                  {c.apSub}
                </p>
                <ul
                  style={{
                    listStyle: 'none', padding: 0,
                    margin: '0 0 28px 0',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                >
                  {[c.apF1, c.apF2].map((f, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      fontSize: '13px', color: '#0f172a',
                    }}>
                      <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        backgroundColor: '#60a5fa', flexShrink: 0,
                      }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px', fontWeight: 700,
                      color: '#60a5fa',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    Sign In
                  </span>
                  <ArrowRight size={16} color="#60a5fa" />
                </div>
              </div>
            </div>


          </div>

        ) : (
          /* ── STEP 2: LOGIN FORM ── */
          <div style={{ width: '100%', maxWidth: '420px' }} className="animate-slide-in-right">

            {/* Back button */}
            <button
              onClick={handleBack}
              id="btn-back-role"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569',
                fontSize: '13px', fontWeight: 500,
                padding: '0 0 28px 0',
                transition: 'color 0.25s ease-out',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <ArrowLeft size={14} />
              {c.back}
            </button>

            {/* Role badge + heading */}
            <div style={{ marginBottom: '28px' }}>
              <p
                style={{
                  fontSize: '11px', fontWeight: 600,
                  color: '#94a3b8',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                {c.signingAs} — {selectedRole === 'hr' ? c.hrTitle : c.apTitle}
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-serif, "DM Serif Display", Georgia, serif)',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  fontWeight: 400,
                  color: '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Sign In
              </h1>
            </div>

            {/* Login Form Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 4px 24px rgba(37, 99, 235, 0.06), 0 1px 2px rgba(37, 99, 235, 0.03)',
              }}
            >
              <LoginForm />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '18px 32px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: '11px', color: '#94a3b8',
            margin: 0, letterSpacing: '0.02em',
          }}
        >
          &copy; {new Date().getFullYear()} AdminMate AI &mdash; {c.footer}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
