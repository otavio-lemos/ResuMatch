'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Sparkles, LayoutTemplate, BriefcaseBusiness, FileText, CheckCircle2, Loader2, X, Target, Wand2, ArrowRight, Brain, AlertCircle } from 'lucide-react';
import { useResumeStore, ResumeData, AICheck, DetailedSuggestion } from '@/store/useResumeStore';
import { useAISettingsStore } from '@/store/useAISettingsStore';
import { useTranslation } from '@/hooks/useTranslation';

function CircularProgress({ percent, colorClass, size = "md" }: { percent: number, colorClass: string, size?: "md" | "lg" }) {
    const radius = size === "lg" ? 54 : 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
    const viewBoxSize = size === "lg" ? 144 : 96;
    const center = viewBoxSize / 2;

    return (
        <div className={`relative flex items-center justify-center ${size === "lg" ? "size-36" : "size-24"}`}>
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
                <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={size === "lg" ? 12 : 8} fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={size === "lg" ? 12 : 8} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${colorClass} transition-all duration-1000 stroke-current`} strokeLinecap="round" />
            </svg>
            <span className={`${size === "lg" ? "text-3xl" : "text-xl"} font-black text-slate-900 dark:text-white absolute`}>{Math.round(percent)}%</span>
        </div>
    );
}

function getScoreColorClass(score: number): string {
    if (score >= 92) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
}

function getScoreColorClassBg(score: number): string {
    if (score >= 92) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
}

interface Bubble { from: 'user' | 'ai'; text: string; delay: number; }

function ChatView({ bubbles, title, t, isStatic = false }: { bubbles: Bubble[]; title: string; t: (key: string) => string | undefined, isStatic?: boolean }) {
    const [visible, setVisible] = useState(isStatic ? (bubbles || []).length : 0);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!Array.isArray(bubbles) || isStatic) return;
        const timeouts = bubbles.map((b, i) => setTimeout(() => setVisible(v => Math.max(v, i + 1)), b.delay));
        return () => timeouts.forEach(t => clearTimeout(t));
    }, [bubbles, isStatic]);

    useEffect(() => { 
        if (!isStatic) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
        }
    }, [visible, isStatic]);

    if (!Array.isArray(bubbles)) return null;

    return (
        <div className="flex flex-col min-h-[300px] bg-[#0d1117] border border-slate-800 mb-6">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-[#161b22]">
                <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500/70" />
                    <span className="size-2.5 rounded-full bg-amber-500/70" />
                    <span className="size-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                <div className="ml-auto flex items-center gap-1.5">
                    {!isStatic ? (
                        <>
                            <Brain className="size-3.5 text-blue-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">{t('dashboard.processing')}</span>
                        </>
                    ) : (
                        <div className="flex items-center gap-1 text-emerald-500/70">
                            <CheckCircle2 className="size-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{t('analysis.finished')}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px]">
                {bubbles.slice(0, visible).map((b, i) => (
                    <div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400 ${b.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`size-7 rounded-full flex items-center justify-center text-[9px] font-black uppercase shrink-0 ${b.from === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-blue-600 text-white'}`}>
                            {b.from === 'user' ? t('labels.me') : t('labels.ai')}
                        </div>
                        <div className={`max-w-[75%] px-4 py-2.5 text-[11px] leading-relaxed font-medium ${b.from === 'user'
                            ? 'bg-slate-700 text-slate-200 rounded-tl-xl rounded-bl-xl rounded-tr-sm rounded-br-xl'
                            : 'bg-[#1c2c3e] border border-blue-900/50 text-slate-200 rounded-tr-xl rounded-br-xl rounded-tl-sm rounded-bl-xl'}`}>
                            {b.text}
                        </div>
                    </div>
                ))}
                {!isStatic && visible < (bubbles || []).length && (
                    <div className="flex gap-3">
                        <div className="size-7 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{t('labels.ai')}</div>
                        <div className="bg-[#1c2c3e] border border-blue-900/50 px-4 py-3 rounded-tr-xl rounded-br-xl rounded-tl-sm rounded-bl-xl flex gap-1 items-center">
                            <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                            <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                            <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function SuggestionRow({ suggestion, onToggle }: { suggestion: DetailedSuggestion, onToggle: () => void }) {
    const { t } = useTranslation();
    const impactColors = {
        high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        low: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
    };

    const impactBadges = {
        high: 'bg-red-500 text-white',
        medium: 'bg-amber-500 text-white',
        low: 'bg-slate-400 text-white'
    };

    return (
        <div className={`border ${suggestion.resolved ? 'opacity-50' : ''} ${impactColors[suggestion.impact]}`}>
            <div className="flex items-start gap-3 p-4">
                <input 
                    type="checkbox" 
                    checked={suggestion.resolved || false}
                    onChange={onToggle}
                    className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 rounded" 
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${impactBadges[suggestion.impact]}`}>
                            {t(`analysis.impact.${suggestion.impact}` as any) || suggestion.impact}
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                            {suggestion.type} / {suggestion.field}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div>
                                <span className="text-[9px] font-black text-red-500 uppercase">{t('analysis.original')}</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-2 rounded font-mono">
                                    {suggestion.original || '(vazio)'}
                                </p>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-red-500 uppercase">{t('analysis.problem')}</span>
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    {suggestion.issue}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <span className="text-[9px] font-black text-emerald-600 uppercase">{t('analysis.atsSuggestion')}</span>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50/50 dark:bg-emerald-900/20 p-2 rounded">
                                    {suggestion.suggestion}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResumeSectionViewer({ data }: { data: ResumeData }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 text-xs">
            {data.personalInfo && (
                <div className="border-l-2 border-blue-500 pl-3">
                    <span className="text-[9px] font-black text-blue-600 uppercase block mb-1">{t('sections.personalInfo')}</span>
                    <p className="font-bold text-slate-900 dark:text-white">{data.personalInfo.fullName}</p>
                    <p className="text-slate-600 dark:text-slate-400">{data.personalInfo.title}</p>
                    <p className="text-slate-500 dark:text-slate-500">{data.personalInfo.email} | {data.personalInfo.phone}</p>
                    <p className="text-slate-500 dark:text-slate-500">{data.personalInfo.location}</p>
                </div>
            )}

            {data.summary && typeof data.summary === 'string' && (
                <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">{t('sections.summary')}</span>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-4 whitespace-pre-wrap">{data.summary}</p>
                </div>
            )}

            {data?.experiences && data.experiences.length > 0 && (
                <div className="border-l-2 border-teal-500 pl-3">
                    <span className="text-[9px] font-black text-teal-600 uppercase block mb-2">{t('sections.experience')}</span>
                    {data.experiences.map((exp, i) => (
                        <div key={exp.id || i} className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <p className="font-bold text-slate-900 dark:text-white">{exp.position}</p>
                            <p className="text-slate-600 dark:text-slate-400">{exp.company} | {exp.startDate} - {exp.current ? (t('form.current') || 'Atual') : exp.endDate}</p>
                            <p className="text-slate-500 dark:text-slate-500 text-[10px] line-clamp-2">{exp.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {data?.education && data.education.length > 0 && (
                <div className="border-l-2 border-amber-500 pl-3">
                    <span className="text-[9px] font-black text-amber-600 uppercase block mb-2">{t('sections.education')}</span>
                    {data.education.map((edu, i) => (
                        <div key={edu.id || i} className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <p className="font-bold text-slate-900 dark:text-white">{edu.degree}</p>
                            <p className="text-slate-600 dark:text-slate-400">{edu.institution} | {edu.startDate} - {edu.current ? (t('form.current') || 'Atual') : edu.endDate}</p>
                        </div>
                    ))}
                </div>
            )}

            {data?.skills && Array.isArray(data.skills) && data.skills.length > 0 && (
                <div className="border-l-2 border-cyan-500 pl-3">
                    <span className="text-[9px] font-black text-cyan-600 uppercase block mb-2">{t('sections.skills')}</span>
                    {data.skills.map((skillGroup: any, i: number) => (
                        <div key={skillGroup?.id || i} className="mb-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase">{skillGroup?.category || ''}</span>
                            <p className="text-slate-700 dark:text-slate-300">{Array.isArray(skillGroup?.skills) ? skillGroup.skills.join(', ') : ''}</p>
                        </div>
                    ))}
                </div>
            )}

            {(() => {
                const certSection = data.sectionsConfig?.find(s => s.id === 'certifications');
                const certs = certSection?.items || [];
                return (certs || []).length > 0 && (
                    <div className="border-l-2 border-pink-500 pl-3">
                        <span className="text-[9px] font-black text-pink-600 uppercase block mb-2">{t('sections.certifications') || 'Certificações'}</span>
                        {(certs as any[]).map((cert: any, i: number) => (
                            <div key={cert.id || i} className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <p className="font-bold text-slate-900 dark:text-white">{cert.name}</p>
                                <p className="text-slate-600 dark:text-slate-400">{cert.issuer} | {cert.date}</p>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {data?.languages && (data.languages || []).length > 0 && (
                <div className="border-l-2 border-indigo-500 pl-3">
                    <span className="text-[9px] font-black text-indigo-600 uppercase block mb-2">{t('sections.languages')}</span>
                    {data.languages.map((lang, i) => (
                        <p key={lang.id || i} className="text-slate-700 dark:text-slate-300">
                            {lang.language}: <span className="text-slate-500">{lang.proficiency}</span>
                        </p>
                    ))}
                </div>
            )}

            {data?.projects && (data.projects || []).length > 0 && (
                <div className="border-l-2 border-orange-500 pl-3">
                    <span className="text-[9px] font-black text-orange-600 uppercase block mb-2">{t('sections.projects')}</span>
                    {data.projects.map((proj, i) => (
                        <div key={proj.id || i} className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <p className="font-bold text-slate-900 dark:text-white">{proj.title}</p>
                            <p className="text-slate-500 dark:text-slate-500 text-[10px] line-clamp-2">{proj.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ATSAnalysisView() {
    const { t, language } = useTranslation();
    const { atsPrompt, primaryAI } = useAISettingsStore();
    const { data, resumeId, analyzeResume, isAnalyzing: storeIsAnalyzing, streamProgress, error: storeError, setJobDescription, saveLocalResume } = useResumeStore();
    const [showBenchmarking, setShowBenchmarking] = useState(false);
    const [activeAnalysisMode, setActiveAnalysisMode] = useState<'general' | 'job'>('general');
    const [suggestions, setSuggestions] = useState<DetailedSuggestion[]>([]);
    const [isApplying, setIsApplying] = useState(false);
    const router = useRouter();

    const ANALYSING_BUBBLES = useMemo(() => ((t('import.analysingBubbles') as unknown) || []) as Bubble[], [t]);

    const derivedSuggestions = useMemo(() => {
        const analysis = activeAnalysisMode === 'general' ? data?.aiAnalysis : data?.jdAnalysis;
        
        if (analysis?.detailedSuggestions) {
            return analysis.detailedSuggestions;
        }
        
        const allSuggestions: DetailedSuggestion[] = [];
        if (analysis?.improvedBullets) {
            analysis.improvedBullets.forEach((b: any) => {
                allSuggestions.push({
                    type: 'conteudo',
                    field: b.section || 'experience',
                    original: b.original,
                    issue: b.reason || t('labels.missingActionVerb'),
                    suggestion: b.improved,
                    impact: 'high'
                });
            });
        }
        if (analysis?.designChecks) {
            analysis.designChecks.forEach((c: AICheck) => {
                if (!c.passed) {
                    allSuggestions.push({
                        type: 'design',
                        field: c.label.toLowerCase(),
                        original: t('labels.visualElement'),
                        issue: c.feedback,
                        suggestion: c.feedback,
                        impact: 'medium'
                    });
                }
            });
        }
        if (analysis?.estruturaChecks) {
            analysis.estruturaChecks.forEach((c: AICheck) => {
                if (!c.passed) {
                    allSuggestions.push({
                        type: 'estrutura',
                        field: c.label.toLowerCase(),
                        original: t('labels.invalidData'),
                        issue: c.feedback,
                        suggestion: c.feedback,
                        impact: 'high'
                    });
                }
            });
        }
        return allSuggestions;
    }, [data?.aiAnalysis, data?.jdAnalysis, activeAnalysisMode, t]);

    const selectAll = derivedSuggestions.length > 0 && derivedSuggestions.every(s => s.resolved);

    useEffect(() => {
        setSuggestions(derivedSuggestions);
    }, [derivedSuggestions]);

    const toggleSuggestion = (index: number) => {
        setSuggestions(prev => prev.map((s, i) => 
            i === index ? { ...s, resolved: !s.resolved } : s
        ));
    };

    const selectAllSuggestions = (resolved: boolean) => {
        setSuggestions(prev => prev.map(s => ({ ...s, resolved })));
    };

    const analysis = activeAnalysisMode === 'general' ? data?.aiAnalysis : data?.jdAnalysis;

    const getAnalysisScore = (a: any): number => {
        if (a?.score !== undefined) return a.score;
        if (a?.scores?.design !== undefined) return Math.round((a.scores.design + a.scores.estrutura + a.scores.conteudo) / 3);
        return 0;
    };

    const displayScore = analysis ? getAnalysisScore(analysis) : 0;

    const handleAnalyze = async (jobDescription?: string) => {
        const aiSettings = primaryAI ? {
            apiKey: primaryAI.apiKey,
            model: primaryAI.model,
            baseUrl: primaryAI.baseUrl
        } : null;
        await analyzeResume(atsPrompt, jobDescription, aiSettings as any, language);
        router.refresh();
    };

    if (!data || !data.personalInfo) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-slate-500">{t('dashboard.loadingResume')}</div>
            </div>
        );
    }

    const unresolvedCount = (suggestions || []).filter(s => !s.resolved).length;

    return (
        <div className="space-y-6">
            {storeError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 border-l-4 border-l-red-500">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="size-5 text-red-600 dark:text-red-400" />
                        <div className="flex-1">
                            <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-tight">{t('analysis.aiError')}</p>
                            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">{storeError}</p>
                        </div>
                    </div>
                </div>
            )}

            <section className="bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                        {t('analysis.title')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xl font-medium">
                        {t('analysis.subtitle')}
                    </p>
                    <button
                        onClick={() => setShowBenchmarking(!showBenchmarking)}
                        className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest"
                    >
                        <Target className="size-3" />
                        {t('analysis.jobMatchTitle')}
                    </button>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <CircularProgress percent={displayScore} colorClass={displayScore >= 92 ? "text-emerald-500" : displayScore >= 60 ? "text-amber-500" : "text-red-500"} size="lg" />
                    
                    {/* Streaming Progress Display */}
                    {storeIsAnalyzing && (streamProgress || []).length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <Loader2 className="size-3 animate-spin text-blue-600" />
                                <span className="text-[10px] font-black text-slate-500 uppercase">{t('analysis.analyzingInProgress')}</span>
                            </div>
                            <ul className="space-y-1">
                                {streamProgress.map((msg, i) => (
                                    <li key={i} className="text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">›</span>
                                        {msg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <button
                        onClick={() => { setActiveAnalysisMode('general'); handleAnalyze(undefined); }}
                        disabled={storeIsAnalyzing}
                        className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        {storeIsAnalyzing && activeAnalysisMode === 'general' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        {t('analysis.button')}
                    </button>
                </div>
            </section>

            {showBenchmarking && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 border-2 border-dashed border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="size-4 text-blue-600" />
                        <h3 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest">{t('analysis.jobMatchTitle')}</h3>
                    </div>
                    <textarea
                        value={data.jobDescription || ''}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 p-4 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none mb-4 min-h-[120px]"
                        placeholder={t('analysis.jobPlaceholder')}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={() => { setActiveAnalysisMode('job'); handleAnalyze(data.jobDescription); }}
                            disabled={storeIsAnalyzing || !data?.jobDescription}
                            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            {(storeIsAnalyzing && activeAnalysisMode === 'job') ? <Loader2 className="size-3.5 animate-spin" /> : <Target className="size-3.5" />}
                            {t('analysis.analyzeWithJob')}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 flex items-center justify-center shrink-0 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500">
                            <LayoutTemplate className="size-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">{t('dashboard.designScore')}</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('analysis.designSubtitle')}</p>
                        </div>
                        <CircularProgress percent={analysis?.scores?.design ?? 0} colorClass={(analysis?.scores?.design ?? 0) >= 92 ? 'text-emerald-500' : (analysis?.scores?.design ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500'} />
                    </div>
                    <ul className="space-y-2">
                        {analysis?.designChecks?.map((c: AICheck, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[11px]">
                                {c.passed ? <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" /> : <ShieldAlert className="size-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                <div className="flex flex-col">
                                    <span className="text-slate-900 dark:text-white font-bold text-[10px] uppercase leading-none mb-0.5">{c.label}</span>
                                    <span className="text-slate-500 dark:text-slate-400 leading-tight text-[10px]">{c.feedback}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/20 text-blue-500">
                            <BriefcaseBusiness className="size-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">{t('dashboard.structureScore')}</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('analysis.structureSubtitle')}</p>
                        </div>
                        <CircularProgress percent={analysis?.scores?.estrutura ?? 0} colorClass={(analysis?.scores?.estrutura ?? 0) >= 92 ? 'text-emerald-500' : (analysis?.scores?.estrutura ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500'} />
                    </div>
                    <ul className="space-y-2">
                        {analysis?.estruturaChecks?.map((c: AICheck, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[11px]">
                                {c.passed ? <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" /> : <ShieldAlert className="size-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                <div className="flex flex-col">
                                    <span className="text-slate-900 dark:text-white font-bold text-[10px] uppercase leading-none mb-0.5">{c.label}</span>
                                    <span className="text-slate-500 dark:text-slate-400 leading-tight text-[10px]">{c.feedback}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500">
                            <FileText className="size-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">{t('dashboard.contentScore')}</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('analysis.contentSubtitle')}</p>
                        </div>
                        <CircularProgress percent={analysis?.scores?.conteudo ?? 0} colorClass={(analysis?.scores?.conteudo ?? 0) >= 92 ? 'text-emerald-500' : (analysis?.scores?.conteudo ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500'} />
                    </div>
                    <div className="space-y-3">
                        {analysis?.conteudoMetrics ? Object.entries(analysis.conteudoMetrics).map(([key, metric]: [string, any]) => (
                            <div key={key} className="space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                    <span className="text-slate-500">{t(`analysis.metrics.${key}` as any) || key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className={metric.status === 'good' ? 'text-emerald-500' : metric.status === 'warning' ? 'text-amber-500' : 'text-red-500'}>
                                        {metric.value} ({t('analysis.metrics.target')}: {metric.target})
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${metric.status === 'good' ? 'bg-emerald-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ 
                                            width: (() => {
                                                const target = metric.target;
                                                if (target.includes('-')) {
                                                    const parts = target.split('-');
                                                    const maxVal = parseInt(parts[1]) || 100;
                                                    return `${Math.min(100, (metric.value / maxVal) * 100)}%`;
                                                } else if (target.includes('>')) {
                                                    const threshold = parseInt(target.replace(/\D/g, '')) || 70;
                                                    return `${Math.min(100, (metric.value / threshold) * 100)}%`;
                                                }
                                                return `${Math.min(100, metric.value)}%`;
                                            })()
                                        }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <p className="text-[10px] text-slate-400 italic">{t('analysis.analyzing')}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                    <Wand2 className="size-4 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{t('analysis.detailedTitle')}</h3>
                    <div className="ml-auto flex items-center gap-3">
                        {unresolvedCount > 0 && (
                            <span className="px-3 py-1 text-[10px] font-black uppercase bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                {unresolvedCount} {unresolvedCount !== 1 ? t('analysis.itemsToFix') : t('analysis.itemToFix')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="size-4 text-slate-500" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('analysis.yourResume')}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-700 max-h-[600px] overflow-y-auto">
                            <ResumeSectionViewer data={data} />
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ArrowRight className="size-4 text-blue-500" />
                                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{t('analysis.improvementSuggestions')}</span>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {(suggestions || []).length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t('analysis.noIssues')}</p>
                                    <p className="text-xs text-slate-500 mt-1">{t('analysis.optimized')}</p>
                                </div>
                            ) : (
                                suggestions.map((suggestion, i) => (
                                    <div key={`${suggestion.type}-${suggestion.field}-${i}`} className={`border bg-white dark:bg-slate-900 p-4 border-slate-200 dark:border-slate-800`}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                                    suggestion.impact === 'high' ? 'bg-red-500 text-white' : 
                                                    suggestion.impact === 'medium' ? 'bg-amber-500 text-white' : 
                                                    'bg-slate-400 text-white'
                                                }`}>
                                                    {t(`analysis.impact.${suggestion.impact}` as any) || suggestion.impact}
                                                </span>
                                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                                    {suggestion.type} / {suggestion.field}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <span className="text-[9px] font-black text-red-500 uppercase">{t('analysis.original')}</span>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-black/20 p-2 rounded border border-slate-100 dark:border-slate-800 font-mono line-clamp-2">
                                                        {suggestion.original || '(vazio)'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-red-500 uppercase">{t('analysis.problem')}</span>
                                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                        {suggestion.issue}
                                                    </p>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase">{t('analysis.atsSuggestion')}</span>
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                                                        {suggestion.suggestion}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
