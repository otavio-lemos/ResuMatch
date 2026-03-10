'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit3 } from 'lucide-react';
import ATSAnalysisView from '@/components/dashboard/ATSAnalysisView';
import { useResumeStore } from '@/store/useResumeStore';
import { getScore } from '@/lib/ats-engine';
import { useTranslation } from '@/hooks/useTranslation';

export default function ATSDashboardPage() {
  const params = useParams();
  const resumeId = params.id as string;
  const { t } = useTranslation();

  const { data, loadLocalResume } = useResumeStore();
  const score = getScore(data);

  useEffect(() => {
    if (resumeId && resumeId !== 'new') {
      loadLocalResume(resumeId);
    }
  }, [resumeId, loadLocalResume]);

  // Se não houver dados, mostrar loading
  if (!data || !data.personalInfo) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-[#0b1219] flex items-center justify-center">
      <div className="text-slate-500">{t('loading')}</div>
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
