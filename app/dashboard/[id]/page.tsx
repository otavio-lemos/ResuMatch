'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import ATSAnalysisView from '@/components/dashboard/ATSAnalysisView';
import { useResumeStore } from '@/store/useResumeStore';
import { useAISettingsStore } from '@/store/useAISettingsStore';
import { getScore } from '@/lib/ats-engine';
import { useTranslation } from '@/hooks/useTranslation';

export default function ATSDashboardPage() {
  const params = useParams();
  const resumeId = params.id as string;
  const { t, language } = useTranslation();

  const { data, loadLocalResume, syncStatus, analyzeResume, isAnalyzing } = useResumeStore();
  const { atsPrompt, importAI } = useAISettingsStore();
  const router = useRouter();
  const [startedAnalysis, setStartedAnalysis] = useState(false);
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

  // Quando não há análise e ainda não iniciou, inicia automaticamente
  useEffect(() => {
    if (data?.personalInfo?.fullName && !data.aiAnalysis && !startedAnalysis && !isAnalyzing) {
      setStartedAnalysis(true);
      const aiSettings = importAI ? {
        provider: importAI.provider,
        apiKey: importAI.apiKey,
        model: importAI.model,
        baseUrl: importAI.baseUrl,
        temperature: importAI.temperature,
        topP: importAI.topP,
        topK: importAI.topK,
        maxTokens: importAI.maxTokens
      } : null;
      analyzeResume(atsPrompt, undefined, aiSettings as any, language);
    }
  }, [data, startedAnalysis, isAnalyzing, analyzeResume, atsPrompt, importAI, language]);

  // Se não houver dados, mostrar loading
  if (!data || !data.personalInfo || !data.personalInfo.fullName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0b1219]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 text-blue-600 animate-spin" />
          <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('actions.loading')}</div>
        </div>
      </div>
    );
  }

  // Se não há análise ainda, mostrar ATSAnalysisView (que mostra o chat de análise)
  if (!data.aiAnalysis) {
    return (
      <div className="flex flex-col bg-slate-50 dark:bg-[#0b1219]">
        <div className="w-full mx-auto px-[10%] py-8 pb-24">
          <ATSAnalysisView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-[#0b1219]">
      <div className="w-full mx-auto px-[10%] py-8 pb-24">
        <ATSAnalysisView />
      </div>
    </div>
  );
}
