import React, { useState, useRef, useEffect } from 'react';
import { translations } from '../translations';
import { Language, ChatMessage } from '../types';
import { prebuiltAiOnboardingAnswers } from '../mockData';
import { 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  RefreshCw 
} from 'lucide-react';

interface OnboardingAssistantViewProps {
  language: Language;
}

export default function OnboardingAssistantView({ language }: OnboardingAssistantViewProps) {
  const t = translations[language];

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      sender: 'ai',
      text: "Hello! I am AdminMate AI, your dedicated onboarding copilot. You can ask me any question regarding your first day preparation, working hours, missing document checklists, or holiday benefits here!",
      textTh: "สวัสดีครับ! ผมคือ AdminMate AI ผู้ช่วยเตรียมนัดพนักงานใหม่ประจำบริษัทของคุณ สามารถพิมพ์สอบถามข้อมูลเวลาเข้างาน เอกสารที่ยังขาด วันหยุดวันลา หรือของที่ต้องเตรียมตัวได้เลยเลิศเลยครับ!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const presetQuestions = [
    {
      en: "What time do I start work?",
      th: "เข้างานกี่โมง?"
    },
    {
      en: "What documents are missing?",
      th: "ตอนนี้ขาดเอกสารอะไรบ้าง?"
    },
    {
      en: "What should I prepare for my first day?",
      th: "วันแรกต้องส่งมหาของอะไรบ้าง?"
    },
    {
      en: "How many leave days do I have?",
      th: "สิทธิ์วันหยุดพักร้อนมีกี่วัน?"
    }
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Append user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking and smart rule parsing
    setTimeout(() => {
      setIsTyping(false);

      const resolvedText = text.toLowerCase();
      // Search keywords in prebuilt database corresponding to current app language
      const matchDb = prebuiltAiOnboardingAnswers[language];
      let aiResponseText = '';

      const matchedRule = matchDb.find(rule => 
        rule.keywords.some(kw => resolvedText.includes(kw))
      );

      if (matchedRule) {
        aiResponseText = matchedRule.answer;
      } else {
        // Fallback friendly HR copilot response
        aiResponseText = language === 'TH'
          ? `ขออภัยครับ คำถามเกี่ยวกับ "${text}" ผมอาจไม่มีระเบียบตัวจริงบันทึกไว้ในข้อตกลงบริษัทในระบบ SME นี้โดยตรง แต่จากคู่มือแนะนำเบื้องต้น หากท่านมีข้อสงสัยกว้างๆ แนะนำให้สอบถามพี่รหัส หรือ HR ในหน้านัดคุยได้เลยครับ!`
          : `I received your query regarding "${text}". I don't have this specific metric cataloged in the local SME handbook policy database. Please contact your designated HR buddy or supervisor on your first morning to clarify!`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        textTh: aiResponseText, // preserve bilingual parity inside state
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);

    }, 850);
  };

  const handlePresetClick = (q: typeof presetQuestions[number]) => {
    const questionToAsk = language === 'TH' ? q.th : q.en;
    handleSendMessage(questionToAsk);
  };

  const clearChatLogs = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'ai',
        text: "System refreshed. Let me know what you would like to ask regarding company work policies and tools!",
        textTh: "รีเฟรชระบบช่วยเหลือสำเร็จ พิมพ์สอบถามกฎสิทธิประโยชน์ของบริษัทท่านได้เลยครับ!",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <Bot className="h-7 w-7 text-indigo-600" />
          {t.onboardingAssistant}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'บทสนทนาอัจฉริยะแบบ AI ปัญญาประดิษฐ์พนักงานใหม่ สอบถามข้อมูลระเบียบเข้าออก เอกสารขาด หรือการเตรียมตัวพกพาของวันแรก'
            : 'Interactive onboarding virtual chatbot. New hires can inspect standard SME guidelines and statutory requirements instantly.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left presets selection panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
              {language === 'TH' ? 'คำถามที่พบบ่อย' : 'Recommended Prompts'}
            </h3>
            <div className="flex flex-col gap-2">
              {presetQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(q)}
                  className="p-3 text-left bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200/50 text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  {language === 'TH' ? q.th : q.en}
                </button>
              ))}
            </div>
            
            <button
              onClick={clearChatLogs}
              className="w-full flex items-center justify-center gap-2 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {language === 'TH' ? 'ล้างการแชต' : 'Clear Chat History'}
            </button>
          </div>
        </div>

        {/* Right chat interface screen box */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col h-[520px] overflow-hidden">
          
          {/* Active bot status header bar */}
          <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-900 border border-indigo-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-wide uppercase">AdminMate Copilot AI</h4>
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  BILINGUAL COMPILER ONLINE
                </p>
              </div>
            </div>
            
            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
              {language === 'TH' ? 'ระบบภาษาไทย' : 'English Mode Enabled'}
            </span>
          </div>

          {/* Messages list context pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 min-h-[300px]">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              const dispText = isAi && language === 'TH' && msg.textTh ? msg.textTh : msg.text;

              return (
                <div 
                  key={msg.id}
                  className={`flex gap-3 max-w-xl ${isAi ? '' : 'ml-auto'}`}
                >
                  {isAi && (
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 border border-indigo-150">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${
                    isAi 
                      ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-xs' 
                      : 'bg-indigo-600 text-white ml-auto rounded-tr-xs'
                  }`}>
                    <p>{dispText}</p>
                    <time className={`block text-[9px] mt-2 text-right ${isAi ? 'text-slate-400' : 'text-indigo-100'} font-mono`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>

                  {!isAi && (
                    <div className="h-8 w-8 rounded-xl bg-indigo-150 flex items-center justify-center text-indigo-700 shrink-0 border border-indigo-200">
                      <User className="h-4.5 w-4.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Simulated interactive typing pulse bubble */}
            {isTyping && (
              <div className="flex gap-3 max-w-md">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 border border-indigo-150">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></span>
                  <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce delay-100"></span>
                  <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>

          {/* Form write input bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }} 
            className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.searchMsgPlh}
              className="flex-1 rounded-xl border border-slate-205 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
