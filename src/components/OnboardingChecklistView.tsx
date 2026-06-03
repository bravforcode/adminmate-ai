import React from 'react';
import { translations } from '../translations';
import { Language, OnboardingTask } from '../types';
import { CheckSquare, Sparkles, Trophy, CalendarDays, Info } from 'lucide-react';

interface OnboardingChecklistViewProps {
  language: Language;
  tasks: OnboardingTask[];
  onToggleTask: (id: string) => void;
}

export default function OnboardingChecklistView({
  language,
  tasks,
  onToggleTask
}: OnboardingChecklistViewProps) {
  const t = translations[language];

  // Group tasks
  const day1Tasks = tasks.filter(t => t.timeframe === 'Day 1');
  const week1Tasks = tasks.filter(t => t.timeframe === 'Week 1');

  // Progress computation
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* View Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <CheckSquare className="h-7 w-7 text-indigo-600" />
          {t.onboardingChecklist}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'เป้าประสงค์และภาระงานในช่วงวันแรก และสัปดาห์แรกของพนักงานใหม่ ตรวจดูความครบถ้วน ร่วมพัฒนาศักยภาพ'
            : 'Track, view, and complete essential milestones for your Day 1 and Week 1 as a newly hired team member.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Tasks lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Day 1 Checklist Block */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                🌅 {language === 'TH' ? 'รายการเช็กอินวันแรกทำงาน (Day 1 Milestone)' : 'FIRST DAY ONBOARDING CHECKLIST (DAY 1)'}
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100 p-2">
              {day1Tasks.map((tsk) => (
                <label 
                  key={tsk.id} 
                  className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-slate-50/70 transition-colors ${
                    tsk.completed ? 'bg-slate-50/30' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tsk.completed}
                    onChange={() => onToggleTask(tsk.id)}
                    className="mt-0.5 h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className={`text-xs font-semibold leading-relaxed ${
                    tsk.completed ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {language === 'TH' ? tsk.taskTh : tsk.taskEn}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Week 1 Checklist Block */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                📅 {language === 'TH' ? 'การตั้งหลักสัปดาห์แรก (Week 1 Milestones)' : 'WIDER FIRST WEEK CORE TASKS (WEEK 1)'}
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100 p-2">
              {week1Tasks.map((tsk) => (
                <label 
                  key={tsk.id} 
                  className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-slate-50/70 transition-colors ${
                    tsk.completed ? 'bg-slate-50/30' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tsk.completed}
                    onChange={() => onToggleTask(tsk.id)}
                    className="mt-0.5 h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className={`text-xs font-semibold leading-relaxed ${
                    tsk.completed ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {language === 'TH' ? tsk.taskTh : tsk.taskEn}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Progress & Stats */}
        <div className="space-y-6">
          
          {/* Reactive Progress card with Trophy feedback */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-150">
              <Trophy className="h-6 w-6 text-indigo-600 animate-bounce" />
            </div>
            
            <div>
              <h3 className="text-base font-black text-slate-900">
                {language === 'TH' ? 'ความก้าวหน้าการปูพื้นฐานงาน' : 'Onboarding Progression Status'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-bold uppercase tracking-tight">
                {completedCount} / {totalCount} {language === 'TH' ? 'เป้าประสงค์ที่สำเร็จ' : 'Objectives Finished'}
              </p>
            </div>

            {/* Custom Visual progress bar */}
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500 relative"
                  style={{ width: `${pct}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] animate-[shimmer_1s_infinite_linear]"></div>
                </div>
              </div>
              <span className="block font-mono font-extrabold text-indigo-600 text-sm">{pct}% Completeness</span>
            </div>

            {pct === 100 && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-150 text-xs text-emerald-800 font-semibold animate-pulse">
                🎉 {language === 'TH' ? 'ยินยอมรับสิทธิรับพนักงานใหม่เสร็จสมบูรณ์ ยอดเยี่ยมมาก!' : 'SME onboarding parameters 100% completed. Welcome officially!'}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-[11px] text-slate-500 leading-normal flex items-start gap-2 font-sans">
            <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              {language === 'TH'
                ? 'ภาระหน้าที่เหล่านี้ได้รับการมอบหมายโดยอัตราระบบบริหาร HR เมื่อเป้าหมายอัปเดต จะลิ้งค์สรุปการมีส่วนร่วมเข้าสู่บอร์ดหลักด้วย'
                : 'Task checkmarks are state-preserved and instantly sync back to the employer dashboard statistics panel.'}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
