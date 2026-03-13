'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Upload, FileText, Calendar, ChevronLeft, ChevronRight, Loader2, BarChart3, Sparkles, CheckCircle2, AlertCircle, Trash2, Edit3, Save, Check, X, Info, Copy, Languages } from 'lucide-react';
import { createNewResume, deleteResume, getResumeData, duplicateResume, translateResumeAction } from '@/app/dashboard/actions';
import { ResumePreview } from '@/components/editor/ResumePreview';
import { useAISettingsStore } from '@/store/useAISettingsStore';
import { useTranslation } from '@/hooks/useTranslation';

interface Resume {
    id: string;
    createdAt: string;
    title?: string;
    score?: number;
    scores?: {
        design?: number;
        estrutura?: number;
        conteudo?: number;
    };
    personalInfo?: {
        fullName?: string;
        email?: string;
        phone?: string;
    };
}

export default function DashboardContent({ initialResumes }: { initialResumes: Resume[] }) {
    const { t, language } = useTranslation();
    const [resumes, setResumes] = useState(initialResumes);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadingAction, setLoadingAction] = useState<'create' | 'import' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fullResume, setFullResume] = useState<any>(null);
    const [isLoadingFullResume, setIsLoadingFullResume] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setResumes(initialResumes);
        if (currentIndex >= initialResumes.length && initialResumes.length > 0) {
            setCurrentIndex(Math.max(0, initialResumes.length - 1));
        }
    }, [initialResumes, currentIndex]);

    const selectedResume = resumes[currentIndex] || resumes[0];

    const designSuggestions = fullResume?.aiAnalysis?.detailedSuggestions?.filter((s: any) => s.type === 'design') || [];
    const structureSuggestions = fullResume?.aiAnalysis?.detailedSuggestions?.filter((s: any) => s.type === 'estrutura') || [];
    const contentSuggestions = fullResume?.aiAnalysis?.detailedSuggestions?.filter((s: any) => s.type === 'conteudo') || [];

    useEffect(() => {
        if (!selectedResume?.id) return;

        let isMounted = true;
        setIsLoadingFullResume(true);
        getResumeData(selectedResume.id, language).then(data => {
            if (isMounted) {
                setFullResume(data);
                setIsLoadingFullResume(false);
            }
        }).catch(err => {
            console.error(err);
            if (isMounted) setIsLoadingFullResume(false);
        });

        return () => { isMounted = false; };
    }, [selectedResume?.id, language]);

    const handleCreateNew = useCallback(async () => {
        setLoadingAction('create');
        try {
            const result = await createNewResume();
            if (result.success && result.id) {
                router.push(`/editor/${result.id}`);
            } else {
                setError(result.message || t('templates.error'));
            }
        } catch (err) {
            setError(t('templates.connectionError'));
        } finally {
            setLoadingAction(null);
        }
    }, [router, t]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const { importAI, importPrompt } = useAISettingsStore.getState();

        if (!importAI.apiKey) {
            setError(t('templates.errorNoApiKey'));
            return;
        }

        setLoadingAction('import');
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64 = event.target?.result as string;
                    const response = await fetch('/api/resumes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file: { base64, name: file.name, type: file.type },
                            aiSettings: { provider: importAI.provider, apiKey: importAI.apiKey, baseUrl: importAI.baseUrl, model: importAI.model, temperature: importAI.temperature, importPrompt }
                        })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || t('import.errorParsing'));
                    router.push(`/editor/${result.resumeId}`);
                } catch (err: any) {
                    setError(err.message || t('import.errorImporting'));
                    setLoadingAction(null);
                }
            };
            reader.onerror = () => { setError(t('import.errorReading')); setLoadingAction(null); };
            reader.readAsDataURL(file);
        } catch (err: any) {
            setError(t('import.errorSaving'));
            setLoadingAction(null);
        }
    };

    const handleDelete = async () => {
        if (!selectedResume) return;
        if (confirm(t('actions.confirmDelete') || 'Tem certeza que deseja excluir o currículo selecionado? Ele será deletado permanentemente do painel.')) {
            setIsDeleting(true);
            try {
                await deleteResume(selectedResume.id, language);

                // If it was the last resume, redirect to /modelos
                if (resumes.length === 1) {
                    router.push('/modelos');
                    return;
                }

                // Update local state for immediate feedback
                const updatedResumes = resumes.filter(r => r.id !== selectedResume.id);
                setResumes(updatedResumes);

                // Adjust current index if we deleted the last item in the list
                if (currentIndex >= updatedResumes.length) {
                    setCurrentIndex(Math.max(0, updatedResumes.length - 1));
                }

                // Force page refresh to update the UI
                router.refresh();
            } catch (err) {
                setError(t('templates.error'));
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleDuplicate = async () => {
        if (!selectedResume) return;
        setIsDuplicating(true);
        setError(null);
        try {
            const result = await duplicateResume(selectedResume.id, language);
            if (result.success && result.id) {
                router.push(`/editor/${result.id}`);
            } else {
                setError(result.message || t('templates.error'));
            }
        } catch (err) {
            setError(t('templates.error'));
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleTranslate = async () => {
        if (!selectedResume) return;
        
        const { primaryAI } = useAISettingsStore.getState();
        if (!primaryAI.apiKey) {
            setError(t('templates.errorNoApiKey'));
            return;
        }

        const targetLang = language === 'en' ? 'pt' : 'en';
        setIsTranslating(true);
        setError(null);
        try {
            const result = await translateResumeAction(selectedResume.id, targetLang, primaryAI);
            if (result.success && result.id) {
                router.push(`/editor/${result.id}`);
            } else {
                setError(result.message || t('templates.error'));
            }
        } catch (err) {
            setError(t('templates.error'));
        } finally {
            setIsTranslating(false);
        }
    };

    const getScoreColor = (score?: number) => {
        if (score === undefined) return 'text-slate-400';
        if (score >= 92) return 'text-emerald-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBgColor = (score?: number) => {
        if (score === undefined) return 'bg-slate-100 dark:bg-slate-800';
        if (score >= 92) return 'bg-emerald-100 dark:bg-emerald-900/30';
        if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    // Not rendering an empty state here because Home (page.tsx) handles redirect to /modelos
    if (resumes.length === 0) return null;

    return (
        <div className="w-full">
            <input
                id="import-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleImport}
                className="hidden"
            />
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center justify-between">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                    <button onClick={() => setError(null)} aria-label={t('actions.close') || "Fechar"} className="text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Main Content: Resume Preview + ATS Analysis */}
            <div className="flex gap-6 min-h-[600px] flex-col lg:flex-row">
                {/* Left Side - Realistic Resume Preview */}
                <div className="w-full lg:w-[350px] shrink-0 flex flex-col">
                    <div
                        className="flex-1 bg-slate-100 dark:bg-[#0b1219] border border-slate-200 dark:border-slate-700 overflow-hidden relative flex flex-col group cursor-pointer hover:border-blue-500/50 transition-all border-none"
                        onClick={() => router.push(`/editor/${selectedResume?.id}`)}
                    >
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors z-10 relative">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {t('dashboard.realPreview')}
                                </h3>
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{t('dashboard.clickToEdit')}</p>
                            </div>
                            {selectedResume?.score !== undefined && (
                                <div className={`px-2 py-1 ${getScoreBgColor(selectedResume.score)} border ${selectedResume.score >= 80 ? 'border-emerald-200 dark:border-emerald-800' : selectedResume.score >= 50 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800'}`}>
                                    <span className={`text-sm font-black ${getScoreColor(selectedResume.score)}`}>{selectedResume.score}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex items-start justify-center p-0 relative overflow-hidden bg-slate-200/50 dark:bg-slate-900" style={{ minHeight: '460px' }}>
                            {isLoadingFullResume || !fullResume ? (
                                <div className="absolute inset-0 flex flex-col justify-center items-center z-10">
                                    <Loader2 className="size-6 animate-spin text-blue-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('editor.loadingModel')}</span>
                                </div>
                            ) : (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2">
                                    <div
                                        className="shadow-2xl transition-all duration-500 bg-white"
                                        style={{
                                            transform: 'scale(0.35)',
                                            transformOrigin: 'top center',
                                            width: '210mm',
                                            height: 'auto',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <ResumePreview data={fullResume as any} />
                                    </div>
                                </div>
                            )}

                            {/* Overlay de Hover para Edição */}
                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 z-20">
                                    <div className="bg-blue-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                                        <Sparkles className="size-3" />
                                        {t('actions.openEditor')}
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - ATS Analysis */}
                <div className="flex-1 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                    {/* Enterprise Action Header (Globally on Right Side) */}
                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {t('dashboard.workspaceTitle')}
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-1">{t('dashboard.workspaceSubtitle')}</p>
                        </div>

                        <div className="flex xl:items-center gap-3 mt-4 xl:mt-0">
                        </div>
                    </div>

                    {selectedResume?.score === undefined ? (
                        <div className="h-full flex flex-col items-center justify-center py-10">
                            <div className="size-20 bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-6 border border-amber-200 dark:border-amber-800">
                                <Sparkles className="size-10 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{t('dashboard.atsAnalysisTitle')}</h3>
                            <p className="text-sm text-slate-500 max-w-md text-center mb-6">{t('dashboard.atsAnalysisDescription')}</p>
                                        <Link
                                            href={`/dashboard/${selectedResume?.id}`}
                                            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            {t('actions.fullAnalysis')}
                                        </Link>
                        </div>
                    ) : (
                        <div>
                            {/* Header Status */}
                            <div className="flex items-center justify-end mb-4">
                                <div className="flex items-center gap-2">
                                    {selectedResume.score >= 80 ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5" role="status" aria-label={`Status: ${t('dashboard.statusApproved')}`}>
                                            <CheckCircle2 className="size-4" aria-hidden="true" />
                                            {t('dashboard.statusApproved')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5" role="status" aria-label={`Status: ${t('dashboard.statusImprove')}`}>
                                            <AlertCircle className="size-4" aria-hidden="true" />
                                            {t('dashboard.statusImprove')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Scores Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className={`p-6 ${getScoreBgColor(selectedResume.score)} border-2 ${selectedResume.score >= 80 ? 'border-emerald-500' : selectedResume.score >= 50 ? 'border-amber-500' : 'border-red-500'}`}>
                                    <div className={`text-4xl font-black ${getScoreColor(selectedResume.score)} mb-2`}>
                                        {selectedResume.score}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.generalScore')}</div>
                                </div>

                                <div className={`p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700`}>
                                    <div className={`text-3xl font-black ${getScoreColor(selectedResume.scores?.design)} mb-2`}>
                                        {selectedResume.scores?.design ?? '-'}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.designScore')}</div>
                                </div>

                                <div className={`p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700`}>
                                    <div className={`text-3xl font-black ${getScoreColor(selectedResume.scores?.estrutura)} mb-2`}>
                                        {selectedResume.scores?.estrutura ?? '-'}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.structureScore')}</div>
                                </div>

                                <div className={`p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700`}>
                                    <div className={`text-3xl font-black ${getScoreColor(selectedResume.scores?.conteudo)} mb-2`}>
                                        {selectedResume.scores?.conteudo ?? '-'}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.contentScore')}</div>
                                </div>
                            </div>

                            {/* Analysis Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{t('analysis.details')}</h4>

                                <div className="space-y-3">
                                    {selectedResume.scores?.design !== undefined && (
                                        <details className="group">
                                            <summary className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('dashboard.visualDesign')}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700">
                                                        <div
                                                            className={`h-full ${selectedResume.scores.design >= 80 ? 'bg-emerald-500' : selectedResume.scores.design >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${selectedResume.scores.design}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black ${getScoreColor(selectedResume.scores.design)}`}>
                                                        {selectedResume.scores.design}%
                                                    </span>
                                                    <ChevronRight className="size-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                </div>
                                            </summary>
                                            <div className="p-4 bg-white dark:bg-slate-900/30 border-x border-b border-slate-200 dark:border-slate-700">
                                                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {designSuggestions.length > 0 ? (
                                                        designSuggestions.map((suggestion: any, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <AlertCircle className={`size-4 mt-0.5 shrink-0 ${suggestion.impact === 'high' ? 'text-red-500' : suggestion.impact === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                                                                <div>
                                                                    <span className="font-medium">{suggestion.field}: </span>
                                                                    <span>{suggestion.suggestion}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : selectedResume.scores?.design >= 80 ? (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.whitespace')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.typography')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.balancedLayout')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 font-bold">
                                                                {t('dashboard.feedback.designExcellent')}
                                                            </p>
                                                        </>
                                                    ) : selectedResume.scores?.design >= 50 ? (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.fontConsistency')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.sectionSpacing')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.moreWhitespace')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                                {t('dashboard.feedback.designGood')}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.clutteredLayout')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.inconsistentFonts')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.cleanerTemplate')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 font-bold">
                                                                {t('dashboard.feedback.designAttention')}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    {selectedResume.scores?.estrutura !== undefined && (
                                        <details className="group">
                                            <summary className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('dashboard.resumeStructure')}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700">
                                                        <div
                                                            className={`h-full ${selectedResume.scores.estrutura >= 80 ? 'bg-emerald-500' : selectedResume.scores.estrutura >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${selectedResume.scores.estrutura}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black ${getScoreColor(selectedResume.scores.estrutura)}`}>
                                                        {selectedResume.scores.estrutura}%
                                                    </span>
                                                    <ChevronRight className="size-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                </div>
                                            </summary>
                                            <div className="p-4 bg-white dark:bg-slate-900/30 border-x border-b border-slate-200 dark:border-slate-700">
                                                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {structureSuggestions.length > 0 ? (
                                                        structureSuggestions.map((suggestion: any, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <AlertCircle className={`size-4 mt-0.5 shrink-0 ${suggestion.impact === 'high' ? 'text-red-500' : suggestion.impact === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                                                                <div>
                                                                    <span className="font-medium">{suggestion.field}: </span>
                                                                    <span>{suggestion.suggestion}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : selectedResume.scores.estrutura >= 80 ? (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.organizedSections')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.atsOptimized')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.relevantInfo')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 font-bold">
                                                                {t('dashboard.feedback.structureExcellent')}
                                                            </p>
                                                        </>
                                                    ) : selectedResume.scores.estrutura >= 50 ? (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.clearSections')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.logicalOrder')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.addProjects')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                                {t('dashboard.feedback.structureGood')}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.disorganized')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                                                                <span>{t('dashboard.checks.badOrder')}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                                                <span>{t('messages.experienceNotTop')}</span>
                                                            </div>
                                                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 font-bold">
                                                                {t('dashboard.feedback.structureAttention')}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    {selectedResume.scores?.conteudo !== undefined && (
                                        <details className="group">
                                            <summary className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('dashboard.contentQuality')}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700">
                                                        <div
                                                            className={`h-full ${selectedResume.scores.conteudo >= 80 ? 'bg-emerald-500' : selectedResume.scores.conteudo >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${selectedResume.scores.conteudo}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black ${getScoreColor(selectedResume.scores.conteudo)}`}>
                                                        {selectedResume.scores.conteudo}%
                                                    </span>
                                                    <ChevronRight className="size-4 text-slate-400 group-open:rotate-90 transition-transform" />
                                                </div>
                                            </summary>
                                            <div className="p-4 bg-white dark:bg-slate-900/30 border-x border-b border-slate-200 dark:border-slate-700">
                                                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-start gap-2">
                                                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                        <span>{t('dashboard.checks.actionVerbs')}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                                                        <span>{t('dashboard.checks.quantifiedResults')}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                                        <span>{t('dashboard.checks.moreKeywords')}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                        {t('dashboard.feedback.contentAdvice')}
                                                    </p>
                                                </div>
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </div>

                            {/* CTA */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
