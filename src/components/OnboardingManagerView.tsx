import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, OnboardingDoc } from '../types';
import { 
  FolderLock, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles,
  Info 
} from 'lucide-react';

interface OnboardingManagerViewProps {
  language: Language;
  docs: OnboardingDoc[];
  onUpdateDocStatus: (id: string, status: OnboardingDoc['status']) => void;
}

export default function OnboardingManagerView({
  language,
  docs,
  onUpdateDocStatus
}: OnboardingManagerViewProps) {
  const t = translations[language];
  const [remindingDocId, setRemindingDocId] = useState<string | null>(null);

  const handleSendReminder = (doc: OnboardingDoc) => {
    setRemindingDocId(doc.id);
    setTimeout(() => {
      setRemindingDocId(null);
      alert(
        language === 'TH'
          ? `แจ้งเตือนเสร็จสิ้น! ได้ส่งคำเตือนสเปกสูงทาง LINE & อีเมลพนักงานใหม่เกี่ยวกับเอกสาร "${doc.nameTh}"`
          : `Communication Dispatched! Employee notified via email & chat regarding: "${doc.nameEn}"`
      );
    }, 700);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* View Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <FolderLock className="h-7 w-7 text-indigo-600" />
          {t.onboardingManager}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'ดูแลการจัดเตรียมและนัดยื่นเอกสารตั้งต้นสัญญาจ้างพนักงานใหม่ ตรวจดูสำเนากฎหมาย และส่งแจ้งเตือนเอกสารที่ค้างคาเพื่อเร่งส่งระเบียบงาน'
            : 'Maintain, review, and follow up on mandatory new-hire paperwork templates. Click status indicators to transition logs manually.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left main document ledger list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
              {language === 'TH' ? 'รายการตรวจสอบเอกสารสืบค้นพนักงานใหม่' : 'statutory onboarding documentation vault'}
            </h3>
            <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2.5 py-0.5 rounded-md">
              {docs.filter(d => d.status !== 'Completed').length} Pending Tasks
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {docs.map((doc) => {
              const docName = language === 'TH' ? doc.nameTh : doc.nameEn;
              const status = doc.status;

              return (
                <div key={doc.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Name and description parameter */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {status === 'Completed' ? (
                        <span className="h-5 w-5 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-150">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : status === 'Pending' ? (
                        <span className="h-5 w-5 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100">
                          <Clock className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-normal">{docName}</h4>
                      {doc.lastUpdated ? (
                        <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{doc.lastUpdated}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">No date registered</p>
                      )}
                    </div>
                  </div>

                  {/* Actions / dropdown toggler */}
                  <div className="flex items-center gap-3">
                    
                    {/* Status inline quick toggle buttons */}
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
                      {(['Completed', 'Pending', 'Missing'] as OnboardingDoc['status'][]).map((st) => (
                        <button
                          key={st}
                          onClick={() => onUpdateDocStatus(doc.id, st)}
                          className={`px-2 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                            status === st
                              ? st === 'Completed' 
                                ? 'bg-emerald-600 text-white shadow-2xs' 
                                : st === 'Pending'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-red-500 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {st === 'Completed' ? (language === 'TH' ? 'ครบแล้ว' : 'Done') : st === 'Pending' ? (language === 'TH' ? 'ค้างส่ง' : 'Wait') : (language === 'TH' ? 'ขาด' : 'Miss')}
                        </button>
                      ))}
                    </div>

                    {/* Send Reminder email button */}
                    <button
                      onClick={() => handleSendReminder(doc)}
                      disabled={remindingDocId === doc.id || status === 'Completed'}
                      className="p-2 text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 disabled:hover:bg-slate-50 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer"
                      title="Send Instant Recruiter Alert"
                    >
                      {remindingDocId === doc.id ? (
                        <span className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin block"></span>
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Right side widgets: FAQ template guides */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-purple-600" />
              {language === 'TH' ? 'คำแนะนำอัตโนมัติด้านกฎหมาย' : 'Onboarding AI Assistant Legal Tip'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {language === 'TH'
                ? 'ตามมาตรา 9 แห่งกฎหมายคุ้มครองผู้ประกอบการพนักงานใหม่ แฟ้มประวัติและข้อตกลงรักษาความลับทางธุรกิจประเภท NDA จะต้องได้รับการลงชื่อตอบรับภายใน 3 วันทำการแรกเริ่มงาน ทาง AdminMate AI แนะนำให้เรียกข้อความคุยเตือน!'
                : 'According to industrial employment guidelines, NDA templates should be finalized on the candidate onboarding portal before week one ends to avoid trade secret execution exposures.'}
            </p>
            <div className="p-3.5 rounded-xl bg-purple-50 text-purple-900 text-xs font-medium italic border border-purple-100">
              {language === 'TH' ? 'คลิกสลับในเมนูด้านบนเป็น "กล่องเครื่องมือผู้สมัคร" เพื่อทดสอบเช็กเอกสารในฝั่งพนักงานใหม่ได้ทันทีครับ!' : 'Click the "Applicant Toolbox" toggle above to experience the candidate portal tasks instantly!'}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-[11px] text-slate-500 leading-normal flex items-start gap-2 font-sans">
            <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              {language === 'TH'
                ? 'ระบบสามารถจำลองการสับเปลี่ยนตัวสิทธิควบคุมจากเมนูด้านบน โดย "พนักงานใหม่" สามารถเข้ามาเช็กความคืบหน้าของตนได้ผ่านหน้าต่างดังกล่าว'
                : 'Role parameters are dynamically synced so candidate states can trigger automated reminders in real-time.'}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
