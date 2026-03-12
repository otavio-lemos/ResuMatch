'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, Copy, Trash2, Loader2, ChevronDown, ChevronUp, ArrowRight, Sparkles } from 'lucide-react';

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
    aiAnalysis?: any;
    jobDescription?: string;
}

export default function DashboardContent({ initialResumes }: { initialResumes: Resume[] }) {
    const { t, language } = useTranslation();
    const router = useRouter();
    const [resumes, setResumes] = useState<Resume[]>(initialResumes || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
    const [isLoadingFullResume, setIsLoadingFullResume] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        design: true,
        estrutura: true,
        conteudo: true,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        setResumes(initialResumes || []);
    }, [initialResumes]);

    const currentResume = resumes[currentIndex] || resumes[0];

    useEffect(() => {
        if (!currentResume?.id) return;

        let isMounted = true;
        setIsLoadingFullResume(true);

        fetch(`/api/resumes/${currentResume.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) {
                    setSelectedResume(data);
                    localStorage.setItem('lastResumeId', data.id);
                }
            })
            .catch(err => console.error('Failed to load resume:', err))
            .finally(() => {
                if (isMounted) setIsLoadingFullResume(false);
            });

        return () => { isMounted = false; };
    }, [currentResume?.id]);

    const handleDelete = async (id: string) => {
        if (!confirm(t('dashboard.confirmDelete'))) return;
        
        try {
            await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
            const newResumes = resumes.filter(r => r.id !== id);
            setResumes(newResumes);
            if (currentIndex >= newResumes.length) {
                setCurrentIndex(Math.max(0, newResumes.length - 1));
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleClone = async (resume: Resume) => {
        try {
            const res = await fetch('/api/resumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...resume,
                    id: undefined,
                    createdAt: undefined,
                    title: `${resume.title || t('dashboard.copy')} ${new Date().toLocaleString()}`
                })
            });
            const newResume = await res.json();
            setResumes(prev => [newResume, ...prev]);
            router.push(`/editor/${newResume.id}`);
        } catch (err) {
            console.error('Clone failed:', err);
        }
    };

    const handleTranslate = (resume: Resume) => {
        router.push(`/editor/${resume.id}?action=translate`);
    };

    if (!resumes || resumes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300">{t('dashboard.noResumes')}</h2>
                <button
                    onClick={() => router.push('/modelos')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <PlusSquare className="w-4 h-4" />
                    {t('dashboard.createFirst')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            {/* Resume List */}
            <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t('dashboard.myResumes')}
                    </h2>

                    {/* Resume Selector */}
                    <div className="relative mb-4">
                        <select
                            value={currentIndex}
                            onChange={(e) => setCurrentIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded appearance-none cursor-pointer text-sm"
                        >
                            {resumes.map((r, i) => {
                                const suffix = r.id.endsWith('bra') ? 'bra' : r.id.endsWith('usa') ? 'usa' : '';
                                return (
                                    <option key={r.id} value={i} className="bg-white dark:bg-slate-900">
                                        {i + 1} - {r.title || t('dashboard.untitled')} [{suffix}]
                                    </option>
                                );
                            })}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button
                            onClick={() => handleTranslate(currentResume)}
                            disabled={!currentResume}
                            className="flex flex-col items-center gap-1 p-2 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-lg">🌐</span>
                            {t('dashboard.translate')}
                        </button>
                        <button
                            onClick={() => handleClone(currentResume)}
                            disabled={!currentResume}
                            className="flex flex-col items-center gap-1 p-2 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Copy className="w-4 h-4" />
                            {t('dashboard.clone')}
                        </button>
                        <button
                            onClick={() => currentResume && handleDelete(currentResume.id)}
                            disabled={!currentResume}
                            className="flex flex-col items-center gap-1 p-2 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('dashboard.delete')}
                        </button>
                    </div>

                    {/* Resume Preview */}
                    {currentResume && (
                        <div 
                            onClick={() => router.push(`/editor/${currentResume.id}`)}
                            className="p-3 bg-slate-50 dark:bg-slate-800 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                    {currentResume.title || t('dashboard.untitled')}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {new Date(currentResume.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                {isLoadingFullResume ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : selectedResume ? (
                    <div className="space-y-6">
                        {/* ATS Scores */}
                        {(selectedResume.aiAnalysis || selectedResume.score) && (
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                                <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    {t('analysis.title')}
                                </h2>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Design */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded p-3">
                                        <button 
                                            onClick={() => toggleSection('design')}
                                            className="flex items-center justify-between w-full mb-2"
                                        >
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Design</span>
                                            {expandedSections.design ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {selectedResume.aiAnalysis?.designScore || selectedResume.scores?.design || selectedResume.score || 0}
                                        </div>
                                        {expandedSections.design && selectedResume.aiAnalysis?.designFeedback && (
                                            <p className="text-[10px] text-slate-500 mt-2">{selectedResume.aiAnalysis.designFeedback}</p>
                                        )}
                                    </div>

                                    {/* Estrutura */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded p-3">
                                        <button 
                                            onClick={() => toggleSection('estrutura')}
                                            className="flex items-center justify-between w-full mb-2"
                                        >
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Estrutura</span>
                                            {expandedSections.estrutura ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                        <div className="text-2xl font-bold text-green-600">
                                            {selectedResume.aiAnalysis?.structureScore || selectedResume.scores?.estrutura || 0}
                                        </div>
                                        {expandedSections.estrutura && selectedResume.aiAnalysis?.structureFeedback && (
                                            <p className="text-[10px] text-slate-500 mt-2">{selectedResume.aiAnalysis.structureFeedback}</p>
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded p-3">
                                        <button 
                                            onClick={() => toggleSection('conteudo')}
                                            className="flex items-center justify-between w-full mb-2"
                                        >
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Conteúdo</span>
                                            {expandedSections.conteudo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {selectedResume.aiAnalysis?.contentScore || selectedResume.scores?.conteudo || 0}
                                        </div>
                                        {expandedSections.conteudo && selectedResume.aiAnalysis?.contentFeedback && (
                                            <p className="text-[10px] text-slate-500 mt-2">{selectedResume.aiAnalysis.contentFeedback}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resume Preview - Click to edit */}
                        <div 
                            onClick={() => router.push(`/editor/${selectedResume.id}`)}
                            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <div className="text-center text-slate-500 dark:text-slate-400">
                                <p className="text-lg font-semibold mb-2">{selectedResume.personalInfo?.fullName || t('dashboard.untitled')}</p>
                                <p className="text-sm">{selectedResume.personalInfo?.email}</p>
                                <p className="text-xs mt-4 text-blue-600">Clique para editar →</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        {t('dashboard.selectResume')}
                    </div>
                )}
            </div>
        </div>
    );
}

function PlusSquare({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}
