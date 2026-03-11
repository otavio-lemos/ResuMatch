'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit3, Loader2 } from 'lucide-react';
import ATSAnalysisView from '@/components/dashboard/ATSAnalysisView';
import { useResumeStore } from '@/store/useResumeStore';
import { getScore } from '@/lib/ats-engine';
import { useTranslation } from '@/hooks/useTranslation';

export default function ATSDashboardPage() {
  const params = useParams();
  const resumeId = params.id as string;
  const { t } = useTranslation();

  const { data, loadLocalResume, syncStatus } = useResumeStore();
  const router = useRouter();
  const score = getScore(data);

  useEffect(() => {
    if (resumeId && resumeId !== 'new') {
      loadLocalResume(resumeId);
    }
  }, [resumeId, loadLocalResume]);

  // Redirect if resume doesn't exist (after loading attempt)
  useEffect(() => {
    if (syncStatus === 'error') {
      router.push('/modelos');
    }
  }, [syncStatus, router]);

  // Se não houver dados, mostrar loading
  if (!data || !data.personalInfo || !data.personalInfo.fullName) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-[#0b1219] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 text-blue-600 animate-spin" />
          <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('actions.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-[#0b1219]">
      {/* Barra removida - informações agora no cabeçalho principal */}

      <div className="w-full mx-auto px-[10%] py-8">
        <ATSAnalysisView />
      </div>
    </div>
  );
}
