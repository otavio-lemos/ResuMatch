'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
    BarChart2, Plus, Sparkles, RefreshCw, SpellCheck, Edit2,
    Trash2, Loader2, Info, ChevronDown, ChevronUp, X,
    Search, CheckCircle2, ChevronLeft, ChevronRight, Upload, ArrowRight, ShieldAlert, Undo2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useResumeStore, ResumeData, SectionConfig, Experience, Education, DatedListItem } from '@/store/useResumeStore';
import { useAISettingsStore } from '@/store/useAISettingsStore';
import { getScore } from '@/lib/ats-engine';
import { rewriteText, correctGrammar, generateSummaryAI, generateATSAnalysis, parseResumeFromPDF } from '@/app/actions/ai';
import NextImage from 'next/image';
import { TEMPLATES } from '@/lib/templates';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';

export function EditorPanel() {
    const router = useRouter();
    const {
        data,
        resumeId,
        activeSection,
        syncStatus,
        setActiveSection,
        updatePersonalInfo,
        updateSummary,
        addExperience,
        updateExperience,
        removeExperience,
        addEducation,
        updateEducation,
        removeEducation,
        addSkillCategory,
        updateSkillCategory,
        removeSkillCategory,
        updateAppearance,
        setTemplateId,
        reorderSections,
        removeSection,
        updateSectionListItem,
        addSectionListItem,
        removeSectionListItem,
        updateSectionContent,
        renameSection,
        saveLocalResume,
        setFullData,
        setAiAnalysis,
        setJobDescription
    } = useResumeStore();

    const { primaryAI, importAI, editorAI, importPrompt, summaryPrompt, rewritePrompt, grammarPrompt, atsPrompt } = useAISettingsStore();

    const [isGeneratingRefine, setIsGeneratingRefine] = useState<string | null>(null);
    const [isGeneratingGrammar, setIsGeneratingGrammar] = useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [undoHistory, setUndoHistory] = useState<Record<string, string>>({});
    const [isAnalyzingATS, setIsAnalyzingATS] = useState(false);
    const [isImportingPDF, setIsImportingPDF] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showATSDetails, setShowATSDetails] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [localTitle, setLocalTitle] = useState<{ id: string, value: string } | null>(null);
    
    // ATS Analysis bubbles for transparency
    const [atsBubbles, setAtsBubbles] = useState<{from: 'user' | 'ai', text: string}[]>([]);

    const { t } = useTranslation();
    const language = useLanguageStore((state) => state.language);
    const { personalInfo, summary, experiences, education, skills, jobDescription } = data;

    const handleAIAssist = async (type: 'refresh' | 'grammar', expId: string, text: string) => {
        if (!text) return;

        const authSettings = {
            ...editorAI,
            rewritePrompt,
            grammarPrompt
        };
        setAiError(null);
        setUndoHistory(prev => ({ ...prev, [expId]: text }));

         try {
            if (type === 'refresh') {
                setIsGeneratingRefine(expId);
                const result = await rewriteText(text, authSettings, language);
                console.log('[EDITOR REWRITE] === TRANSPARÊNCIA TOTAL ===');
                console.log('[EDITOR REWRITE] SKILL:', (result as any).debug?.skill?.substring(0, 500) || 'N/A');
                console.log('[EDITOR REWRITE] USER PROMPT:', (result as any).debug?.userPrompt || 'N/A');
                console.log('[EDITOR REWRITE] RAW RESPONSE:', (result as any).debug?.rawResponse || 'N/A');
                updateExperience(expId, { description: result.response });
            } else {
                setIsGeneratingGrammar(expId);
                const result = await correctGrammar(text, authSettings, language);
                console.log('[EDITOR GRAMMAR] === TRANSPARÊNCIA TOTAL ===');
                console.log('[EDITOR GRAMMAR] SKILL:', (result as any).debug?.skill?.substring(0, 500) || 'N/A');
                console.log('[EDITOR GRAMMAR] USER PROMPT:', (result as any).debug?.userPrompt || 'N/A');
                console.log('[EDITOR GRAMMAR] RAW RESPONSE:', (result as any).debug?.rawResponse || 'N/A');
                updateExperience(expId, { description: result.response });
            }
        } catch (error: any) {
            console.error(error);
            setAiError(error.message || 'Erro ao processar texto com IA');
            setUndoHistory(prev => { const newH = {...prev}; delete newH[expId]; return newH; });
        } finally {
            setIsGeneratingRefine(null);
            setIsGeneratingGrammar(null);
        }
    };

    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        setAiError(null);
        const authSettings = {
            ...editorAI,
            summaryPrompt
        };
        setUndoHistory(prev => ({ ...prev, ['summary']: summary }));
         try {
            const result = await generateSummaryAI(data, authSettings, language);
            console.log('[EDITOR SUMMARY] === TRANSPARÊNCIA TOTAL ===');
            console.log('[EDITOR SUMMARY] SKILL:', (result as any).debug?.skill?.substring(0, 500) || 'N/A');
            console.log('[EDITOR SUMMARY] USER PROMPT:', (result as any).debug?.userPrompt || 'N/A');
            console.log('[EDITOR SUMMARY] RAW RESPONSE:', (result as any).debug?.rawResponse || 'N/A');
            updateSummary(result.response);
        } catch (error: any) {
            console.error(error);
            setAiError(error.message || 'Erro ao gerar resumo com IA');
            setUndoHistory(prev => { const newH = {...prev}; delete newH['summary']; return newH; });
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleATSVerify = async () => {
        setIsAnalyzingATS(true);
        setAiError(null);
        setAtsBubbles([{ from: 'user', text: '🔄 Iniciando análise ATS...' }]);
        const authSettings = {
            ...primaryAI,
            atsPrompt
        };
        try {
             const jobDesc = typeof data.jobDescription === 'string' ? data.jobDescription : '';
             const result = await generateATSAnalysis(data, jobDesc, authSettings, language);
             
             // Adicionar transparência total - skill, prompt e resposta
             const debugInfo = (result as any).debug;
             if (debugInfo) {
                 setAtsBubbles(prev => [
                     ...prev,
                     { from: 'ai', text: '🎯 SKILL (System Instruction):' },
                     { from: 'ai', text: debugInfo.skill?.substring(0, 500) + (debugInfo.skill?.length > 500 ? '...[TRUNCATED]' : '') || 'N/A' },
                     { from: 'ai', text: '📤 USER PROMPT:' },
                     { from: 'ai', text: debugInfo.userPrompt?.substring(0, 500) + (debugInfo.userPrompt?.length > 500 ? '...[TRUNCATED]' : '') || 'N/A' },
                     { from: 'ai', text: '📥 RAW LLM RESPONSE:' },
                     { from: 'ai', text: debugInfo.rawResponse?.substring(0, 1000) + (debugInfo.rawResponse?.length > 1000 ? '...[TRUNCATED]' : '') || 'N/A' }
                 ]);
             }
             
             console.log('[ATS ANALYSIS] === TRANSPARÊNCIA TOTAL ===');
             console.log('[ATS ANALYSIS] SKILL:', (result as any).debug?.skill?.substring(0, 500) || 'N/A');
             console.log('[ATS ANALYSIS] USER PROMPT:', (result as any).debug?.userPrompt || 'N/A');
             console.log('[ATS ANALYSIS] RAW RESPONSE:', (result as any).debug?.rawResponse || 'N/A');
            setAiAnalysis(result.response);
            setShowATSDetails(true);
            await saveLocalResume();
        } catch (error: any) {
            console.error(error);
            setAiError(error.message || 'Erro na análise ATS com IA');
            setAtsBubbles(prev => [...prev, { from: 'ai', text: `❌ Erro: ${error.message}` }]);
        } finally {
            setIsAnalyzingATS(false);
        }
    };

    const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImportingPDF(true);
        setImportError(null);

        const authSettings = {
            ...importAI,
            importPrompt: importPrompt
        };

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64 = event.target?.result as string;
                    const { data: parsedData, error: parseError } = await parseResumeFromPDF(base64, authSettings, language);

                    if (parseError) throw new Error(parseError);
                    if (!parsedData) throw new Error('Nenhum dado extraído do PDF.');

                    // Merge with current defaults and structure
                    const newData: ResumeData = {
                        ...data,
                        personalInfo: { ...data.personalInfo, ...(parsedData.personalInfo || {}) },
                        summary: parsedData.summary || data.summary,
                        experiences: (parsedData.experiences as any) || data.experiences,
                        education: (parsedData.education as any) || data.education,
                        skills: (parsedData.skills as any) || data.skills,
                    };

                    setFullData(newData);
                } catch (err: any) {
                    setImportError(err.message || 'Erro ao processar PDF');
                } finally {
                    setIsImportingPDF(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setImportError('Erro ao ler arquivo');
            setIsImportingPDF(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhotoError(null);

        // Validar tamanho (1MB)
        if (file.size > 1024 * 1024) {
            setPhotoError('A imagem deve ter no máximo 1MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target?.result as string;
            updatePersonalInfo({ photoUrl: base64String });
        };
        reader.onerror = () => {
            setPhotoError('Erro ao ler o arquivo. Tente novamente.');
        };
        reader.readAsDataURL(file);
    };

    const analysis = data.aiAnalysis;
    const overallScore = getScore(data);

    return (
        <section className="flex-1 flex flex-col min-w-[320px] max-w-3xl overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {/* Sync Status Banner */}
            {syncStatus === 'saving' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 p-2 flex items-center justify-center gap-2">
                    <Loader2 className="size-3 animate-spin text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('actions.saving')}</span>
                </div>
            )}
            {syncStatus === 'saved' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 p-2 flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t('actions.saved')}</span>
                </div>
            )}
            {syncStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 p-2 flex items-center justify-center gap-2">
                    <ShieldAlert className="size-3 text-red-500" />
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">{t('actions.saveError') || 'Erro ao salvar'}</span>
                </div>
            )}

            {aiError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 p-3 flex items-center justify-between" role="alert" aria-live="polite">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">⚠️ {aiError}</p>
                    <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600" aria-label="Fechar mensagem de erro">
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {/* Optimization Score Header - COMPACT */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 p-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => setShowATSDetails(!showATSDetails)}
                        className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                    >
                        <BarChart2 className="text-blue-600 size-4" />
                        <div className="flex flex-col items-start">
                            <p className="text-slate-900 dark:text-white text-xs font-bold flex items-center gap-1 uppercase tracking-tight">
                                {t('analysis.atsFriendly')} 
                                {showATSDetails ? <ChevronUp className="size-2.5 text-slate-400" /> : <ChevronDown className="size-2.5 text-slate-400" />}
                            </p>
                            <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter group-hover:underline">{t('editor.viewCriteria')}</span>
                        </div>
                    </button>
                    <span className={`font-black text-base ${overallScore >= 80 ? 'text-emerald-600' : overallScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {overallScore}%
                    </span>
                </div>

                {showATSDetails && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-none border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="size-3 text-blue-600" /> {t('analysis.title')}
                            </h4>
                            <button onClick={() => { setShowATSDetails(false); setAtsBubbles([]); }} className="text-slate-400 hover:text-slate-600"><X className="size-3" /></button>
                        </div>

                        {/* ATS Transparency Bubbles */}
                        {(atsBubbles || []).length > 0 && (
                            <div className="mb-3 p-2 bg-blue-900/20 border border-blue-800/30 rounded text-[9px] max-h-40 overflow-y-auto">
                                <div className="text-[9px] font-black text-blue-400 uppercase mb-1">🔍 Debug Info:</div>
                                {atsBubbles.map((b, i) => (
                                    <div key={i} className={`flex gap-2 ${b.from === 'user' ? 'flex-row-reverse' : 'flex-row'} mb-1`}>
                                        <span className={b.from === 'user' ? 'text-emerald-400' : 'text-amber-400'}>{b.from === 'user' ? '👤' : '🤖'}</span>
                                        <span className="text-slate-300 whitespace-pre-wrap break-all">{b.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[
                                { label: t('dashboard.designScore'), score: analysis?.scores?.design ?? 0 },
                                { label: t('dashboard.structureScore'), score: analysis?.scores?.estrutura ?? 0 },
                                { label: t('dashboard.contentScore'), score: analysis?.scores?.conteudo ?? 0 },
                            ].map((item, i) => {
                                const percentage = item.score;
                                const barColor = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500';
                                const textColor = percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600';

                                return (
                                    <div key={i} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-[9px] uppercase font-black">
                                            <span className="text-slate-500">{item.label}</span>
                                            <span className={textColor}>{item.score}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-none overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Detailed Checks - Same as ATS view */}
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Design Checks */}
                            <div className="space-y-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1 mb-2">{t('dashboard.visualDesign')}</p>
                                {analysis?.designChecks?.map((c: any, i: number) => (
                                    <div key={`d-${i}`} className="flex items-start gap-1.5 text-[9px]">
                                        {c.passed ? <CheckCircle2 className="size-2.5 text-emerald-500 mt-0.5 shrink-0" /> : <ShieldAlert className="size-2.5 text-amber-500 mt-0.5 shrink-0" />}
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 dark:text-white font-bold leading-none mb-0.5">{c.label}</span>
                                            <span className="text-slate-500 dark:text-slate-400 leading-tight">{c.feedback}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Structure Checks */}
                            <div className="space-y-1.5 pt-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1 mb-2">{t('dashboard.resumeStructure')}</p>
                                {analysis?.estruturaChecks?.map((c: any, i: number) => (
                                    <div key={`e-${i}`} className="flex items-start gap-1.5 text-[9px]">
                                        {c.passed ? <CheckCircle2 className="size-2.5 text-emerald-500 mt-0.5 shrink-0" /> : <ShieldAlert className="size-2.5 text-amber-500 mt-0.5 shrink-0" />}
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 dark:text-white font-bold leading-none mb-0.5">{c.label}</span>
                                            <span className="text-slate-500 dark:text-slate-400 leading-tight">{c.feedback}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Content Metrics */}
                            <div className="space-y-2 pt-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1 mb-2">{t('dashboard.contentQuality')}</p>
                                {analysis?.conteudoMetrics && Object.entries(analysis.conteudoMetrics).map(([key, metric]: [string, any]) => (
                                    <div key={key} className="space-y-1">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                            <span className="text-slate-500">{t(`analysis.metrics.${key}` as any) || key}</span>
                                            <span className={metric.status === 'good' ? 'text-emerald-500' : metric.status === 'warning' ? 'text-amber-500' : 'text-red-500'}>
                                                {metric.value}
                                            </span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                            <div className={`h-full transition-all ${metric.status === 'good' ? 'bg-emerald-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => router.push(`/dashboard/${resumeId}`)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                            >
                                {t('actions.viewFullAnalysis')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-none h-1.5 mb-1">
                    <div className={`h-1.5 rounded-none ${overallScore >= 80 ? 'bg-emerald-500' : overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${overallScore}%` }}></div>
                </div>
            </div>

            {/* Navigation Tabs - COMPACT */}
            <div className="px-4 pt-3">
                <div className="flex border-b border-slate-200 dark:border-slate-700 gap-3 overflow-x-auto no-scrollbar">
                    {data.sectionsConfig.filter(s => s.active).map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`pb-2 border-b-2 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${activeSection === section.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600'
                                }`}
                        >
                            {t(`sections.${section.id}`) || section.title}
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveSection('appearance')}
                        className={`pb-2 border-b-2 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${activeSection === 'appearance'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600'
                            }`}
                    >
                        {t('editor.appearance') || 'Aparência'}
                    </button>
                    <button
                        onClick={() => setActiveSection('sections-config')}
                        className={`pb-2 border-b-2 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${activeSection === 'sections-config'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600'
                            }`}
                    >
                        {t('nav.sections') || 'Seções'}
                    </button>
                </div>
            </div>

            {/* Form Content - COMPACT (Matching Config) */}
            <div className="p-4 space-y-4">
                {activeSection === 'personal' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between mb-3 group">
                                {editingTitleId === 'personal' ? (
                                    <input
                                        autoFocus
                                        className="text-sm font-bold bg-transparent border-b border-blue-600 outline-none w-full uppercase"
                                        value={localTitle?.id === 'personal' ? localTitle.value : (data.sectionsConfig.find(s => s.id === 'personal')?.title || '')}
                                        onChange={(e) => setLocalTitle({ id: 'personal', value: e.target.value })}
                                        onBlur={() => {
                                            renameSection('personal', localTitle?.value || '');
                                            setEditingTitleId(null);
                                            setLocalTitle(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && (renameSection('personal', localTitle?.value || ''), setEditingTitleId(null), setLocalTitle(null))}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                            {data.sectionsConfig.find(s => s.id === 'personal')?.title}
                                        </h3>
                                        <button onClick={() => {
                                            setEditingTitleId('personal');
                                            setLocalTitle({ id: 'personal', value: data.sectionsConfig.find(s => s.id === 'personal')?.title || '' });
                                        }} className="p-1 text-slate-400 hover:text-blue-600">
                                            <Edit2 className="size-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="fullName" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.name')}</label>
                                    <input
                                        id="fullName"
                                        autoComplete="name"
                                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                        value={personalInfo.fullName}
                                        onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="title" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.title')}</label>
                                    <input
                                        id="title"
                                        autoComplete="organization-title"
                                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                        value={personalInfo.title}
                                        onChange={(e) => updatePersonalInfo({ title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.email')}</label>
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                            value={personalInfo.email}
                                            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.phone')}</label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            autoComplete="tel"
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                            value={personalInfo.phone}
                                            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="location" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.location')}</label>
                                    <input
                                        id="location"
                                        autoComplete="address-level2"
                                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                        value={personalInfo.location}
                                        onChange={(e) => updatePersonalInfo({ location: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.linkedin')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                            value={personalInfo.linkedin}
                                            onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Github</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                            value={personalInfo.github || ''}
                                            onChange={(e) => updatePersonalInfo({ github: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('form.portfolio')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                            value={personalInfo.portfolio}
                                            onChange={(e) => updatePersonalInfo({ portfolio: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Photo Upload - COMPACT */}
                                <div className="pt-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form.profilePhoto')}</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-none border border-slate-100 dark:border-slate-700">
                                            {personalInfo.photoUrl && (
                                                <div className="relative size-12 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm">
                                                    <NextImage src={personalInfo.photoUrl} alt={t('form.profilePhotoAlt')} fill className="object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-blue-600 file:text-white cursor-pointer"
                                                    onChange={handlePhotoUpload}
                                                />
                                                {photoError && <p className="text-red-500 text-[9px] font-bold mt-1 uppercase">{photoError}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-800">
                                            <Info className="size-3 text-amber-600 mt-0.5 shrink-0" />
                                            <p className="text-[9px] text-amber-700 dark:text-amber-300 leading-tight">
                                                <strong>{t('editor.atsNoteTitle')}</strong> {t('editor.atsNoteText')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'summary' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between mb-3 group">
                                {editingTitleId === 'summary' ? (
                                    <input
                                        autoFocus
                                        className="text-sm font-bold bg-transparent border-b border-blue-600 outline-none w-full uppercase"
                                        value={localTitle?.id === 'summary' ? localTitle.value : (data.sectionsConfig.find(s => s.id === 'summary')?.title || '')}
                                        onChange={(e) => setLocalTitle({ id: 'summary', value: e.target.value })}
                                        onBlur={() => {
                                            renameSection('summary', localTitle?.value || '');
                                            setEditingTitleId(null);
                                            setLocalTitle(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && (renameSection('summary', localTitle?.value || ''), setEditingTitleId(null), setLocalTitle(null))}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                            {data.sectionsConfig.find(s => s.id === 'summary')?.title}
                                        </h3>
                                        <button onClick={() => {
                                            setEditingTitleId('summary');
                                            setLocalTitle({ id: 'summary', value: data.sectionsConfig.find(s => s.id === 'summary')?.title || '' });
                                        }} className="p-1 text-slate-400 hover:text-blue-600">
                                            <Edit2 className="size-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    {undoHistory['summary'] && (
                                        <button
                                            onClick={() => {
                                                updateSummary(undoHistory['summary']);
                                                setUndoHistory(prev => { const newH = {...prev}; delete newH['summary']; return newH; });
                                            }}
                                            className="text-[9px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                                            title={t('actions.undo')}
                                        >
                                            <Undo2 className="size-2.5" />
                                            {t('actions.undo')}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleGenerateSummary}
                                        disabled={isGeneratingSummary}
                                        className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-tighter disabled:opacity-50"
                                    >
                                        {isGeneratingSummary ? <Loader2 className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
                                        {t('editor.generateWithAI')}
                                    </button>
                                </div>
                            </div>
                            <textarea
                                className="w-full rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs p-2.5 leading-relaxed font-medium outline-none focus:ring-1 focus:ring-blue-500"
                                rows={8}
                                value={summary}
                                onChange={(e) => updateSummary(e.target.value)}
                                placeholder={t('form.mainAchievements')}
                            />
                        </div>
                    </div>
                )}

                {activeSection === 'experience' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            {editingTitleId === 'experience' ? (
                                <input
                                    autoFocus
                                    className="text-sm font-bold bg-transparent border-b border-blue-600 outline-none w-full uppercase"
                                    value={localTitle?.id === 'experience' ? localTitle.value : (data.sectionsConfig.find(s => s.id === 'experience')?.title || '')}
                                    onChange={(e) => setLocalTitle({ id: 'experience', value: e.target.value })}
                                    onBlur={() => {
                                        renameSection('experience', localTitle?.value || '');
                                        setEditingTitleId(null);
                                        setLocalTitle(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && (renameSection('experience', localTitle?.value || ''), setEditingTitleId(null), setLocalTitle(null))}
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                        {data.sectionsConfig.find(s => s.id === 'experience')?.title}
                                    </h3>
                                    <button onClick={() => {
                                        setEditingTitleId('experience');
                                        setLocalTitle({ id: 'experience', value: data.sectionsConfig.find(s => s.id === 'experience')?.title || '' });
                                    }} className="p-1 text-slate-400 hover:text-blue-600">
                                        <Edit2 className="size-3" />
                                    </button>
                                </div>
                            )}
                            <button onClick={addExperience} className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <Plus className="size-3" /> Adicionar
                            </button>
                        </div>

                        {experiences.map((exp) => (
                            <div key={exp.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-4 relative shadow-sm">
                                <button onClick={() => removeExperience(exp.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
                                    <Trash2 className="size-3.5" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 mt-1">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.position')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                            value={exp.position}
                                            onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.company')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                            value={exp.company}
                                            onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.location')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                            value={exp.location}
                                            onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.startDate')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                type="text"
                                                placeholder="YYYY-MM"
                                                value={exp.startDate}
                                                onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.endDate')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                type="text"
                                                placeholder="YYYY-MM"
                                                value={exp.endDate}
                                                disabled={exp.current}
                                                onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600"
                                                checked={exp.current}
                                                onChange={(e) => updateExperience(exp.id, { current: e.target.checked })}
                                            /> {t('form.current')}
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.description')}</label>
                                        <div className="flex items-center gap-3">
                                            {undoHistory[exp.id] && (
                                                <button
                                                    onClick={() => {
                                                        updateExperience(exp.id, { description: undoHistory[exp.id] });
                                                        setUndoHistory(prev => { const newH = {...prev}; delete newH[exp.id]; return newH; });
                                                    }}
                                                    className="text-[9px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                                                    title={t('actions.undo')}
                                                >
                                                    <Undo2 className="size-2.5" />
                                                    {t('actions.undo')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAIAssist('refresh', exp.id, exp.description || `Cargo: ${exp.position}, Empresa: ${exp.company}`)}
                                                disabled={isGeneratingRefine === exp.id || isGeneratingGrammar === exp.id}
                                                className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-tighter disabled:opacity-50"
                                            >
                                                {isGeneratingRefine === exp.id ? <Loader2 className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
                                                {t('editor.generateWithAI')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            className="w-full rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-xs p-2.5 leading-relaxed font-medium outline-none focus:ring-1 focus:ring-blue-500"
                                            rows={4}
                                            value={exp.description}
                                            onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                                        />
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            <button
                                                onClick={() => handleAIAssist('grammar', exp.id, exp.description)}
                                                disabled={isGeneratingRefine === exp.id || isGeneratingGrammar === exp.id || !exp.description}
                                                className="px-2 py-1 text-[9px] font-bold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                title={t('form.correctGrammar')}
                                            >
                                                {isGeneratingGrammar === exp.id ? <Loader2 className="size-3 animate-spin" /> : <SpellCheck className="size-3" />}
                                                {t('form.grammar') || 'Gramática'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeSection === 'education' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            {editingTitleId === 'education' ? (
                                <input
                                    autoFocus
                                    className="text-sm font-bold bg-transparent border-b border-blue-600 outline-none w-full uppercase"
                                    value={localTitle?.id === 'education' ? localTitle.value : (data.sectionsConfig.find(s => s.id === 'education')?.title || '')}
                                    onChange={(e) => setLocalTitle({ id: 'education', value: e.target.value })}
                                    onBlur={() => {
                                        renameSection('education', localTitle?.value || '');
                                        setEditingTitleId(null);
                                        setLocalTitle(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && (renameSection('education', localTitle?.value || ''), setEditingTitleId(null), setLocalTitle(null))}
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                        {data.sectionsConfig.find(s => s.id === 'education')?.title}
                                    </h3>
                                    <button onClick={() => {
                                        setEditingTitleId('education');
                                        setLocalTitle({ id: 'education', value: data.sectionsConfig.find(s => s.id === 'education')?.title || '' });
                                    }} className="p-1 text-slate-400 hover:text-blue-600">
                                        <Edit2 className="size-3" />
                                    </button>
                                </div>
                            )}
                            <button onClick={addEducation} className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <Plus className="size-3" /> Adicionar
                            </button>
                        </div>

                        {education.map((edu) => (
                            <div key={edu.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-4 relative shadow-sm">
                                <button onClick={() => removeEducation(edu.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
                                    <Trash2 className="size-3.5" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                    <div className="col-span-2">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.course')} / {t('form.degree')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                            value={edu.degree}
                                            onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.institution')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                            value={edu.institution}
                                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.location')}</label>
                                        <input
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                            value={edu.location}
                                            onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.startDate')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                type="text"
                                                placeholder="YYYY-MM"
                                                value={edu.startDate}
                                                onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.endDate')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                type="text"
                                                placeholder="YYYY-MM"
                                                value={edu.endDate}
                                                disabled={edu.current}
                                                onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeSection === 'skills' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                {data.sectionsConfig.find(s => s.id === 'skills')?.title}
                            </h3>
                            <button onClick={addSkillCategory} className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <Plus className="size-3" /> {t('editor.addCategory') || 'Adicionar Categoria'}
                            </button>
                        </div>

                        {skills.map((group) => (
                            <div key={group.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-4 relative shadow-sm">
                                <button onClick={() => removeSkillCategory(group.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
                                    <Trash2 className="size-3.5" />
                                </button>
                                <div className="mb-3">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('editor.categoryName') || 'Nome da Categoria'}</label>
                                    <input
                                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                        value={group.category}
                                        onChange={(e) => updateSkillCategory(group.id, e.target.value, group.skills)}
                                        placeholder={t('editor.categoryPlaceholder') || "Ex: Linguagens, Ferramentas..."}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{t('sections.skills')}</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.skills.map((skill, idx) => (
                                            <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-none border border-slate-200 dark:border-slate-600">
                                                <input
                                                    className="bg-transparent border-none p-0 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-0 min-w-[60px]"
                                                    value={skill}
                                                    onChange={(e) => {
                                                        const newSkills = [...group.skills];
                                                        newSkills[idx] = e.target.value;
                                                        updateSkillCategory(group.id, group.category, newSkills);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newSkills = group.skills.filter(s => s !== skill);
                                                        updateSkillCategory(group.id, group.category, newSkills);
                                                    }}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => updateSkillCategory(group.id, group.category, [...group.skills, ''])}
                                            className="px-2 py-1 rounded-none border border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-400 hover:border-blue-500 hover:text-blue-500"
                                        >
                                            + {t('actions.add')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeSection === 'appearance' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-4">{t('editor.resumeModel')}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {TEMPLATES.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => setTemplateId(template.id)}
                                        className={`p-2 rounded-none border-2 text-center transition-all ${data.templateId === template.id
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                            }`}
                                    >
                                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {t(`templates.list.${template.id}.name` as any) || template.name}
                                            {template.recommended && <span className="ml-1 text-yellow-500">⭐</span>}
                                        </span>
                                        <span className="block text-[10px] text-slate-500 mt-1">{t('templates.atsLabel')} {template.ats}%</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-4">{t('editor.appearance') || 'Aparência do Currículo'}</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('editor.font')}</label>
                                    <select
                                        value={data.appearance.fontFamily}
                                        onChange={(e) => updateAppearance({ fontFamily: e.target.value })}
                                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                    >
                                        <option value="Inter">Inter ({t('editor.fontDefault')})</option>
                                        <option value="Arial">Arial ({t('editor.fontSafe')})</option>
                                        <option value="Calibri">Calibri</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Roboto">Roboto</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('editor.fontSize') || 'Tamanho'}</label>
                                        <select
                                            value={data.appearance.fontSize}
                                            onChange={(e) => updateAppearance({ fontSize: e.target.value })}
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                        >
                                            <option value="10">10pt</option>
                                            <option value="11">11pt</option>
                                            <option value="12">12pt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('editor.spacing')}</label>
                                        <select
                                            value={data.appearance.lineSpacing}
                                            onChange={(e) => updateAppearance({ lineSpacing: e.target.value })}
                                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                        >
                                            <option value="1.2">{t('editor.dense')}</option>
                                            <option value="1.5">{t('editor.normal')}</option>
                                            <option value="1.8">{t('editor.relaxed')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{t('editor.pageSize') || 'Tamanho da Página'}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'A4', label: 'A4', sub: '210×297mm' },
                                        { value: 'LETTER', label: 'Letter', sub: '8.5×11in' },
                                        { value: 'LEGAL', label: 'Legal', sub: '8.5×14in' },
                                        { value: 'EXECUTIVE', label: 'Exec.', sub: '7.2×10.5in' },
                                    ].map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => updateAppearance({ pageSize: p.value as any })}
                                            className={`px-3 py-2 rounded-none border-2 text-left transition-all ${data.appearance.pageSize === p.value
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                                                : 'border-slate-100 dark:border-slate-700 text-slate-500'
                                                }`}
                                        >
                                            <span className="block text-[10px] font-black uppercase">{p.label}</span>
                                            <span className="block text-[8px] opacity-70">{p.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'sections-config' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-4 tracking-tight">{t('editor.reorderSections') || 'Ativar / Reordenar Seções'}</h3>
                            <div className="space-y-2">
                                {data.sectionsConfig.map((section, idx) => (
                                    <div key={section.id} className="flex items-center justify-between p-2 rounded-none bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group">
                                        <div className="flex items-center gap-3">
                                            <button
                                                className="cursor-pointer text-slate-300 hover:text-slate-500"
                                                title={t('editor.moveUp') || "Mover para cima"}
                                                onClick={() => {
                                                    if (idx === 0) return;
                                                    const newOrder = [...data.sectionsConfig];
                                                    const temp = newOrder[idx];
                                                    newOrder[idx] = newOrder[idx - 1];
                                                    newOrder[idx - 1] = temp;
                                                    reorderSections(newOrder);
                                                }}
                                            >
                                                <ChevronUp className="size-3" />
                                            </button>
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{section.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const newOrder = [...data.sectionsConfig];
                                                    newOrder[idx].active = !newOrder[idx].active;
                                                    reorderSections(newOrder);
                                                }}
                                                className={`size-8 rounded-none flex items-center justify-center transition-colors ${section.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                                            >
                                                {section.active ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* GENERIC / CUSTOM SECTIONS */}
                {!['personal', 'summary', 'experience', 'education', 'skills', 'appearance', 'sections-config'].includes(activeSection) && data.sectionsConfig.find(s => s.id === activeSection) && (() => {
                    const section = data.sectionsConfig.find(s => s.id === activeSection)!;

                    return (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                {editingTitleId === section.id ? (
                                    <input
                                        autoFocus
                                        className="text-sm font-bold bg-transparent border-b border-blue-600 outline-none w-full uppercase"
                                        value={localTitle?.id === section.id ? localTitle.value : section.title}
                                        onChange={(e) => setLocalTitle({ id: section.id, value: e.target.value })}
                                        onBlur={() => {
                                            renameSection(section.id, localTitle?.value || '');
                                            setEditingTitleId(null);
                                            setLocalTitle(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && (renameSection(section.id, localTitle?.value || ''), setEditingTitleId(null), setLocalTitle(null))}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                            {section.title}
                                        </h3>
                                        <button onClick={() => {
                                            setEditingTitleId(section.id);
                                            setLocalTitle({ id: section.id, value: section.title });
                                        }} className="p-1 text-slate-400 hover:text-blue-600">
                                            <Edit2 className="size-3" />
                                        </button>
                                    </div>
                                )}
                                {(section.type === 'SIMPLE_LIST' || section.type === 'DATED_LIST') && (
                                    <button onClick={() => addSectionListItem(section.id)} className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                        <Plus className="size-3" /> {t('actions.add')}
                                    </button>
                                )}
                            </div>

                            {section.type === 'TEXT' && (
                                <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                                    <textarea
                                        className="w-full rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-xs p-2.5 leading-relaxed font-medium outline-none focus:ring-1 focus:ring-blue-500"
                                        rows={6}
                                        value={section.content || ''}
                                        onChange={(e) => updateSectionContent(section.id, e.target.value)}
                                        placeholder={t('labels.enterContent') || "Digite o conteúdo aqui..."}
                                    />
                                </div>
                            )}

                            {section.type === 'SIMPLE_LIST' && (section.items as any[] || []).map((item, idx) => {
                                const isCertItem = typeof item === 'object' && item !== null && 'name' in item;
                                return (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-2 shadow-sm relative pr-10">
                                    <input
                                        className="flex-1 px-2 py-1 rounded bg-transparent border-none text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={isCertItem ? (item as any).name || '' : String(item)}
                                        onChange={(e) => updateSectionListItem(section.id, idx.toString(), e.target.value)}
                                        placeholder={t('labels.listItem') || "Item da lista..."}
                                    />
                                    <button onClick={() => removeSectionListItem(section.id, idx.toString())} className="absolute right-2 text-slate-300 hover:text-red-500 p-1">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                                );
                            })}

                            {section.type === 'DATED_LIST' && (section.items as DatedListItem[] || []).map((item) => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-4 relative shadow-sm">
                                    <button onClick={() => removeSectionListItem(section.id, item.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 mt-1">
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.title')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                                value={item.title || ''}
                                                onChange={(e) => updateSectionListItem(section.id, item.id, { title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.company')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                value={item.subtitle || ''}
                                                onChange={(e) => updateSectionListItem(section.id, item.id, { subtitle: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.location')}</label>
                                            <input
                                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                value={item.location || ''}
                                                onChange={(e) => updateSectionListItem(section.id, item.id, { location: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.startDate')}</label>
                                                <input
                                                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                    value={item.startDate || ''}
                                                    onChange={(e) => updateSectionListItem(section.id, item.id, { startDate: e.target.value })}
                                                    placeholder="YYYY-MM"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.endDate')}</label>
                                                <input
                                                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                    value={item.endDate || ''}
                                                    onChange={(e) => updateSectionListItem(section.id, item.id, { endDate: e.target.value })}
                                                    placeholder="YYYY-MM"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{t('form.description')}</label>
                                        <textarea
                                            className="w-full rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-xs p-2.5 leading-relaxed font-medium outline-none focus:ring-1 focus:ring-blue-500"
                                            rows={4}
                                            value={item.description || ''}
                                            onChange={(e) => updateSectionListItem(section.id, item.id, { description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
        </section>
    );
}
