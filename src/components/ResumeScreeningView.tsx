import React, { useState, useRef } from 'react';
import { translations } from '../translations';
import { Language, Candidate, CompareMatch } from '../types';
import { sampleCompareMatch } from '../mockData';
import { 
  Upload, 
  Check, 
  AlertTriangle, 
  Award, 
  ChevronRight, 
  Briefcase, 
  GraduationCap, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ResumeScreeningViewProps {
  language: Language;
  candidates: Candidate[];
  onUploadCandidate: (candidate: Candidate) => void;
  onUpdateStatus: (id: string, status: Candidate['status']) => void;
}

export default function ResumeScreeningView({
  language,
  candidates,
  onUploadCandidate,
  onUpdateStatus
}: ResumeScreeningViewProps) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter state
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Trigger active calculations
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  const comparoData: CompareMatch | null = selectedCandidate 
    ? sampleCompareMatch(selectedCandidate.positionApplied, selectedCandidate.name)
    : null;

  // Simulate file uploads
  const handleSimulatedUpload = (fileName: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);

      // Randomize newly generated mock resume properties based on position
      const isSales = Math.random() > 0.5;
      const newCand: Candidate = isSales 
        ? {
            id: `cand-${Date.now()}`,
            name: language === 'TH' ? 'กิตติ สมดี (Kitti Somdee)' : 'Kitti Somdee',
            positionApplied: 'Sales Executive',
            skills: ['B2B Sales', 'Negotiation', 'CRM', 'English'],
            experience: '4 years of telecommunications sales representative',
            education: 'B.A. in Marketing, Bangkok University',
            aiSummary: 'Extremely high energy profile. Shows solid history with customer relationship software and telecom contract negotiations.',
            matchScore: 91,
            status: 'New',
            notes: 'Successfully uploaded and screened via ' + fileName,
            email: 'kitti.s@outlook.com',
            phone: '081-334-4556'
          }
        : {
            id: `cand-${Date.now()}`,
            name: language === 'TH' ? 'วรัญญา รักษ์ดี (Waranya Rakdee)' : 'Waranya Rakdee',
            positionApplied: 'Marketing Specialist',
            skills: ['Facebook Ads', 'Canva', 'Content Writing', 'Mailchimp', 'Klayvio'],
            experience: '18 months of e-commerce brand copywriting',
            education: 'Bachelor of Communication Arts, Chiang Mai University',
            aiSummary: 'Highly creative portfolio with conversion copywriting expertise. Great technical setup of newsletters & targeted ads.',
            matchScore: 83,
            status: 'New',
            notes: 'Successfully uploaded and screened via ' + fileName,
            email: 'waranya.r@gmail.com',
            phone: '082-555-6677'
          };

      onUploadCandidate(newCand);
      setSelectedCandidateId(newCand.id);
      alert(
        language === 'TH' 
          ? `ระบบปัญญาประดิษฐ์สแกนเรซูเม ${fileName} เสร็จสิ้น! คะแนนความเหมาะสม: ${newCand.matchScore}%` 
          : `AdminMate AI parsed ${fileName} successfully! Evaluation score: ${newCand.matchScore}%`
      );
    }, 900);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleSimulatedUpload(files[0].name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleSimulatedUpload(files[0].name);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (selectedStatusFilter === 'All') return true;
    return c.status === selectedStatusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <Upload className="h-7 w-7 text-indigo-600" />
          {t.resumeUpload}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'ลากวางเอกสารเรซูเม (PDF หรือรูปภาพ) เพื่อให้ระบบถอดข้อมูล วิเคราะห์ความเหมาะสม และหาพนักงานที่ดีที่สุดสำหรับธุรกิจคุณแบบไม่เอนเอียง'
            : 'Simulate dragging & dropping PDF CV files into the active queue. Our algorithms score candidates without automatic rejection systems.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Left Column: Upload area & Candidate list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              isDragging 
                ? 'border-indigo-600 bg-indigo-50/50 scale-99' 
                : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
            />
            
            {isProcessing ? (
              <div className="space-y-3 py-4">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-xs font-bold text-slate-700">
                  {language === 'TH' ? 'ระบบอัจฉริยะกำลังถอดข้อมูลเรซูเม...' : 'AdminMate OCR Parsing...'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Extracting education, direct experience & assessing skills...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {language === 'TH' ? 'ลากและวางเรซูเม หรือคลิกเพื่ออัปโหลด' : 'Drag & drop CV files here, or browse local folders'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Supports PDF, DOCX, PNG, JPG up to 15MB
                  </p>
                </div>
                <div className="inline-block mt-3 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                  {language === 'TH' ? 'ทดสอบด่วน: คลิกเพื่อจำลองอัปโหลดเรซูเมใหม่' : 'Click inside box to mock parse resume'}
                </div>
              </div>
            )}
          </div>

          {/* Candidate List Block */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {language === 'TH' ? 'คิวผู้สมัครทั้งหมดในระบบ' : 'Screened Candidates Queue'}
              </h3>
              
              {/* Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-slate-250 text-[10px] px-1.5 py-1 rounded-md font-bold focus:outline-none"
              >
                <option value="All">{language === 'TH' ? 'ทั้งหมด' : 'All States'}</option>
                <option value="New">New</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {filteredCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  {t.noDataYet}
                </div>
              ) : (
                filteredCandidates.map((cand) => {
                  const isCur = selectedCandidateId === cand.id;
                  const scoreBg = cand.matchScore >= 85 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : cand.matchScore >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100';
                  
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidateId(cand.id)}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isCur ? 'bg-indigo-50/60' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {cand.name}
                          </h4>
                          <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-md ${scoreBg}`}>
                            {cand.matchScore}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {cand.positionApplied}
                        </p>
                        <time className="text-[9px] text-slate-400">
                          {cand.experience}
                        </time>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Interactive Status Select */}
                        <select
                          value={cand.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(cand.id, e.target.value as Candidate['status']);
                          }}
                          className={`text-[10px] font-bold px-1.5 py-1 rounded-lg border-2 border-slate-150 cursor-pointer focus:outline-none ${
                            cand.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-800' : cand.status === 'Interview' ? 'bg-indigo-50 text-indigo-800' : cand.status === 'Rejected' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800'
                          }`}
                        >
                          <option value="New">New</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview">Interview</option>
                          <option value="Offered">Offered</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Comparative matching view */}
        <div className="lg:col-span-3">
          
          {selectedCandidate ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              
              {/* Header Profile Badge */}
              <div className="p-6 bg-slate-950 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/85 px-2 py-0.5 rounded-md tracking-wider border border-indigo-900/40">
                    {language === 'TH' ? 'ประวัติผู้สมัครรับเลือก' : 'CANDIDATE ANALYSIS REPORT'}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-white mt-1.5">{selectedCandidate.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {selectedCandidate.positionApplied}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right sm:text-right">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">{t.score}</span>
                    <span className="text-3xl font-black text-indigo-400">{selectedCandidate.matchScore}%</span>
                  </div>
                  <div className="p-2.5 bg-indigo-900/30 rounded-xl border border-indigo-700/30">
                    <Award className="h-7 w-7 text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Analysis Fields Card blocks */}
              <div className="p-6 space-y-6">
                
                {/* AI Summary Block */}
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1">
                  <span className="flex items-center gap-1 text-xs font-bold text-purple-800">
                    <Sparkles className="h-4.5 w-4.5 text-purple-600" />
                    {t.aiAnalysis}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed italic">
                    "{selectedCandidate.aiSummary}"
                  </p>
                </div>

                {/* Info parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase">
                      <GraduationCap className="h-4 w-4 text-slate-500" />
                      {language === 'TH' ? 'วุฒิการศึกษาและการอบรม' : 'Education Profile'}
                    </span>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {selectedCandidate.education}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                      {language === 'TH' ? 'พารามิเตอร์วิชาชีพ' : 'Work Experience Parameters'}
                    </span>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {selectedCandidate.experience}
                    </p>
                  </div>
                </div>

                {/* Candidate Comparative Matching Detail */}
                {comparoData && (
                  <div className="space-y-6 border-t border-slate-100 pt-6">
                    
                    {/* Skills mapping charts */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                        {language === 'TH' ? 'เกรียงระดับการจับคู่ทักษะ' : 'Core Skill Matrix Integration'}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {comparoData.skillMatch.map((skill, i) => (
                          <div 
                            key={i} 
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-semibold ${
                              skill.matched 
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                                : 'bg-slate-50/50 border-slate-205 text-slate-500'
                            }`}
                          >
                            <span>{skill.name}</span>
                            {skill.matched ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                {language === 'TH' ? 'ไม่มี' : 'N/A'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills block */}
                    {comparoData.missingSkills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold tracking-wide text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          {t.missingSkills}
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {comparoData.missingSkills.map((sk, i) => (
                            <span key={i} className="px-2.5 py-1 bg-amber-50 rounded-lg text-xs font-semibold text-amber-900 border border-amber-200/50">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Questions list */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <HelpCircle className="h-4.5 w-4.5 text-indigo-600" />
                        {t.suggestedQuestions}
                      </h4>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-tight mt-0.5">
                        {language === 'TH' ? 'คำถามคัดกรองแนะนำโดยปัญญาประดิษฐ์เพื่อช่วยผู้บริหารสัมภาษณ์' : 'AI-suggested screening parameters with candidate answers guideline:'}
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {comparoData.suggestedQuestions.map((q, i) => (
                          <li key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 text-xs font-medium text-slate-800 leading-relaxed">
                            <span className="font-bold text-indigo-600 mr-1.5">Q{i + 1}:</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              {language === 'TH' ? 'กรุณาอัปโหลดหรือเลือกผู้สมัครด้านซ้ายเพื่อเปิดดูผลวิเคราะห์ข้อมูล' : 'Select a screened applicant file inside queue on the left to reveal granular evaluation.'}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
