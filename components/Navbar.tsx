'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Edit3, Download, Upload, LayoutDashboard, Sparkles, Settings, PlusSquare, Loader2, ChevronDown, Copy, Trash2, Languages } from 'lucide-react';
import { useMemo, useCallback, useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTranslation } from '@/hooks/useTranslation';
import { duplicateResume, translateResumeAction, deleteResume } from '@/app/dashboard/actions';

function getResumeIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/(?:editor|dashboard)\/([^/]+)/);
  return match ? match[1] : null;
}

function getLastResumeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lastResumeId');
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
  const { t, language } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [resumesCount, setResumesCount] = useState<number | null>(null);
  const [resumesList, setResumesList] = useState<Array<{ id: string; resumeCode?: string; title?: string }>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isEditorPage = pathname.startsWith('/editor/');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.resume-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Check resumes existence on mount and pathname changes
  // Use useCallback with empty deps + useEffect to avoid sync setState in effect
  const checkResumes = useCallback(async () => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const list = await res.json();
        
        // Defer state update to avoid sync setState in effect
        setTimeout(() => {
            setResumesCount(list.length);
            setResumesList(list);
        }, 0);
        
        // Redirecionamento condicional: apenas se estiver em páginas que dependem de dados
        const isProtectedPage = pathname.startsWith('/dashboard') || pathname.startsWith('/editor');
        
        if (list.length === 0 && isProtectedPage) {
           router.push('/modelos');
        }
      }
    } catch (err) {
      console.error('Failed to check resumes:', err);
    }
  }, [pathname, router]);

  const hasResumes = resumesCount !== null ? resumesCount > 0 : false;

  const resumeId = useMemo(() => {
    const id = getResumeIdFromPathname(pathname);
    if (id) return id;
    return getLastResumeId();
  }, [pathname]);

  const currentResume = useMemo(() => {
    return resumesList.find(r => r.id === resumeId) || resumesList[0];
  }, [resumesList, resumeId]);

  useEffect(() => {
    checkResumes();
  }, [checkResumes]);

  const handleSelectResume = (id: string) => {
    if (pathname.startsWith('/dashboard')) {
      router.push(`/dashboard/${id}`);
    } else if (pathname.startsWith('/editor')) {
      router.push(`/editor/${id}`);
    } else {
      router.push(`/dashboard/${id}`);
    }
    setIsDropdownOpen(false);
  };

  const handleTranslate = async () => {
    if (!currentResume) return;
    setIsTranslating(true);
    try {
      const targetLang = language === 'pt' ? 'en' : 'pt';
      const result = await translateResumeAction(currentResume.id, targetLang, null);
      if (result.success && result.id) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
      setIsDropdownOpen(false);
    }
  };

  const handleDuplicate = async () => {
    if (!currentResume) return;
    setIsDuplicating(true);
    try {
      const result = await duplicateResume(currentResume.id, language);
      if (result.success && result.id) {
        checkResumes();
        router.push(`/dashboard/${result.id}`);
      }
    } catch (err) {
      console.error('Duplicate error:', err);
    } finally {
      setIsDuplicating(false);
      setIsDropdownOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!currentResume) return;
    const confirmMsg = language === 'pt' 
      ? 'Tem certeza que deseja excluir o currículo selecionado? Ele será deletado permanentemente.'
      : 'Are you sure you want to delete the selected resume? It will be permanently deleted.';
    if (!confirm(confirmMsg)) return;
    setIsDeleting(true);
    try {
      await deleteResume(currentResume.id, language);
      checkResumes();
      router.push('/dashboard');
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setIsDropdownOpen(false);
    }
  };

  const editHref = hasResumes && resumeId ? `/editor/${resumeId}` : '/modelos';
  const atsHref = hasResumes && resumeId ? `/dashboard/${resumeId}` : '/modelos';
  const dashboardHref = hasResumes ? '/dashboard' : '/modelos';
  const importHref = '/import'; // Import is always accessible

  const handleDownload = useCallback(() => {
    // Se não tem currículo, SEMPRE vai para /modelos
    if (!hasResumes) {
      router.push('/modelos');
      return;
    }

    // Se tem currículo, mas não tem ID selecionado (ex: na tela de listagem)
    if (!resumeId) {
      router.push('/modelos');
      return;
    }

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
    } else {
      // Fora do editor, se tiver ID, tenta imprimir a página atual ou vai para o editor
      window.print();
    }
  }, [isEditorPage, resumeId, router, hasResumes]);
  
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
        <Link href={dashboardHref} className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-4">
          ResuMatch
        </Link>

        {/* TRADUÇÃO (FLAGS) */}
        <div className="flex items-center gap-2 mr-auto">
          <LanguageToggle />
        </div>

        {/* RESUME SELECTOR DROPDOWN */}
        {hasResumes && resumesList.length > 0 && (
          <div className="relative resume-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center px-3 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="mr-2">{currentResume?.resumeCode || currentResume?.title || t('dashboard.untitled')}</span>
              <ChevronDown className={`size-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-50">
                {/* Resume List */}
                <div className="max-h-48 overflow-y-auto">
                  {resumesList.map((resume, index) => (
                    <button
                      key={resume.id}
                      onClick={() => handleSelectResume(resume.id)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        resume.id === currentResume?.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {resume.resumeCode || `${index + 1} - ${resume.title || t('dashboard.untitled')}`}
                    </button>
                  ))}
                </div>
                
                {/* Actions */}
                <div className="border-t border-slate-200 dark:border-slate-700 py-1">
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isTranslating ? <Loader2 className="size-3 animate-spin" /> : <Languages className="size-3" />}
                    {t('dashboard.translateResume')}
                  </button>
                  <button
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isDuplicating ? <Loader2 className="size-3 animate-spin" /> : <Copy className="size-3" />}
                    {t('dashboard.duplicateResume')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                    {t('dashboard.deleteResume')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7 BOTÕES FIXOS (Incluindo TEMA) */}
        <div className="flex items-center gap-0">
          <Link href={dashboardHref} className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <LayoutDashboard className="size-3 mr-2" />
            {t('nav.dashboard')}
          </Link>
          
          <Link
            href={atsHref}
            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Sparkles className="size-3 mr-2" />
            {t('nav.analysis').toUpperCase()}
          </Link>

          <Link href="/config" className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Settings className="size-3 mr-2" />
            {t('nav.config')}
          </Link>
          <Link href="/modelos" className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <PlusSquare className="size-3 mr-2" />
            {t('nav.new')}
          </Link>
          
          <Link
            href={editHref}
            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Edit3 className="size-3 mr-2" />
            {t('nav.edit')}
          </Link>

          <Link
            href={importHref}
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
