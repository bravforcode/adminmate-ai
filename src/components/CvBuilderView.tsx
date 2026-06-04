import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, CV, Candidate } from '../types';
import { defaultCvTemplate } from '../mockData';
import { 
  UserSquare2, 
  Sparkles, 
  Sparkle,
  SpellCheck, 
  Download, 
  Send, 
  Layers, 
  Plus, 
  Trash2,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Link2,
  Info,
  CheckCircle2
} from 'lucide-react';

interface CvBuilderViewProps {
  language: Language;
  onApplicantSubmit: (newCandidate: Candidate) => void;
}

export default function CvBuilderView({ language, onApplicantSubmit }: CvBuilderViewProps) {
  const t = translations[language];

  // CV Builder Form State
  const [cv, setCv] = useState<CV>(defaultCvTemplate);
  const [isImproving, setIsImproving] = useState(false);
  const [improveSuccess, setImproveSuccess] = useState(false);

  // Quick autofill template
  const handleGenerateWithAi = () => {
    setCv({
      fullName: language === 'TH' ? 'ดนัย นครปฐม (Danai Nakhon)' : 'Danai Nakhon',
      email: 'danai.n@outlook.com',
      phone: '086-112-2334',
      targetPosition: 'Sales Executive',
      summary: language === 'TH' 
        ? 'ผู้เชี่ยวชาญด้านการขาย B2B ที่มุ่งเน้นผลลัพธ์ ประสบการณ์ 3 ปีในการบริการลูกค้าองค์กรขนาดใหญ่ และการเจรจาต่อรองให้บรรลุเป้าหมายที่ท้าทาย' 
        : 'Result-oriented B2B Sales Professional with 3 years of experience managing high-growth enterprise SaaS pipelines and closing challenging SME services.',
      workExperience: [
        {
          company: language === 'TH' ? 'ริช มีเดีย คอร์ป' : 'Rich Media Corp Thailand',
          role: language === 'TH' ? 'ที่ปรึกษาด้านการขายองค์กร' : 'Outbound Corporate Consultant',
          duration: '2024 - 2026',
          details: language === 'TH' 
            ? 'ดูแลการขายแพลตฟอร์มการวิเคราะห์โฆษณา คอนเวอร์ชันเรทสูงสุด 12% ในไตรมาสแรก ประวัติน่าเชื่อถือ' 
            : 'Successfully expanded software subscriptions by 35% across SME retail networks. Integrated HubSpot CRM frameworks.'
        }
      ],
      education: [
        {
          school: language === 'TH' ? 'มหาวิทยาลัยเชียงใหม่' : 'Chiang Mai University',
          degree: language === 'TH' ? 'วิทยาศาสตรบัณฑิต (การทำตลาด)' : 'B.Sc. in Business Administration',
          year: '2024'
        }
      ],
      skills: ['B2B Sales', 'Negotiation', 'CRM Systems', 'HubSpot', 'Communication', 'Bilingual'],
      portfolioLink: 'https://linkedin.com/in/danai-sales',
      language: language
    });
    alert(
      language === 'TH'
        ? 'เขียนพรีเมียม CV ด้วยปัญญาประดิษฐ์จำลองสำเร็จแล้ว! สามารถปรับแก้รายละเอียดต่อในแท็บพรีวิวขวาซ้ายได้เลย'
        : 'Generated optimized developer/consultant CV template!'
    );
  };

  // Improve CV action (simulates keyword landing alignment)
  const handleImproveCvForJd = () => {
    setIsImproving(true);
    setTimeout(() => {
      setIsImproving(false);
      setImproveSuccess(true);
      
      // Update summary or skills to optimize score metrics
      setCv(prev => ({
        ...prev,
        summary: language === 'TH' 
          ? `*** ผ่านการวิเคราะห์ความเหมาะสมโดย AI *** ${prev.summary} มีความรู้เด่นชัดในเรื่อง Facebook Ads และเครื่องมือ Canva สะท้อนทักษะการทำแคมเปญตรงหน้างาน`
          : `*** Optimized by AdminMate AI *** ${prev.summary} Integrates core capabilities in Facebook Ads, direct-response metrics, Canva mockup workflows, and SME growth frameworks.`,
        skills: Array.from(new Set([...prev.skills, 'Facebook Ads', 'Canva Optimization', 'SEO Copywriting']))
      }));

      alert(
        language === 'TH'
          ? 'ปรับแต่ง CV ให้สอดคล้องกับพารามิเตอร์คีย์เวิร์ดของบริษัทเรียบร้อย! คะแนนแมตช์ความเหมาะสมเพิ่มขึ้น (+18%)'
          : 'CV aligned structure optimally with open Job Descriptions! Skills updated (+18% match projection).'
      );
      setTimeout(() => setImproveSuccess(false), 3000);
    }, 700);
  };

  // Spelling check simulation
  const handleCheckSpelling = () => {
    alert(
      language === 'TH'
        ? 'ตรวจทานอักขระอักษร: ตรวจสอบไม่พบคำผิดทั้งในส่วนภาษาไทยและอังกฤษ มีความถูกต้องละเมียดละไมพร้อมยื่นบริษัทข้ามชาติ'
        : 'Spelling Scan Complete: 100% correct spelling & grammar verified in Thai and English!'
    );
  };

  // Convert CV fields to Candidate database model and push to pipeline
  const handleSubmitToJob = () => {
    const score = Math.floor(Math.random() * 15) + 81; // Random professional score between 81 - 95%
    const applicantCandidate: Candidate = {
      id: `cand-app-${Date.now()}`,
      name: `${cv.fullName} (คุณ)`,
      positionApplied: cv.targetPosition || 'Sales Executive',
      skills: cv.skills,
      experience: cv.workExperience.map(ex => `${ex.role} at ${ex.company}`).join(', ') || '1 year generic experiences',
      education: cv.education.map(ed => `${ed.degree}, ${ed.school}`).join('; ') || 'High school certified',
      aiSummary: language === 'TH'
        ? `ผู้สมัครประวัติย่อแบบโปรแกรมเมอร์/เซลส์วิเคราะห์อัจฉริยะ ความเหมาะสมสูงที่ระดับ ${score}% มีใบคุณสมบัติยื่นเข้าตรงผ่าน Applicant Toolbox`
        : `Applicant-submitted profile via toolbox. Optimized with direct-response keywords. Match index projection is robust at ${score}%.`,
      matchScore: score,
      status: 'New',
      notes: `Target Candidate. Hand-submitted CV portfolio URL: ${cv.portfolioLink}. Contact email: ${cv.email}`,
      email: cv.email,
      phone: cv.phone
    };

    onApplicantSubmit(applicantCandidate);
    alert(
      language === 'TH'
        ? `ส่งใบสมัคร (CV) สำเร็จแล้ว! ประวัติย่อของคุณได้เข้าไปอยู่ในกระดานรับสมัคร "เส้นทางการรับสมัคร" และระบบสแกนฝั่ง HR เรียบร้อย ทดลองคลิกแถบ "ระบบผู้ประกอบการ SME" ด้านบนเพื่อดูชื่อของคุณได้ทันที!`
        : `CV Submitted successfully! Your profile has officially landed in the "Hiring Pipeline" and HR screening desk. Click "SME HR Suite" in the navbar above to inspect your custom card!`
    );
  };

  // Modify nested details handlers
  const handleWorkExperienceChange = (index: number, field: string, value: string) => {
    setCv(prev => {
      const updated = [...prev.workExperience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workExperience: updated };
    });
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    setCv(prev => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const handleAddField = (type: 'experience' | 'education') => {
    setCv(prev => {
      if (type === 'experience') {
        return {
          ...prev,
          workExperience: [
            ...prev.workExperience,
            { company: 'New Company Inc.', role: 'Specialist', duration: '1 Year', details: 'Core duties accomplished' }
          ]
        };
      } else {
        return {
          ...prev,
          education: [
            ...prev.education,
            { school: 'New Academy', degree: 'Bachelor Degree', year: '2025' }
          ]
        };
      }
    });
  };

  const handleRemoveField = (type: 'experience' | 'education', index: number) => {
    setCv(prev => {
      if (type === 'experience') {
        const updated = [...prev.workExperience];
        updated.splice(index, 1);
        return { ...prev, workExperience: updated };
      } else {
        const updated = [...prev.education];
        updated.splice(index, 1);
        return { ...prev, education: updated };
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
            <UserSquare2 className="h-7 w-7 text-indigo-600" />
            {t.cvBuilder}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {language === 'TH'
              ? 'กรอกแบบฟอร์มประวัติการทำงานของคุณ ขัดเกภาษาด้วย AI ปรับให้พารามิเตอร์ตรงกับบริษัทที่เราประกาศรับสมัคร และยื่นประกวดเข้าบอร์ด HR ได้ทันที'
              : 'Write and publish your career bio. Enhance your summary vocabulary & submit digitally to our active SME recruiter board.'}
          </p>
        </div>

        {/* AI quick controls top header row */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateWithAi}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-750 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-97 cursor-pointer transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {language === 'TH' ? 'ให้ AI เขียนให้อัตโนมัติ' : 'Generate with AI'}
          </button>
          
          <button
            onClick={handleImproveCvForJd}
            disabled={isImproving}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-150 active:scale-97 cursor-pointer transition-all"
          >
            <Sparkle className="h-3.5 w-3.5 text-purple-600" />
            {isImproving ? 'Improving...' : (language === 'TH' ? 'เพิ่มทักษะเปรียบเทียบ (Improve CV)' : 'Align with Job Specs')}
          </button>

          <button
            onClick={handleCheckSpelling}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-250 active:scale-97 cursor-pointer transition-all"
          >
            <SpellCheck className="h-3.5 w-3.5 text-slate-500" />
            {language === 'TH' ? 'ตรวจคำผิด' : 'Check Spelling'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left pane: Inputs form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
            {language === 'TH' ? 'รายละเอียดประกาศเกียรติคุณข้อมูล' : 'Personal Biography Parameters'}
          </h3>

          <div className="space-y-4">
            
            {/* Row 1: Name and Job */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={cv.fullName}
                  onChange={(e) => setCv({ ...cv, fullName: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Target Position</label>
                <input
                  type="text"
                  value={cv.targetPosition}
                  onChange={(e) => setCv({ ...cv, targetPosition: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6]"
                />
              </div>
            </div>

            {/* Row 2: Contact info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={cv.email}
                  onChange={(e) => setCv({ ...cv, email: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={cv.phone}
                  onChange={(e) => setCv({ ...cv, phone: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6]"
                />
              </div>
            </div>

            {/* Portfolio */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Portfolio & LinkedIn Link</label>
              <input
                type="text"
                value={cv.portfolioLink}
                onChange={(e) => setCv({ ...cv, portfolioLink: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6]"
              />
            </div>

            {/* Executive summary */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Professional Summary</label>
              <textarea
                value={cv.summary}
                onChange={(e) => setCv({ ...cv, summary: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#3b82f6] leading-relaxed"
              ></textarea>
            </div>

            {/* Dynamic Work Experience */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Work History</label>
                <button
                  type="button"
                  onClick={() => handleAddField('experience')}
                  className="text-[10px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.addMore}
                </button>
              </div>

              {cv.workExperience.map((ex, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 relative space-y-3">
                  <button
                    type="button"
                    onClick={() => handleRemoveField('experience', idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Company"
                        value={ex.company}
                        onChange={(e) => handleWorkExperienceChange(idx, 'company', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Role"
                        value={ex.role}
                        onChange={(e) => handleWorkExperienceChange(idx, 'role', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Duration"
                        value={ex.duration}
                        onChange={(e) => handleWorkExperienceChange(idx, 'duration', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Achieved outcomes & core duties"
                      value={ex.details}
                      onChange={(e) => handleWorkExperienceChange(idx, 'details', e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Academics */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide font-sans">Education Details</label>
                <button
                  type="button"
                  onClick={() => handleAddField('education')}
                  className="text-[10px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.addMore}
                </button>
              </div>

              {cv.education.map((ed, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 relative space-y-3">
                  <button
                    type="button"
                    onClick={() => handleRemoveField('education', idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="School/University"
                        value={ed.school}
                        onChange={(e) => handleEducationChange(idx, 'school', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Degree"
                        value={ed.degree}
                        onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Graduation Year"
                        value={ed.year}
                        onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills chip manager */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">Technical Skills (comma-separated)</label>
              <input
                type="text"
                value={cv.skills.join(', ')}
                onChange={(e) => setCv({ ...cv, skills: e.target.value.split(',').map(s => s.trim()) })}
                className="block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-indigo-600"
                placeholder="Meta Ads, Photoshop, Sales Automation"
              />
            </div>

          </div>
        </div>

        {/* Right pane: LIVE PREVIEW & Submission card */}
        <div className="space-y-6">
          
          {/* Paper CV Preview Mockup */}
          <div className="bg-white p-8 rounded-2xl border-4 border-slate-200 shadow-xl relative select-text">
            
            {/* Branding badge watermark */}
            <div className="absolute top-4 right-4 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 text-[9px] font-bold text-indigo-600 leading-normal select-none">
              AdminMate Draft Format
            </div>

            {/* CV Title Header */}
            <div className="border-b-2 border-slate-950 pb-5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{cv.fullName || "Your Full Name"}</h2>
              <span className="font-mono text-xs text-indigo-600 font-extrabold tracking-wide uppercase mt-1 block">
                {cv.targetPosition || "Target Job Title"}
              </span>

              {/* Contacts row */}
              <div className="mt-3 flex flex-wrap gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold font-mono">
                {cv.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {cv.email}
                  </span>
                )}
                {cv.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {cv.phone}
                  </span>
                )}
                {cv.portfolioLink && (
                  <a href={cv.portfolioLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 underline">
                    <Link2 className="h-3 w-3" />
                    Portfolio/LinkedIn
                  </a>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="py-5 border-b border-slate-100">
              <p className="text-xs text-slate-700 leading-relaxed font-semibold italic text-justify">
                "{cv.summary || "No summary written yet."}"
              </p>
            </div>

            {/* Careers work experiences */}
            <div className="py-5 border-b border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-slate-600" />
                {language === 'TH' ? 'ประวัติส่วนประวัติงาน' : 'Professional Work Experience'}
              </h4>

              {cv.workExperience.some(ex => ex.company) ? (
                <div className="space-y-4">
                  {cv.workExperience.map((ex, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{ex.role} — <span className="text-slate-500 font-medium">{ex.company}</span></span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">{ex.duration}</span>
                      </div>
                      <p className="mt-1 text-slate-600 font-semibold leading-relaxed">
                        ▪️ {ex.details}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium italic">No work history registered.</p>
              )}
            </div>

            {/* Education details */}
            <div className="py-5 border-b border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-slate-600" />
                {language === 'TH' ? 'วุฒิการศึกษาสามัญ' : 'Academic History & Certification'}
              </h4>

              {cv.education.some(ed => ed.school) ? (
                <div className="space-y-3">
                  {cv.education.map((ed, i) => (
                    <div key={i} className="text-xs flex justify-between">
                      <span className="font-bold text-slate-800">
                        {ed.degree} <span className="font-normal text-slate-400">— {ed.school}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{ed.year}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium italic">No academic history registered.</p>
              )}
            </div>

            {/* Skills tags */}
            <div className="py-5">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
                {language === 'TH' ? 'กล่องทักษะความชำนาญ' : 'Strategic Area of Expertise'}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.some(s => s) ? (
                  cv.skills.map((sk, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100/80 rounded border border-slate-200 text-[10px] font-mono font-extrabold text-slate-700">
                      {sk}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium italic">No specialized tags listed.</span>
                )}
              </div>
            </div>

          </div>

          {/* Real PDF Export / Direct company submission Panel */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-5 border border-slate-800 relative overflow-hidden">
            
            {/* Absolute accent light glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                {language === 'TH' ? 'ส่งออกและยื่นผลงานตรงเข้าบอร์ด HR' : 'Deploy & Submit Directly'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                {language === 'TH'
                  ? 'คุณสามารถดาวน์โหลดเอกสารประวัติแบบ PDF เก็บไว้คู่ตัว หรือกดปุ่ม "ยื่นใบสมัครงาน" เพื่อท้านัดสัมภาษณ์เข้าระบบทดลองฝั่ง SME แอดมินได้เลย!'
                  : 'Download CV to physical folders, or click below to submit. Submitting appends this CV to the active applicant database instantly.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              
              {/* Trigger print download */}
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 cursor-pointer active:scale-98 transition-all"
              >
                <Download className="h-4 w-4 text-slate-400" />
                {language === 'TH' ? 'พิมพ์ไฟล์ / PDF' : 'Print / Export PDF'}
              </button>

              {/* Append candidate entry to memory */}
              <button
                type="button"
                onClick={handleSubmitToJob}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900 cursor-pointer active:scale-98 transition-all"
              >
                <Send className="h-4 w-4" />
                {language === 'TH' ? 'ยื่นใบสมัครเข้าบริษัท' : 'Submit CV to SME'}
              </button>

            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-indigo-400 flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                {language === 'TH'
                  ? 'แนะนำเพิ่มเติม: เมื่อส่งแล้ว ระบบจะปรับความเหมาะสมและเพิ่มแถบชื่อคุณเข้าไปอยู่ในกระดานรับสมัคร เส้นทางสมบูรณ์!'
                  : 'Note: Submitting this profile simulates a new applicant addition. You can toggle roles above to see your details in action!'}
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
