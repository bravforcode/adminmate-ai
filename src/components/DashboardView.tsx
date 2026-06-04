import React from 'react';
import { translations } from '../translations';
import { Language, Page, UserRole, Job, Candidate } from '../types';
import {
  PlusCircle,
  Briefcase,
  UserPlus,
  CheckCircle2,
  FileWarning,
  Users2,
  ArrowUpRight,
  ListTodo,
  AlertCircle,
} from 'lucide-react';

interface DashboardViewProps {
  language: Language;
  jobs: Job[];
  candidates: Candidate[];
  pendingDocsCount: number;
  onboardingInProgressCount: number;
  setActivePage: (page: Page) => void;
  userRole?: UserRole;
}

export default function DashboardView({
  language,
  jobs,
  candidates,
  pendingDocsCount,
  onboardingInProgressCount,
  setActivePage,
}: DashboardViewProps) {
  const t = translations[language];

  // Derive stats
  const openJobsCount = jobs.length;
  const newCandidatesCount = candidates.filter(c => c.status === 'New').length;
  const shortlistedCount = candidates.filter(c => c.status === 'Shortlisted').length;

  const quickActionsList = [
    {
      titleKey: t.createJdBtn,
      descEn: "Let AI write a professional job description for any role",
      descTh: "ให้ AI เขียนรายละเอียดตำแหน่งงานอย่างมืออาชีพ",
      icon: PlusCircle,
      action: () => setActivePage('jd-generator')
    },
    {
      titleKey: t.uploadResumeBtn,
      descEn: "Upload resume and calculate AI match score instantly",
      descTh: "อัปโหลดเรซูเมและประเมิน Match Score ทันที",
      icon: UserPlus,
      action: () => setActivePage('resume-upload')
    },
    {
      titleKey: t.generateOnboardingChecklistBtn,
      descEn: "Inspect document status and send email reminders",
      descTh: "ตรวจสอบคลังเอกสารและส่งการแจ้งเตือนพนักงาน",
      icon: ListTodo,
      action: () => setActivePage('onboarding-manager')
    },
    {
      titleKey: t.cvBuilder,
      descEn: "Build and export a formatted applicant CV",
      descTh: "สร้างและส่งออก CV ผู้สมัครในรูปแบบที่พร้อมใช้งาน",
      icon: UserPlus,
      action: () => setActivePage('cv-builder')
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: 1.5fr 1fr 1fr;
          }
        }
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 480px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Welcome Header — asymmetric 1.3fr / 0.7fr */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <p className="t-label" style={{ marginBottom: '8px' }}>
            {language === 'TH' ? 'ภาพรวมระบบ' :
             language === 'VI' ? 'Tong quan he thong' :
             language === 'ZH' ? '系统概览' : 'System Overview'}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 400,
              color: 'var(--color-navy-deep)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 8px 0',
            }}
          >
            {language === 'TH' ? 'ภาพรวม HR ของคุณ' :
             language === 'VI' ? 'Tong quan HR cua ban' :
             language === 'ZH' ? '您的HR概览' : 'Your HR Overview'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 300, margin: 0, lineHeight: 1.6 }}>
            {language === 'TH'
              ? 'ระบบ AI ช่วยสรรหา คัดกรอง และบริหารพนักงานใหม่ทั้งหมดในที่เดียว'
              : language === 'VI' ? 'He thong AI ho tro tuyen dung, sang loc va quan ly nhan vien moi'
              : language === 'ZH' ? 'AI系统助力招聘、筛选和管理新员工'
              : 'AI-powered hiring, screening, and onboarding in one platform.'}
          </p>
        </div>
        {/* Date + status badge — offset slightly */}
        <div
          style={{
            flexShrink: 0,
            alignSelf: 'flex-start',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#1a6b45',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
            {new Date().toLocaleDateString(
              language === 'TH' ? 'th-TH' : language === 'ZH' ? 'zh-CN' : language === 'VI' ? 'vi-VN' : 'en-US',
              { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
            )}
          </span>
        </div>
      </div>

      {/* KPI Cards Strip — mixed sizes: first card 2x wide */}
      <div className="kpi-grid">
        {/* Card 1: Open Jobs — slightly larger */}
        <div
          onClick={() => setActivePage('jd-generator')}
          className="luxury-card"
          style={{ padding: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Briefcase size={18} color="var(--color-navy)" />
            <span className="badge badge-navy">{language === 'TH' ? 'เปิดรับ' : 'Open'}</span>
          </div>
          <div style={{ marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: 'var(--color-navy-deep)', lineHeight: 1 }}>{openJobsCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '4px', display: 'block' }}>{t.openJobs}</span>
          </div>
        </div>

        {/* Card 2: New Candidates */}
        <div
          onClick={() => setActivePage('pipeline')}
          className="luxury-card"
          style={{ padding: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <UserPlus size={18} color="var(--color-accent)" />
          </div>
          <div style={{ marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: 'var(--color-navy-deep)', lineHeight: 1 }}>{newCandidatesCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '4px', display: 'block' }}>{t.newApplicants}</span>
          </div>
        </div>

        {/* Card 3: Shortlisted */}
        <div
          onClick={() => setActivePage('pipeline')}
          className="luxury-card"
          style={{ padding: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div style={{ marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: 'var(--color-navy-deep)', lineHeight: 1 }}>{shortlistedCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '4px', display: 'block' }}>{t.shortlisted}</span>
          </div>
        </div>

        {/* Card 4: Pending Docs */}
        <div
          onClick={() => setActivePage('onboarding-manager')}
          className="luxury-card"
          style={{ padding: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <FileWarning size={18} color={pendingDocsCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
            {pendingDocsCount > 0 && (
              <span className="badge badge-warning">{language === 'TH' ? 'ด่วน' : 'Pending'}</span>
            )}
          </div>
          <div style={{ marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: 'var(--color-navy-deep)', lineHeight: 1 }}>{pendingDocsCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '4px', display: 'block' }}>{t.pendingDocs}</span>
          </div>
        </div>

        {/* Card 5: Onboarding */}
        <div
          onClick={() => setActivePage('onboarding-manager')}
          className="luxury-card"
          style={{ padding: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Users2 size={18} color="var(--color-accent)" />
          </div>
          <div style={{ marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: 'var(--color-navy-deep)', lineHeight: 1 }}>{onboardingInProgressCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '4px', display: 'block' }}>{t.onboardingInProgress}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions + Chart — asymmetric 2fr / 1fr */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '28px', alignItems: 'start' }}>

        {/* Quick Actions */}
        <div>
          <p className="t-label" style={{ marginBottom: '16px' }}>{t.quickActions}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quickActionsList.map((itm, i) => {
              const ActionIcon = itm.icon;
              return (
                <button
                  key={i}
                  onClick={itm.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.3s ease-out, box-shadow 0.3s ease-out, transform 0.3s ease-out',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = 'var(--color-accent)';
                    el.style.boxShadow = '0 8px 24px rgba(41, 128, 185, 0.1)';
                    el.style.transform = 'translateX(3px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = 'var(--color-border-subtle)';
                    el.style.boxShadow = 'none';
                    el.style.transform = 'translateX(0)';
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-accent-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ActionIcon size={16} color="var(--color-accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)', margin: 0 }}>
                      {itm.titleKey}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0 0', fontWeight: 300 }}>
                      {language === 'TH' ? itm.descTh : itm.descEn}
                    </p>
                  </div>
                  <ArrowUpRight size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Match Score Chart — offset down slightly */}
        <div
          className="luxury-card"
          style={{ padding: '24px', marginTop: '36px' }}
        >
          <p className="t-label" style={{ marginBottom: '6px' }}>
            {language === 'TH' ? 'คะแนนความเหมาะสม' :
             language === 'VI' ? 'Diem phu hop' :
             language === 'ZH' ? '匹配分数' : 'Match Scores'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 300, margin: '0 0 20px 0' }}>
            {language === 'TH' ? 'ผู้สมัครปัจจุบัน' : 'Active candidates'}
          </p>
          <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '4px' }}>
            {candidates.slice(0, 6).map((cand) => {
              const h = `${Math.max(20, cand.matchScore)}%`;
              const barColor = cand.matchScore >= 85 ? 'var(--color-navy)' : cand.matchScore >= 70 ? 'var(--color-accent)' : 'var(--color-text-muted)';
              return (
                <div key={cand.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', height: h, backgroundColor: barColor, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                  <span style={{ fontSize: '8px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {cand.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Policy Notice — text-only with left border accent, no colored box */}
      <div
        style={{
          borderLeft: '3px solid var(--color-navy)',
          paddingLeft: '20px',
          paddingTop: '4px',
          paddingBottom: '4px',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-navy)', margin: '0 0 4px 0' }}>
          {language === 'TH' ? 'ข้อตกลงการใช้งาน AI (Human-in-the-Loop)' :
           language === 'VI' ? 'Thong bao chinh sach AI' :
           language === 'ZH' ? 'AI使用政策声明' : 'AI Advisory Framework'}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 300, lineHeight: 1.6, maxWidth: '680px' }}>
          {language === 'TH'
            ? 'AdminMate AI ทำหน้าที่ให้ข้อมูลเพื่อสนับสนุนการตัดสินใจเท่านั้น ระบบจะไม่ปฏิเสธผู้สมัครโดยอัตโนมัติ การตัดสินใจขั้นสุดท้ายอยู่ที่ผู้ประกอบการเสมอ'
            : language === 'VI' ? 'AdminMate AI chi ho tro quyet dinh, khong tu dong tu choi ung vien. Quyet dinh cuoi cung thuoc ve nha tuyen dung.'
            : language === 'ZH' ? 'AdminMate AI仅提供决策支持，不会自动拒绝候选人。最终决定权始终在雇主手中。'
            : 'AdminMate AI functions as a decision-support tool only. The platform never rejects candidates automatically — final hiring decisions always rest with you.'}
        </p>
      </div>

    </div>
  );
}
