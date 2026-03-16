'use client';

import dynamic from 'next/dynamic';
import { Download, Plus, Minus, Loader2, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Lazy-loaded heavy client components
const EditorPanel = dynamic(
  () => import('@/components/editor/EditorPanel').then(m => ({ default: m.EditorPanel })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin size-8 text-blue-600" /></div> }
);
const ResumePreview = dynamic(
  () => import('@/components/editor/ResumePreview').then(m => ({ default: m.ResumePreview })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin size-6 text-slate-400" /></div> }
);
const AutoSaveSync = dynamic(
  () => import('@/components/editor/AutoSaveSync').then(m => ({ default: m.AutoSaveSync })),
  { ssr: false }
);
const GlobalErrorBoundary = dynamic(
  () => import('@/components/GlobalErrorBoundary').then(m => ({ default: m.GlobalErrorBoundary })),
  { ssr: false }
);
import { useRef, useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/useResumeStore';
import { useReactToPrint } from 'react-to-print';

export default function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation();
  const resolvedParams = use(params);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const loadLocalResume = useResumeStore(state => state.loadLocalResume);
  const syncStatus = useResumeStore(state => state.syncStatus);
  const data = useResumeStore(state => state.data);
  const router = useRouter();

  useEffect(() => {
    if (resolvedParams.id && resolvedParams.id !== 'new') {
      loadLocalResume(resolvedParams.id);
    }
  }, [resolvedParams.id, loadLocalResume]);

  useEffect(() => {
    // Only redirect if there's an error AND no data (truly doesn't exist)
    if (syncStatus === 'error' && (!data || !data.personalInfo)) {
      router.push('/modelos');
    }
  }, [syncStatus, data, router]);

  useEffect(() => {
    const handlePrintRequest = () => {
      if (reactToPrintFn) {
        reactToPrintFn();
      }
    };

    window.addEventListener('print-resume', handlePrintRequest);
    
    return () => {
      window.removeEventListener('print-resume', handlePrintRequest);
    };
  }, [reactToPrintFn]);

  const [isVerifying, setIsVerifying] = useState(false);

  const performVerification = useCallback(async () => {
    setIsVerifying(true);
    setShowNotification("Analisando currículo com IA...");

    setTimeout(() => {
      router.push(`/dashboard/${resolvedParams.id}`);
    }, 1500);
  }, [router, resolvedParams.id]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-[#101922]">
      <AutoSaveSync />

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel: Editor Form */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          <EditorPanel />
        </div>

        {/* Right Panel: Live Preview */}
        <section className="hidden lg:flex flex-[1.2] flex-col bg-slate-100 dark:bg-[#0b1219] p-8 overflow-hidden relative border-l border-slate-200 dark:border-slate-800">
          {/* Zoom Controls Overlay */}
          <div className="absolute top-6 right-8 flex gap-2 z-10 scale-90 origin-right">
            <div className="flex bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl rounded-none border border-slate-200 dark:border-slate-700 p-1.5 items-center gap-1">
              <button onClick={handleZoomOut} className="p-2 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="Zoom Out">
                <Minus className="size-4" />
              </button>
              <span className="min-w-[45px] text-center text-xs font-black text-slate-700 dark:text-slate-200">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomIn} className="p-2 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="Zoom In">
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-full flex justify-center overflow-auto pb-20 pt-4 custom-scrollbar">
            <div
              id="resume-print-container"
              ref={contentRef}
              className="shadow-2xl shadow-black/10 dark:shadow-black/40"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <GlobalErrorBoundary>
                <ResumePreview showPageBreaks={true} />
              </GlobalErrorBoundary>
            </div>
          </div>
        </section>
      </main>

      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-8 right-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl rounded-none p-4 flex items-center gap-4 z-[100] animate-in slide-in-from-right-10 duration-500">
          <div className="size-10 bg-blue-600 rounded-none flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
          <div className="pr-4">
            <h4 className="text-sm font-black uppercase tracking-tight">{t('dashboard.processing')}</h4>
            <p className="text-xs opacity-80 font-medium">{showNotification}</p>
          </div>
        </div>
      )}
    </div>
  );
}
