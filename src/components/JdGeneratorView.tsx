import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, Job } from '../types';
import { FileText, Sparkles, Copy, Check, Info, FileEdit } from 'lucide-react';

interface JdGeneratorViewProps {
  language: Language;
  onAddJob: (job: Job) => void;
}

export default function JdGeneratorView({ language, onAddJob }: JdGeneratorViewProps) {
  const t = translations[language];

  // Form State
  const [jobTitle, setJobTitle] = useState('Sales Executive');
  const [department, setDepartment] = useState('Sales & Business Development');
  const [experienceLevel, setExperienceLevel] = useState('1-3 Years');
  const [salaryRange, setSalaryRange] = useState('35,000 - 50,000 THB');
  const [jobType, setJobType] = useState('Full-time');
  const [responsibilities, setResponsibilities] = useState('Manage customer relationships, find new leads, and close deals.');
  const [requiredSkills, setRequiredSkills] = useState('B2B Sales, CRM, Communication, Negotiation');
  const [outputLanguage, setOutputLanguage] = useState<Language>('EN');

  // Generation status
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  const handlePreFill = (role: 'sales' | 'marketing') => {
    if (role === 'sales') {
      setJobTitle('Sales Executive');
      setDepartment('Sales & Business Development');
      setExperienceLevel('1-3 Years');
      setSalaryRange('35,000 - 50,000 THB');
      setJobType('Full-time');
      setResponsibilities('Manage customer relationships, discover weekly target leads, conduct phone consultations, and close software deals.');
      setRequiredSkills('B2B Sales, CRM tools, Public Speaking, Outbound Calling');
      setOutputLanguage('EN');
    } else {
      setJobTitle('Marketing Specialist');
      setDepartment('Marketing & PR');
      setExperienceLevel('2-5 Years');
      setSalaryRange('45,000 - 65,000 THB');
      setJobType('Hybrid');
      setResponsibilities('รับผิดชอบวางเป้าหมายโฆษณา Facebook Ads, คิดแคมเปญ TikTok และสร้างคอนเทนต์สำหรับ SME');
      setRequiredSkills('Facebook Ads, Canva Design, Content Writing, CapCut');
      setOutputLanguage('TH');
    }
  };

  const cleanGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCopied(false);

    // Simulate smart AI copywriting compilation
    setTimeout(() => {
      setIsLoading(false);

      const headerText = outputLanguage === 'EN' 
        ? `🔥 JOB POSITION: ${jobTitle} (${jobType})\n📍 Department: ${department}\n💼 Experience Required: ${experienceLevel}\n💰 Compensation Budget: ${salaryRange}\n\n=================================\n✨ ABOUT THE ROLE\n=================================\nWe are looking for a talented ${jobTitle} who can join our growing team. The ideal professional fits our entrepreneurial SME culture and displays a results-oriented attitude.\n\n🎯 MAIN KEY RESPONSIBILITIES:\n${responsibilities.split(',').map((r, idx) => `  ${idx + 1}. ${r.trim()}`).join('\n')}\n\n🛠️ CORE SKILLS & QUALIFICATIONS REQUIRED:\n${requiredSkills.split(',').map((s, idx) => `  ▪️ ${s.trim()}`).join('\n')}\n\n📢 WHY WORK WITH US?\n- Agile startup working environment with low bureaucracy\n- Performance-based commissions and flexible hybrid allowances\n- High-velocity learning with modern AI tooling.`
        : `🔥 ตำแหน่งงาน: ${jobTitle} (${jobType === 'Full-time' ? 'งานประจำ' : 'งานแบบไฮบริด'})\n📍 แผนก: ${department}\n💼 ประสบการณ์ที่ต้องการ: ${experienceLevel}\n💰 อัตราเงินเดือน: ${salaryRange}\n\n=================================\n✨ รายละเอียดเกี่ยวกับงานวิชาชีพ\n=================================\nเรากำลังมองหา ${jobTitle} ที่พร้อมจะเติบโตและลุยไปกับทีมงาน SME ของเรา พนักงานจะได้รับการสนับสนุนระบบเทคโนโลยีเต็มสูบ พร้อมผลประโยชน์ก้าวหน้าตามผลงาน\n\n🎯 หน้าที่ความรับผิดชอบหลัก:\n${responsibilities.split(',').map((r, idx) => `  ${idx + 1}. ${r.trim()}`).join('\n')}\n\n🛠️ คุณสมบัติและทักษะที่จำเป็น:\n${requiredSkills.split(',').map((s, idx) => `  ▪️ ${s.trim()}`).join('\n')}\n\n📢 สิทธิประโยชน์และสวัสดิการ:\n- บรรยากาศการทำงานแบบยืดหยุ่น สูงด้วยนวัตกรรมคล่องตัวสูง\n- โบนัสตามเป้าหมายยอดจ้าง พร้อมกองทุนสนับสนุนพัฒนาทักษะตนเอง\n- มีงบอาหารกลางวัน และสิทธิ์ทำงานกึ่งทางไกลในบางสัปดาห์`;

      setGeneratedText(headerText);

      // Trigger automatic save inside employer board state so it updates dashboard / creation listings in real-time!
      onAddJob({
        id: `job-gen-${Date.now()}`,
        title: jobTitle,
        department,
        experienceLevel,
        salaryRange,
        jobType,
        responsibilities: responsibilities.split(',').map(r => r.trim()),
        skills: requiredSkills.split(',').map(s => s.trim()),
        createdAt: new Date().toISOString().split('T')[0],
        language: outputLanguage
      });

    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-350 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <FileText className="h-7 w-7 text-indigo-600" />
          {t.jdGenerator}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'ยกร่างคำเขียนคัดสรร ทักษะที่ต้องการของพนักงาน และใช้ AI เขียนแบบฟอร์มประกาศงานทันทีในภาษาไทยหรืออังกฤษ'
            : 'Formulate core requirements, define departments, and compile formal recruiting drafts in Thai or English.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Input Fields */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          
          {/* Quick presets buttons */}
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {language === 'TH' ? 'คลิกเลือกเทมเพลตตั้งต้นด่วน' : 'Quick Demo Templates'}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePreFill('sales')}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-100 cursor-pointer"
              >
                💼 Sales Executive (EN)
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('marketing')}
                className="px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-100 cursor-pointer"
              >
                📱 Marketing Specialist (TH)
              </button>
            </div>
          </div>

          <form onSubmit={cleanGenerate} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'ตำแหน่งงาน' : 'Job Title'}
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'แผนก' : 'Department'}
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'ประสบการณ์พนักงาน' : 'Experience Level'}
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="No experience">No experience / Freshers</option>
                  <option value="1-3 Years">Junior (1-3 Years)</option>
                  <option value="2-5 Years">Mid-level (2-5 Years)</option>
                  <option value="5+ Years">Senior Executive (5+ Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'ช่วงเงินเดือน (THB)' : 'Salary Range'}
                </label>
                <input
                  type="text"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 30,000 - 45,000 THB"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'รูปแบบการจ้าง' : 'Job Type'}
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract Worker</option>
                  <option value="Hybrid">Hybrid Office</option>
                  <option value="Remote">100% Remote</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'TH' ? 'ภาษาออกเอกสาร' : 'Output JD Language'}
                </label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOutputLanguage('TH')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      outputLanguage === 'TH'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ไทย
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputLanguage('EN')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      outputLanguage === 'EN'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                {language === 'TH' ? 'หน้าที่หลักที่ต้องรับผิดชอบ (คั่นด้วยจุลภาค)' : 'Main Responsibilities (comma-separated)'}
              </label>
              <textarea
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                rows={3}
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={language === 'TH' ? 'หางานใหม่, รักษาฐานเคาเตอร์, เจรจาอัตรากำไร' : 'e.g. Manage client CRM, find outbound target leads'}
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                {language === 'TH' ? 'ทักษะที่กำหนด (คั่นด้วยจุลภาค)' : 'Required Skills (comma-separated)'}
              </label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. B2B Sales, Negotiation, CRM Tools"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm active:scale-99 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? (language === 'TH' ? 'กำลังยกร่างรายละเอียด...' : 'Drafting with AI...') : (language === 'TH' ? 'สร้างเอกสารสเปกงาน (Generate JD)' : 'Generate Official JD')}
            </button>

          </form>

        </div>

        {/* Right Output Draft */}
        <div className="lg:col-span-3 flex flex-col h-full bg-slate-100 rounded-2xl border border-slate-250/60 overflow-hidden relative min-h-[400px]">
          
          <div className="p-4 bg-white border-b border-slate-200/60 flex justify-between items-center">
            <span className="flex items-center gap-2 font-black text-slate-900 text-xs">
              <Sparkles className="h-4 w-4 text-purple-600 animate-bounce" />
              {language === 'TH' ? 'ใบเสนอคุณสมบัติพนักงานที่สร้างโดย AI' : 'AI-Assembled Job Description Draft'}
            </span>
            {generatedText && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{language === 'TH' ? 'คัดลอกแล้ว!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{language === 'TH' ? 'คัดลอกดิบ' : 'Copy'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 p-6 font-mono text-xs text-slate-800 leading-relaxed overflow-y-auto whitespace-pre-wrap select-text bg-slate-950 text-slate-200">
            {generatedText ? (
              generatedText
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 pointer-events-none p-4">
                <FileEdit className="h-12 w-12 text-slate-700" />
                <p className="font-bold text-slate-400">
                  {language === 'TH' ? 'กรุณากรอกฟอร์มแล้วกด "สร้างแผนงาน (Generate JD)"' : 'Fill out requirements on the left to invoke simulated draft creation.'}
                </p>
                <p className="text-[11px] text-slate-600 max-w-xs leading-normal">
                  {language === 'TH' 
                    ? 'เอกสารที่ได้รับการอนุมัติระบบจะเชื่อมต่อเข้าไปเก็บบนคลังประกาศรับคนทันทีโดยอัตโนมัติ' 
                    : 'Generated items will be instantly saved in the SME memory context for cross-matching.'}
                </p>
              </div>
            )}
          </div>
          
          <div className="p-3.5 bg-slate-900 text-[10px] text-slate-400 border-t border-slate-800 flex items-center gap-2 font-sans">
            <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>
              {language === 'TH'
                ? 'กระบวนการได้รับการบันทึกไปยัง SME database (Open Jobs) แล้ว เพื่อใช้เปรียบเทียบในหน้าระบบสแกนเรซูเม'
                : 'Form submission automatically appends this post config to the dynamic "Open Jobs" database.'}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
