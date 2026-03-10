"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, X, Upload, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import { createNewResume } from '@/app/dashboard/actions';
import { useResumeStore } from '@/store/useResumeStore';
import { useAISettingsStore } from '@/store/useAISettingsStore';

import { TEMPLATES, Template } from '@/lib/templates';

import { motion } from 'framer-motion'; // Corrected import from 'motion/react' to 'framer-motion'

import { useTranslation } from '@/hooks/useTranslation';

export default function TemplatesClient() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'modelos';

  const [isPending, startTransition] = useTransition();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [includeSampleData, setIncludeSampleData] = useState(true); // Default: com dados
  const resumeIdParam = searchParams.get('resumeId');

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { setTemplateId, saveLocalResume } = useResumeStore();
  const { importAI, importPrompt } = useAISettingsStore();

  const handleCreateResume = (templateId: string) => {
    setCreatingId(templateId);
    startTransition(async () => {
      try {
        if (resumeIdParam) {
          setTemplateId(templateId);
          await saveLocalResume();
          router.push(`/editor/${resumeIdParam}`);
          return;
        }

        const result = await createNewResume(undefined, templateId, includeSampleData, language);

        if (result.error) {
          console.error('Resume creation failed:', result);
          alert(`${t('templates.error')}: ${result.message}`);
          setCreatingId(null);
          return;
        }

        if (result.success && result.id) {
          router.push(`/editor/${result.id}`);
        }
      } catch (error: any) {
        console.error('Network/Client error:', error);
        alert(`${t('templates.connectionError')}${error.message}`);
        setCreatingId(null);
      }
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('aiSettings', JSON.stringify({
        provider: importAI.provider,
        apiKey: importAI.apiKey,
        baseUrl: importAI.baseUrl,
        model: importAI.model,
        temperature: importAI.temperature,
        importPrompt: importPrompt
      }));

      const response = await fetch('/api/resumes', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('templates.errorProcessing'));
      }

      router.push(`/editor/${result.resumeId}`);
    } catch (err: any) {
      setError(err.message || t('templates.errorImporting'));
      setIsUploading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES;

    if (categoryParam === 'exemplos') {
      result = result.filter((t) => t.popularity > 100);
    } else if (categoryParam === 'precos') {
      result = result.filter((t) => t.ats > 95);
    }

    return result.sort((a, b) => (b.recommended === a.recommended ? 0 : b.recommended ? 1 : -1));
  }, [categoryParam]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [filteredTemplates]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -width : width,
        behavior: 'smooth'
      });
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-140px)] overflow-hidden bg-slate-50 dark:bg-[#0b1219]">
      <div className="flex-1 flex flex-col items-center justify-center w-full mx-auto px-6 xl:px-8 py-4 overflow-hidden">

        {/* Header Section - COMPACT & UNIFORM */}
        <div className="text-center mb-8 shrink-0 w-full">
          <h1 className="flex items-center justify-center text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase whitespace-nowrap">
            <span className="leading-8">{t('templates.chooseTemplate')}</span>

            <span className="text-slate-300 dark:text-slate-700 font-light mx-3 leading-8">|</span>

            {/* Vertical SLIDING REEL - BOTH VISIBLE, ACTIVE CENTERED */}
            <div
              className="relative h-8 w-36 cursor-pointer select-none flex items-center justify-center"
              onClick={() => setIncludeSampleData(!includeSampleData)}
            >
              {/* This inner div handles the sliding without clipping the 'hovering' option */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: includeSampleData ? 16 : -16 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="flex flex-col items-center"
                >
                  <div className="h-8 flex items-center justify-center">
                    <span className={`text-xl font-black transition-all duration-300 ${!includeSampleData ? 'text-red-600/70 dark:text-red-500/70 scale-95' : 'text-emerald-800 dark:text-emerald-400'}`}>
                      {t('templates.withData')}
                    </span>
                  </div>
                  <div className="h-8 flex items-center justify-center">
                    <span className={`text-xl font-black transition-all duration-300 ${includeSampleData ? 'text-red-600/70 dark:text-red-500/70 scale-95' : 'text-emerald-800 dark:text-emerald-400'}`}>
                      {t('templates.withoutData')}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            <span className="text-slate-300 dark:text-slate-700 font-light mx-3 leading-8">|</span>

            <div className="flex items-center h-8">
              <span className="text-xl font-black text-slate-400 tracking-tighter mr-3 leading-8">{t('templates.or')}</span>
              <button
                onClick={() => router.push('/import')}
                className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline decoration-2 underline-offset-4 transition-all whitespace-nowrap font-black text-xl tracking-tighter uppercase leading-8"
              >
                {t('templates.importResume')}
              </button>
            </div>
          </h1>

          {isUploading && (
            <p className="mt-4 text-[10px] font-bold text-blue-600 animate-pulse uppercase tracking-widest flex items-center justify-center gap-2">
              <Loader2 className="size-3 animate-spin" /> {t('templates.readingAI')}
            </p>
          )}
          {error && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{error}</p>}
        </div>

        {/* Horizontal Slider Wrapper - CENTRALIZED */}
        <div className="relative group w-full max-w-7xl flex items-center mx-auto px-12">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-[-20px] md:left-[-40px] z-20 size-10 bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-90"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Scrolling Container */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth no-scrollbar w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="flex-none w-[220px] md:w-[260px] snap-center group relative bg-white dark:bg-[#15202b] border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:border-blue-600/50 transition-all duration-500 flex flex-col h-[340px] md:h-[400px]"
              >
                <div className="relative flex-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <Image
                    fill
                    sizes="(max-width: 768px) 220px, 260px"
                    alt={t(`templates.list.${template.id}.name` as any) || template.name}
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    src={template.imageSrc}
                  />

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-6 backdrop-blur-[2px]">
                    <button
                      onClick={() => handleCreateResume(template.id)}
                      disabled={(isPending && creatingId === template.id) || isUploading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-black text-[10px] uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center disabled:opacity-70 border-b-4 border-blue-800 active:border-b-0 active:translate-y-[2px]"
                    >
                      {isPending && creatingId === template.id ? (
                        <><Loader2 className="size-4 animate-spin mr-2" /> {t('templates.creating')}</>
                      ) : t('templates.useTemplate')}
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="w-full bg-white hover:bg-slate-100 text-slate-900 h-12 font-black text-[10px] uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 border-b-4 border-slate-200 active:border-b-0 active:translate-y-[2px]"
                    >
                      {t('templates.viewExample')}
                    </button>
                  </div>

                  <div className="absolute top-2 right-2 bg-slate-900/90 text-white text-[8px] font-black px-2 py-1 border border-slate-700 flex items-center gap-1 uppercase tracking-widest">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    {t('templates.atsLabel')} {template.ats}%
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-[10px] text-slate-900 dark:text-white uppercase tracking-tighter line-clamp-1">{t(`templates.list.${template.id}.name` as any) || template.name}</h3>
                    <span className="text-[7px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 uppercase tracking-widest shrink-0">
                      {t(`templates.list.${template.id}.style` as any) || template.style}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-500 leading-tight line-clamp-1 font-medium">{t(`templates.list.${template.id}.description` as any) || template.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-[-20px] md:right-[-40px] z-20 size-10 bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-90"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-md transition-all duration-500">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#15202b] rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <div className="flex flex-col">
                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">{t(`templates.list.${previewTemplate.id}.name` as any) || previewTemplate.name}</h3>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t(`templates.list.${previewTemplate.id}.style` as any) || previewTemplate.style}</span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white rounded-none transition-all text-slate-600 dark:text-slate-300"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-900 flex justify-center custom-scrollbar">
              <div className="relative w-full max-w-3xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-slate-700 bg-white rounded-none">
                <Image
                  width={1200}
                  height={1600}
                  alt={t(`templates.list.${previewTemplate.id}.name` as any) || previewTemplate.name}
                  className="w-full h-auto object-contain"
                  src={previewTemplate.imageSrc}
                  priority
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 bg-white dark:bg-slate-800">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-6 py-3 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none transition-all"
              >
                {t('templates.close')}
              </button>
              <button
                onClick={() => handleCreateResume(previewTemplate.id)}
                disabled={(isPending && creatingId === previewTemplate.id) || isUploading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-70 active:scale-95"
              >
                {isPending && creatingId === previewTemplate.id ? (
                  <><Loader2 className="size-4 animate-spin" /> {t('templates.creating')}</>
                ) : t('templates.useNow')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
