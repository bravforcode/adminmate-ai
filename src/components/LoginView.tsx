import React, { useState } from 'react';
import { translations } from '../translations';
import { Language } from '../types';
import { ShieldCheck, Mail, Lock, LogIn, Chrome, ArrowRight, Sparkles } from 'lucide-react';

interface LoginViewProps {
  language: Language;
  onLoginSuccess: (email: string, role: 'Owner' | 'HR' | 'Admin' | 'Applicant') => void;
  setLanguage: (lang: Language) => void;
}

export default function LoginView({ language, onLoginSuccess, setLanguage }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const handleSub = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(language === 'TH' ? 'กรุณากรอกอีเมลและรหัสผ่าน' : 'Please fill in both email and password');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email.trim() === 'demo@adminmate.ai' && password === 'demo123') {
        onLoginSuccess(email, 'HR');
      } else if (email.trim() === 'applicant@adminmate.ai' || email.trim().includes('applicant')) {
        onLoginSuccess(email, 'Applicant');
      } else {
        // Let them login with anything for demo purposes, but notify them if they used different email
        onLoginSuccess(email, 'HR');
      }
    }, 800);
  };

  const handleAutofill = () => {
    setEmail('demo@adminmate.ai');
    setPassword('demo123');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden font-sans">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60"></div>
      
      {/* Absolute Header Language Selector */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setLanguage('TH')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            language === 'TH'
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
          }`}
          id="toggle-lang-th"
        >
          TH
        </button>
        <button
          onClick={() => setLanguage('EN')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            language === 'EN'
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
          }`}
          id="toggle-lang-en"
        >
          EN
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 border border-indigo-400">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-950 tracking-tight">
          AdminMate AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {t.tagline}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="bg-white/80 backdrop-blur-md py-8 px-4 shadow-xl shadow-slate-150 rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleSub}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                {t.email}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                  placeholder="demo@adminmate.ai"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  {t.password}
                </label>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => alert(language === 'TH' ? 'ระบบกู้คืนรหัสผ่านเดโมส่งอีเมลแล้ว (จำลอง)' : 'Demo password reset email dispatched!')}
                    className="font-medium text-indigo-600 hover:text-indigo-500 text-xs"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100 font-medium">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-55"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    {language === 'TH' ? 'กำลังล็อกอิน...' : 'Signing in...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    {t.signIn}
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-500 uppercase tracking-widest font-semibold scale-90">
                  {language === 'TH' ? 'หรือเข้าผ่านช่องทางอื่น' : 'Or continue with'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => onLoginSuccess('google.user@gmail.com', 'HR')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-250 rounded-xl shadow-xs bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all"
              >
                <Chrome className="h-4 w-4 text-red-500" />
                {t.continueWithGoogle}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => alert(language === 'TH' ? 'ระบบสร้างบัญชีเปิดกว้างทดลองใช้ได้ทันทีผ่านเดโมล็อกอินด้านล่างครับ' : 'SME platform accounts are pre-created. Log in directly with the demo badge below!')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              {t.createAccount}
            </button>
          </div>
        </div>

        {/* Demo Credentials Box */}
        <div 
          onClick={handleAutofill}
          title="Click to Autofill"
          className="mt-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 cursor-pointer hover:bg-amber-50 hover:shadow-md transition-all group relative"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 group-hover:animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                {t.demoLogin}
                <ArrowRight className="h-3.5 w-3.5 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </h4>
              <div className="mt-1.5 space-y-1 text-xs font-mono text-amber-900">
                <p><span className="font-semibold text-amber-700">Email:</span> demo@adminmate.ai</p>
                <p><span className="font-semibold text-amber-700">Password:</span> demo123</p>
              </div>
              <p className="mt-2 text-[10px] text-amber-600 italic">
                {language === 'TH' 
                  ? '*คลิกกล่องนี้เพื่อกรอกข้อมูลเข้าสู่ระบบแบบผู้ประกอบการอัตโนมัติ' 
                  : '*Click this box to automatically set email & password to test HR flow.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
