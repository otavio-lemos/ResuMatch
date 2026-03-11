'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Key, Github, Star, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type ModalStep = 'DISCLAIMER' | 'WELCOME';

// Lazy initialization function to check localStorage without causing hydration mismatch
function getInitialModalState(): boolean {
  if (typeof window === 'undefined') return false;
  const hasSeenModal = localStorage.getItem('resumatch-welcome-seen');
  return !hasSeenModal;
}

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState<boolean>(getInitialModalState);
  const [step, setStep] = useState<ModalStep>('DISCLAIMER');
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // No useEffect needed - state is initialized lazily

  const nextStep = () => {
    if (agreed) {
      setStep('WELCOME');
    }
  };

  const closeAndSave = () => {
    localStorage.setItem('resumatch-welcome-seen', 'true');
    setIsOpen(false);
  };

  const goToConfig = () => {
    closeAndSave();
    router.push('/config');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        
        {/* Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500 w-full" />

        {step === 'WELCOME' && (
          <button 
            onClick={closeAndSave}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        )}

        <div className="p-6 sm:p-8 text-center flex flex-col items-center">
          
          {step === 'DISCLAIMER' ? (
            <>
              <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mb-4 shadow-inner ring-1 ring-amber-100 dark:ring-amber-800">
                <ShieldAlert className="size-7" />
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
                {t('welcome.disclaimerTitle')}
              </h2>

              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed font-medium text-left">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p>{t('welcome.disclaimerText')}</p>
                </div>

                <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-slate-600 transition-all checked:border-blue-600 checked:bg-blue-600 focus:outline-none"
                    />
                    <CheckCircle2 className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                    {t('welcome.disclaimerAgreement')}
                  </span>
                </label>
              </div>

              <div className="mt-6 w-full">
                <button
                  onClick={nextStep}
                  disabled={!agreed}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {t('welcome.acceptAndContinue')} <ArrowRight className="size-3" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-4 shadow-inner ring-1 ring-blue-100 dark:ring-blue-800">
                <Sparkles className="size-7" />
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
                {t('welcome.title')}
              </h2>

              <div className="space-y-3 text-slate-600 dark:text-slate-400 text-[11px] leading-snug font-medium">
                <p>
                  {t('welcome.description')}
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-left">
                  <Key className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <p>
                    {t('welcome.configInstruction')}
                  </p>
                </div>

                <p className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">
                  {t('welcome.githubPromo')} <br />
                  <span className="flex items-center justify-center gap-1.5 mt-1">
                    {t('welcome.githubLink')} <Github className="size-3" /> 
                    <a 
                      href="https://github.com/otavio-lemos/ResuMatch" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-2 hover:text-blue-700 transition-colors"
                    >
                      GitHub
                    </a>
                    <Star className="size-3 text-amber-400 fill-amber-400" />
                  </span>
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={goToConfig}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {t('welcome.configureNow')} <ArrowRight className="size-3" />
                </button>
                <button
                  onClick={closeAndSave}
                  className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {t('welcome.maybeLater')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
