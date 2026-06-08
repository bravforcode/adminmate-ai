import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, Candidate } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileEdit, 
  Sparkles, 
  FileText, 
  X, 
  Save, 
  AlertCircle,
  Network
} from 'lucide-react';

interface PipelineViewProps {
  language: Language;
  candidates: Candidate[];
  onUpdateStatus: (id: string, status: Candidate['status']) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export default function PipelineView({
  language,
  candidates,
  onUpdateStatus,
  onUpdateNotes
}: PipelineViewProps) {
  const t = translations[language];

  // Pipeline column headers
  const columns: { id: Candidate['status']; labelEn: string; labelTh: string; color: string }[] = [
    { id: 'New', labelEn: 'New', labelTh: 'ผู้สมัครรายใหม่', color: 'bg-indigo-600' },
    { id: 'Shortlisted', labelEn: 'Shortlisted', labelTh: 'คัดเลือกเบื้องต้น', color: 'bg-emerald-600' },
    { id: 'Interview', labelEn: 'Interview', labelTh: 'สัมภาษณ์งาน', color: 'bg-indigo-600' },
    { id: 'Offered', labelEn: 'Offered', labelTh: 'เสนองาน / ผ่าน', color: 'bg-purple-600' },
    { id: 'Rejected', labelEn: 'Rejected', labelTh: 'ปฏิเสธ / เก็บฐาน', color: 'bg-slate-600' }
  ];

  // Note Modal state
  const [activeNoteCandidateId, setActiveNoteCandidateId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  const activeCandidateForNote = candidates.find(c => c.id === activeNoteCandidateId);

  const openNotesModal = (cand: Candidate) => {
    setActiveNoteCandidateId(cand.id);
    setEditingNotesText(cand.notes || '');
  };

  const saveCandidateNotes = () => {
    if (activeNoteCandidateId) {
      onUpdateNotes(activeNoteCandidateId, editingNotesText);
      setActiveNoteCandidateId(null);
      alert(language === 'TH' ? 'บันทึกประวัติการสัมภาษณ์เรียบร้อย!' : 'HR Candidate Notes successfully updated!');
    }
  };

  // Helper migration handlers
  const moveCandidate = (cand: Candidate, dir: 'left' | 'right') => {
    const colSeq: Candidate['status'][] = ['New', 'Shortlisted', 'Interview', 'Offered', 'Rejected'];
    const curIdx = colSeq.indexOf(cand.status);
    const targetIdx = curIdx + (dir === 'right' ? 1 : -1);
    if (targetIdx >= 0 && targetIdx < colSeq.length) {
      onUpdateStatus(cand.id, colSeq[targetIdx]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
            <Network className="h-7 w-7 text-indigo-600" />
            {t.candidatePipeline}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {language === 'TH'
              ? 'กระดานบอร์ดผู้รับสมัครแต่ละแผนก ติดตามระดับความเหมาะสม ปรับเปลี่ยนสถานะ และบันทึกสรุปข้อคิดเห็น'
              : 'Interactive candidate funnel trackpad. Update states using quick direction arrows or custom HR notes logs.'}
          </p>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colCandidates = candidates.filter(c => c.status === col.id);
          const colCount = colCandidates.length;

          return (
            <div 
              key={col.id} 
              className="bg-slate-100/70 rounded-2xl p-4 flex flex-col min-h-[480px] border border-slate-200/40 relative"
            >
              
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`}></span>
                  <h3 className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
                    {language === 'TH' ? col.labelTh : col.labelEn}
                  </h3>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  {colCount}
                </span>
              </div>

              {/* Candidates inside this column list */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colCandidates.map((cand) => {
                  const isTopCandidate = cand.matchScore >= 85;
                  const scoreColor = isTopCandidate ? 'text-indigo-600' : cand.matchScore >= 70 ? 'text-emerald-600' : 'text-slate-500';

                  return (
                    <div 
                      key={cand.id}
                      className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all space-y-3 group relative"
                    >
                      
                      {/* Name / Matchscore */}
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cand.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5 uppercase tracking-tight">
                          {cand.positionApplied}
                        </p>
                      </div>

                      {/* Display Score in Circle style */}
                      <div className="flex items-center justify-between py-1 border-t border-b border-dashed border-slate-100 text-[10px] font-semibold text-slate-500">
                        <span>{language === 'TH' ? 'ระดับจำลอง' : 'Match Index'}:</span>
                        <span className={`font-mono font-bold ${scoreColor}`}>
                          {cand.matchScore}%
                        </span>
                      </div>

                      {/* Sticky Notes Preview Snippet if logs exist */}
                      {cand.notes && (
                        <div className="p-2 bg-slate-50 rounded-lg text-[9px] text-slate-500 leading-normal border border-slate-100 max-h-12 overflow-hidden text-ellipsis line-clamp-2">
                          {cand.notes}
                        </div>
                      )}

                      {/* Action parameters tool rows */}
                      <div className="flex justify-between items-center gap-1.5">
                        
                        {/* Note launcher button */}
                        <button
                          onClick={() => openNotesModal(cand)}
                          className="flex items-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                          title="Recruiter Log Notes"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{language === 'TH' ? 'โน้ต' : 'Notes'}</span>
                        </button>

                        {/* Arrows migration quick utilities */}
                        <div className="flex items-center gap-1 ml-auto">
                          {col.id !== 'New' && (
                            <button
                              onClick={() => moveCandidate(cand, 'left')}
                              className="p-1 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer text-slate-500 active:scale-90 transition-transform"
                              title="Demote pipeline state"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {col.id !== 'Rejected' && (
                            <button
                              onClick={() => moveCandidate(cand, 'right')}
                              className="p-1 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-md border border-slate-200 cursor-pointer text-slate-500 active:scale-90 transition-all"
                              title="Promote pipeline state"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                      </div>

                    </div>
                  );
                })}
                {colCount === 0 && (
                  <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 font-bold p-3 text-center">
                    {language === 'TH' ? 'ไม่มีผู้สมัครรายใด' : 'Draft column empty'}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Recruiter Log Notes overlay Modal dialog pop */}
      {activeNoteCandidateId && activeCandidateForNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900">
                  {language === 'TH' ? 'บันทึกประวัติการจับเข่าคุย' : 'HR RECRUITER LOGS'}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{activeCandidateForNote.name}</h3>
              </div>
              <button
                onClick={() => setActiveNoteCandidateId(null)}
                className="text-slate-400 hover:text-white bg-slate-900 p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                  {language === 'TH' ? 'ความคิดเห็นเกี่ยวกับประวัติและพฤติกรรมสัมภาษณ์' : 'Interview & Resume screening logs'}
                </label>
                <textarea
                  value={editingNotesText}
                  onChange={(e) => setEditingNotesText(e.target.value)}
                  rows={6}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder={
                    language === 'TH' 
                      ? 'ระบุความคิดเห็น เช่น ขอนัดสัมภาษณ์รอบที่สอง ทัศนคติเข้ากับวัฒนธรรมองค์กรดีมาก ทักษะต่อรองสอดคล้อง...' 
                      : 'e.g. Strongly motivated. Showcased excellent team-leading parameters. Follow up with department VP on second-opinion.'}
                ></textarea>
              </div>

              {/* AI helper generation injection tip */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-2 text-[10px] text-purple-800 leading-normal">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  {language === 'TH'
                    ? 'ปัญญาประดิษฐ์แนะนำ: สอบถามความรู้ด้านการทำงานเป็นทีมแบบ Agile เพื่อเสริมทักษะการส่งมอบของตามเป้าประสงค์'
                    : 'AI Suggestion: Candidate shows high target metrics. Interview questions should prioritize direct pipeline accountability.'}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveNoteCandidateId(null)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Discard'}
              </button>
              <button
                type="button"
                onClick={saveCandidateNotes}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {language === 'TH' ? 'บันทึกความเห็น' : 'Save Notes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
