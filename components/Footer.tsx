'use client';

import Link from 'next/link';
import { Linkedin, Github, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="sticky bottom-0 z-[9999] w-full border-t border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-[#101922]/90 py-2 shrink-0">
      <div className="w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-[10%]">
        
        {/* Lado Esquerdo: GitHub + Repo URL */}
        <div className="flex items-center gap-3">
          <a 
            href="https://github.com/otavio-lemos/ResuMatch" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label={t('footer.githubLabel')}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md"
          >
            <div className="size-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-900 dark:group-hover:bg-white dark:group-hover:text-slate-900 group-hover:text-white transition-all">
              <Github className="size-4" />
            </div>
            <span className="text-[10px] font-medium hidden sm:inline">github.com/otavio-lemos/ResuMatch</span>
          </a>
        </div>

        {/* Centro: Texto na mesma fonte e estilo do ResuMatch */}
        <div className="flex-1 text-center">
          <p className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">
            {t('footer.tagline')}
          </p>
        </div>

        {/* Lado Direito: Termos */}
        <div className="flex items-center gap-4">
          <Link 
            href="/legal/termos"
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            <FileText className="size-3" />
            {t('footer.termsAndDisclaimer')}
          </Link>
        </div>

      </div>
    </footer>
  );
}
