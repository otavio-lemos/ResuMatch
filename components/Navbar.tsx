'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Edit3, Download, Upload, LayoutDashboard, Sparkles, Settings, PlusSquare } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTranslation } from '@/hooks/useTranslation';

function getResumeIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/(?:editor|dashboard)\/([^/]+)/);
  return match ? match[1] : null;
}

function getLastResumeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lastResumeId');
}

function EditButton() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const resumeId = useMemo(() => {
    const id = getResumeIdFromPathname(pathname);
    if (id) return id;
    return getLastResumeId();
  }, [pathname]);

  const href = resumeId ? `/editor/${resumeId}` : '/modelos';

  return (
    <Link
      href={href}
      className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <Edit3 className="size-3 mr-2" />
      {t('nav.edit')}
    </Link>
  );
}

function AtsButton() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const resumeId = useMemo(() => {
    const id = getResumeIdFromPathname(pathname);
    if (id) return id;
    return getLastResumeId();
  }, [pathname]);

  const href = resumeId ? `/dashboard/${resumeId}` : '/modelos';

  return (
    <Link
      href={href}
      className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <Sparkles className="size-3 mr-2" />
      {t('nav.analysis').toUpperCase()}
    </Link>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Português (Brasil)"
        onClick={() => setLanguage('pt')}
        className={`relative w-5 h-[14px] overflow-hidden rounded-[2px] transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${language === 'pt' ? 'opacity-100 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#101922]' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
      >
        <Image src="/flags/br.svg" alt="BR" fill className="object-cover" />
      </button>
      <button
        aria-label="English (US)"
        onClick={() => setLanguage('en')}
        className={`relative w-5 h-[14px] overflow-hidden rounded-[2px] transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${language === 'en' ? 'opacity-100 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#101922]' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
      >
        <Image src="/flags/us.svg" alt="US" fill className="object-cover" />
      </button>
    </div>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isEditorPage = pathname.startsWith('/editor/');

  const resumeId = useMemo(() => {
    const id = getResumeIdFromPathname(pathname);
    if (id) return id;
    return getLastResumeId();
  }, [pathname]);

  const handleDownload = useCallback(() => {
    if (isEditorPage) {
      const printContent = document.getElementById('resume-print-container');
      if (printContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Currículo</title>
                <style>
                  body { margin: 0; padding: 0; }
                  @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>${printContent.innerHTML}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }
    } else if (resumeId) {
      window.print();
    } else {
      router.push('/modelos');
    }
  }, [isEditorPage, resumeId, router]);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-[#101922]/90 py-2">
      <input
        id="navbar-import-file"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
      />
      <div className="mx-auto flex w-full items-center justify-between px-6 xl:px-8">

        {/* LOGO RESUMATCH */}
        <Link href="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-4">
          ResuMatch
        </Link>

        {/* TRADUÇÃO (FLAGS) */}
        <div className="flex items-center gap-2 mr-auto">
          <LanguageToggle />
        </div>

        {/* 7 BOTÕES FIXOS (Incluindo TEMA) */}
        <div className="flex items-center gap-0">
          <Link href="/dashboard" className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <LayoutDashboard className="size-3 mr-2" />
            {t('nav.dashboard')}
          </Link>
          <AtsButton />
          <Link href="/config" className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Settings className="size-3 mr-2" />
            {t('nav.config')}
          </Link>
          <Link href="/modelos" className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <PlusSquare className="size-3 mr-2" />
            {t('nav.new')}
          </Link>
          <EditButton />
          <Link
            href="/import"
            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Upload className="size-3 mr-2" />
            {t('nav.import').toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Download className="size-3 mr-2" />
            {t('nav.download').toUpperCase()}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
