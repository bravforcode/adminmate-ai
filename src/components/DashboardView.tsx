import React from 'react';
import { translations } from '../translations';
import { Language, Page, Job, Candidate } from '../types';
import { 
  PlusCircle, 
  Briefcase, 
  UserPlus, 
  CheckCircle2, 
  FileWarning, 
  Users2, 
  ArrowUpRight, 
  Rocket, 
  AlertCircle,
  FileCheck2,
  ListTodo
} from 'lucide-react';

interface DashboardViewProps {
  language: Language;
  jobs: Job[];
  candidates: Candidate[];
  pendingDocsCount: number;
  onboardingInProgressCount: number;
  setActivePage: (page: Page) => void;
  setUserRole: (role: 'Owner' | 'HR' | 'Admin' | 'Applicant') => void;
}

export default function DashboardView({
  language,
  jobs,
  candidates,
  pendingDocsCount,
  onboardingInProgressCount,
  setActivePage,
  setUserRole
}: DashboardViewProps) {
  const t = translations[language];

  // Derive stats
  const openJobsCount = jobs.length;
  const newCandidatesCount = candidates.filter(c => c.status === 'New').length;
  const shortlistedCount = candidates.filter(c => c.status === 'Shortlisted').length;

  const quickActionsList = [
    {
      titleEn: "Create Job Description",
      titleTh: "เขียนกติกาคำอธิบายงาน (JD)",
      descEn: "Define requirements & let AI generate standard English/Thai JD",
      descTh: "กำหนดหัวข้อเพื่อให้ AI สร้างรายระเอียดใบสมัครงานอัจฉริยะ",
      color: "from-blue-500 to-indigo-600",
      icon: PlusCircle,
      action: () => setActivePage('jd-generator')
    },
    {
      titleEn: "Screen Uploaded Resume",
      titleTh: "สแกนคัดกรองเรซูเมผู้สมัคร",
      descEn: "Upload resume files & calculate AI match score comparison",
      descTh: "อัปโหลดและประเมินทักษะของผู้สมัครเทียบกับเกณฑ์บริษัท",
      color: "from-purple-500 to-pink-600",
      icon: UserPlus,
      action: () => setActivePage('resume-upload')
    },
    {
      titleEn: "Build CV (Test Applicant Side)",
      titleTh: "เขียนและพัฒนา CV (ทดลองมุมผู้สมัคร)",
      descEn: "Add target position and skills to export custom formatted PDF",
      descTh: "สร้างประวัติย่อ ปรับปรุงคำศัพท์ และยื่นจำลองสมัครเข้าบอร์ดบริษัท",
      color: "from-emerald-500 to-teal-600",
      icon: Rocket,
      action: () => {
        setUserRole('Applicant');
        setActivePage('cv-builder');
      }
    },
    {
      titleEn: "Generate Onboarding Checklist",
      titleTh: "จัดทำแผนเตรียมตัวพนักงานใหม่",
      descEn: "Inspect document status, contracts, or send urgent email reminders",
      descTh: "ตรวจสอบคลังเอกสาร สัญญาการจ้างงาน และรับการแจ้งเตือนพนักงาน",
      color: "from-amber-500 to-orange-600",
      icon: ListTodo,
      action: () => setActivePage('onboarding-manager')
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl">
            {language === 'TH' ? 'ระบบภาพรวมผู้ประกอบการ' : 'SME HR Executive Hub'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {language === 'TH' 
              ? 'ระบบวิเคราะห์ข้อมูล รับสมัครบุคลากร และแอดมินสำหรับธุรกิจ SME ในระบบเดียว' 
              : 'AdminMate AI integrated hiring pipeline, CV matcher & onboarding solution for your small business.'}
          </p>
        </div>
        
        {/* Date Stamp */}
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-2xs flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono font-semibold text-slate-600">
            {new Date().toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Open jobs */}
        <div 
          onClick={() => setActivePage('settings')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-indigo-200 active:scale-98 cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-indigo-50 rounded-xl">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              LIVE
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{openJobsCount}</span>
            <span className="text-xs font-medium text-slate-500">{t.openJobs}</span>
          </div>
        </div>

        {/* Card 2: New applicants */}
        <div 
          onClick={() => setActivePage('pipeline')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-purple-200 active:scale-98 cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-purple-50 rounded-xl">
              <UserPlus className="h-5 w-5 text-purple-600" />
            </span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
              +NEW
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{newCandidatesCount}</span>
            <span className="text-xs font-medium text-slate-500">{t.newApplicants}</span>
          </div>
        </div>

        {/* Card 3: Shortlisted candidates */}
        <div 
          onClick={() => setActivePage('pipeline')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-emerald-250 active:scale-98 cursor-pointer transition-all flex flex-col justify-between col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {language === 'TH' ? 'ผ่านเกณฑ์' : 'Qualified'}
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{shortlistedCount}</span>
            <span className="text-xs font-medium text-slate-500">{t.shortlisted}</span>
          </div>
        </div>

        {/* Card 4: Pending documents */}
        <div 
          onClick={() => setActivePage('onboarding-manager')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-amber-200 active:scale-98 cursor-pointer transition-all flex flex-col justify-between col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-amber-50 rounded-xl">
              <FileWarning className="h-5 w-5 text-amber-600" />
            </span>
            {pendingDocsCount > 0 ? (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md animate-pulse">
                {language === 'TH' ? 'ด่วน' : 'ALERT'}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                OK
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{pendingDocsCount}</span>
            <span className="text-xs font-medium text-slate-500">{t.pendingDocs}</span>
          </div>
        </div>

        {/* Card 5: Onboarding in progress */}
        <div 
          onClick={() => setActivePage('onboarding-manager')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-cyan-200 active:scale-98 cursor-pointer transition-all flex flex-col justify-between col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 bg-cyan-50 rounded-xl">
              <Users2 className="h-5 w-5 text-cyan-600" />
            </span>
            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded-md">
              {language === 'TH' ? 'เริ่มงาน' : 'Active'}
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{onboardingInProgressCount}</span>
            <span className="text-xs font-medium text-slate-500">{t.onboardingInProgress}</span>
          </div>
        </div>

      </div>

      {/* BENTO GRID: Quick Actions & Custom Analytics Graphic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-indigo-600" />
            {t.quickActions}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActionsList.map((itm, i) => {
              const ActionIcon = itm.icon;
              return (
                <button
                  key={i}
                  onClick={itm.action}
                  className="group relative flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:shadow-md hover:border-slate-200 transition-all text-left overflow-hidden cursor-pointer"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${itm.color} text-white shadow-xs group-hover:scale-105 transition-transform`}>
                    <ActionIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                      {language === 'TH' ? itm.titleTh : itm.titleEn}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all text-indigo-500" />
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-normal">
                      {language === 'TH' ? itm.descTh : itm.descEn}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Visual Analytics Graphic widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {language === 'TH' ? 'คะแนนแมตช์เรซูเมเปรียบเทียบเฉลี่ย' : 'Average AI Match Distribution'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'TH' ? 'อัตราความสอดคล้องของผู้สมัครประจำสัปดาห์นี้' : 'Hiring alignment scores evaluated for active roles.'}
            </p>
          </div>

          {/* Interactive Custom SVG Bar graph mimicking professional charts */}
          <div className="my-6 relative h-36 flex items-end justify-between px-1 border-b border-slate-100 pb-1">
            
            {/* Guide grid lines */}
            <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-slate-100"></div>
            <div className="absolute inset-x-0 bottom-2/4 border-b border-dashed border-slate-100"></div>
            <div className="absolute inset-x-0 bottom-3/4 border-b border-dashed border-slate-100"></div>

            {candidates.map((cand, idx) => {
              // Map scores from candidates
              const heightPct = `${Math.max(25, cand.matchScore)}%`;
              const scoreColor = cand.matchScore >= 85 ? 'bg-indigo-500' : cand.matchScore >= 70 ? 'bg-emerald-500' : 'bg-amber-500';
              return (
                <div key={cand.id} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 bg-slate-950 text-white rounded px-1.5 py-0.5 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                    {cand.name.split(' ')[0]}: {cand.matchScore}%
                  </div>
                  {/* Column bar */}
                  <div 
                    className={`w-4 sm:w-6 ${scoreColor} rounded-t-xs hover:brightness-105 transition-all shadow-2xs`}
                    style={{ height: heightPct }}
                  ></div>
                  <span className="text-[9px] text-slate-400 font-bold tracking-tight text-center truncate w-12 mt-1">
                    {cand.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
              {language === 'TH' ? 'ดีเยี่ยม' : 'Excellent (85%+)'}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              {language === 'TH' ? 'ผ่านเกณฑ์' : 'Qualified (70%-84%)'}
            </span>
          </div>
        </div>

      </div>

      {/* Notice Board Area regarding SME Assistance guidelines */}
      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-indigo-900">
            {language === 'TH' ? 'ข้อตกลงในการสนับสนุนคำตัดสิน (Human-in-the-Loop AI)' : 'Supportive Assistant Framework Statement'}
          </p>
          <p className="text-indigo-700 font-medium mt-0.5 leading-relaxed">
            {language === 'TH' 
              ? 'ระบบพนักงานปัญญาประดิษฐ์ AdminMate AI ทำหน้าที่ให้ข้อมูลสแกนคัดสรร และประมวลความเหมาะสมเพื่ออํานวยความสะดวกแก่ผู้ประกอบการเท่านั้น โดยระบบจะไม่มีนโยบายปฏิเสธผู้รับเข้าทำงานโดยประมวลผลอัตโนมัติ เพื่อคุ้มครองความหลากหลายในการจ้างงานอย่างเท่าเทียม'
              : 'AdminMate AI functions purely as a decision-support copilot for screening, analysis, and draft preparation. The platform never rejects candidates automatically; final decisions are always preserved for SME builders.'}
          </p>
        </div>
      </div>

    </div>
  );
}
