'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Check, Brain, ShieldAlert, ArrowRight, X, RefreshCw, GripVertical } from 'lucide-react';
import { parseResumeFromPDF, generateATSAnalysis } from '@/app/actions/ai';
import { saveImportedResume } from '@/app/dashboard/actions';
import { useAISettingsStore } from '@/store/useAISettingsStore';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeData, AppearanceSettings, PersonalInfo } from '@/store/useResumeStore';
import { useImportStore, WizardStep, ChatBubble, MappingRow } from '@/store/useImportStore';
import { useTranslation } from '@/hooks/useTranslation';

const WIZARD_DELAYS = {
    PARSING_COMPLETE: 10500,
    REVALIDATION_BUFFER: 900,
} as const;

interface ATSAnalysis {
    overall: number;
    categories: {
        design: number;
        structure: number;
        content: number;
    };
    suggestions: string[];
    keywords?: string[];
}

interface ImportResumeData extends Omit<Partial<ResumeData>, 'certifications'> {
    atsScore?: ATSAnalysis;
    certifications?: Array<{ id: string; name: string; issuer: string; date: string; expirationDate?: string }>;
    _sectionHeaders?: Record<string, string>;
}

function ChatView({ bubbles, title, t, isProcessing, onAbort }: { bubbles: ChatBubble[]; title: string; t: any; isProcessing: boolean; onAbort?: () => void }) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!Array.isArray(bubbles)) return;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [bubbles.length, bubbles]);

    if (!Array.isArray(bubbles)) return null;

    return (
        <div className="flex flex-col min-h-[500px] bg-[#0d1117] border border-slate-800">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-[#161b22]">
                <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500/70" />
                    <span className="size-2.5 rounded-full bg-amber-500/70" />
                    <span className="size-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                <div className="ml-auto flex items-center gap-3">
                    {isProcessing && onAbort && (
                        <button 
                            onClick={onAbort}
                            className="flex items-center gap-1.5 px-2 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-[9px] font-black text-red-400 uppercase tracking-widest transition-colors group"
                        >
                            <X className="size-3 group-hover:scale-110 transition-transform" />
                            {t('common.stop') || 'PARAR'}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5">
                        <Brain className={`size-3.5 text-blue-500 ${isProcessing ? 'animate-pulse' : ''}`} />
                        <span className={`text-[9px] font-bold text-blue-400 uppercase tracking-widest ${isProcessing ? 'animate-pulse' : ''}`}>{isProcessing ? t('import.processing') : t('import.ready')}</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {bubbles.map((b, i) => (
                    <div key={b.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400 ${b.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`size-7 rounded-full flex items-center justify-center text-[9px] font-black uppercase shrink-0 ${b.sender === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-blue-600 text-white'}`}>
                            {b.sender === 'user' ? t('labels.me') || 'EU' : t('labels.ai') || 'IA'}
                        </div>
                        <div className={`max-w-[75%] px-4 py-2.5 text-[11px] leading-relaxed font-medium whitespace-pre-wrap break-all ${b.sender === 'user'
                            ? 'bg-slate-700 text-slate-200 rounded-tl-xl rounded-bl-xl rounded-tr-sm rounded-br-xl'
                            : 'bg-[#1c2c3e] border border-blue-900/50 text-slate-200 rounded-tr-xl rounded-br-xl rounded-tl-sm rounded-bl-xl'}`}>
                            {b.text}
                        </div>
                    </div>
                ))}
                {/* Show typing indicator only when processing */}
                {isProcessing && (
                    <div className="flex gap-3">
                        <div className="size-7 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{t('labels.ai') || 'IA'}</div>
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

// ─── Utility ─────────────────────────────────────────────────────────────

function hasData(pd: ImportResumeData, key: string): boolean {
    const val = (pd as any)[key];
    if (val == null || val === '') return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.values(val).some((v: any) => String(v ?? '').trim().length > 0);
    return false;
}

interface MapRow {
    id: string;
    userLabel: string;
    atsKey: string | null;
    validated: boolean;
    isAiSuggestion?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImportWizardClient() {
    const { t, language } = useTranslation();
    const router = useRouter();
    const { importAI, primaryAI, importPrompt, atsPrompt } = useAISettingsStore();

    const ATS_SECTIONS = useMemo(() => [
        { key: 'personalInfo', label: t('import.sections.personalInfo') },
        { key: 'summary', label: t('import.sections.summary') },
        { key: 'experiences', label: t('import.sections.experiences') },
        { key: 'education', label: t('import.sections.education') },
        { key: 'projects', label: t('import.sections.projects') },
        { key: 'skills', label: t('import.sections.skills') },
        { key: 'certifications', label: t('import.sections.certifications') },
        { key: 'languages', label: t('import.sections.languages') },
        { key: 'volunteer', label: t('import.sections.volunteer') },
    ], [t]);

    const { 
        step, setStep, 
        error, setError, 
        parsedData, setParsedData,
        mappingRows, setMappingRows,
        curriculumChips, setCurriculumChips,
        parsingBubbles, setParsingBubbles, addParsingBubble, updateParsingBubble,
        analysingBubbles, setAnalysingBubbles, addAnalysingBubble, updateAnalysingBubble,
        isProcessing, setIsProcessing,
        reset
    } = useImportStore();

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // No persistence anymore - always ready
    const hasHydrated = true;

    const [hasValidationResult, setHasValidationResult] = useState(false);

    // Auto-scroll when bubbles change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        // Also scroll the parent container (entire page)
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, [parsingBubbles, analysingBubbles]);

    // chip drag: the atsKey being dragged from the pool
    const [chipDrag, setChipDrag] = useState<string | null>(null);
    // row drag: the row id being dragged for reorder
    const [rowDragId, setRowDragId] = useState<string | null>(null);
    const [rowDragOver, setRowDragOver] = useState<string | null>(null);

    // ── Derived ──────────────────────────────────────────────────────────────

    const assignedKeys = new Set(mappingRows.map(r => r.atsKey).filter(Boolean) as string[]);
    const poolChips = ATS_SECTIONS.filter(s => !assignedKeys.has(s.key));
    const mappedRows = mappingRows.filter(r => r.userLabel.trim() && r.atsKey);
    const allValidated = mappedRows.length > 0 && mappedRows.every(r => r.validated);

    // Curriculum sections assigned to rows
    const assignedCurriculumLabels = new Set(mappingRows.map(r => r.userLabel.toLowerCase().trim()));
    // Available curriculum chips (not yet mapped)
    const availableCurriculumChips = curriculumChips.filter(c => !assignedCurriculumLabels.has(c.label.toLowerCase()));

    // ── Upload ───────────────────────────────────────────────────────────────

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const sel = e.target.files?.[0];
        if (sel) {
            try {
                await processFile(sel);
            } catch (err) {
                console.error('[IMPORT] Fatal error:', err);
                setError('Erro fatal. Tente novamente.');
                setStep('UPLOAD');
                setParsingBubbles([]);
            }
        }
        // Reset input so same file can be selected again
        if (e.target) e.target.value = '';
    };

    const resetToUpload = () => {
        reset();
    };

    const processFile = async (selectedFile: File) => {
        // Reset state FIRST
        setStep('PARSING');
        setError(null);
        setIsProcessing(true);
        
        abortControllerRef.current = new AbortController();
        const controller = abortControllerRef.current;
        const timeoutMs = 300000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('language', language);
            
            const aiSettings = (importAI?.provider) ? {
                provider: importAI.provider,
                apiKey: importAI.apiKey || '',
                model: importAI.model,
                baseUrl: importAI.baseUrl,
                temperature: importAI.temperature,
                topP: importAI.topP,
                topK: importAI.topK,
                maxTokens: importAI.maxTokens
            } : (primaryAI?.provider) ? {
                provider: primaryAI.provider,
                apiKey: primaryAI.apiKey || '',
                model: primaryAI.model,
                baseUrl: primaryAI.baseUrl,
                temperature: primaryAI.temperature,
                topP: primaryAI.topP,
                topK: primaryAI.topK,
                maxTokens: primaryAI.maxTokens
            } : null;
            
            if (aiSettings) {
                formData.append('aiSettings', JSON.stringify(aiSettings));
            }
            
            if (importPrompt) {
                formData.append('importPrompt', importPrompt);
            }
            
            console.log('[IMPORT] Starting fetch to /api/langchain-parse-resume (SSE)');
            
            const response = await fetch('/api/langchain-parse-resume', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('[IMPORT] Error response:', response.status, errorText);
                setError(`Erro ${response.status}: ${errorText.substring(0, 200)}`);
                resetToUpload();
                return;
            }

            // Handle SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let skillInfo = '';
            let promptInfo = '';
            let rawResponse = '';
            
            if (!reader) {
                setError('Erro ao ler resposta');
                resetToUpload();
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'info') {
                                skillInfo = data.skill;
                                promptInfo = data.prompt;
                                addParsingBubble({ sender: 'user', text: `PROMPT:\n${promptInfo}`, type: 'text' });
                            } else if (data.type === 'progress') {
                                addParsingBubble({ sender: 'ai', text: data.message, type: 'progress' });
                            } else if (data.type === 'chunk') {
                                rawResponse += data.content;
                                // Update streaming response in real-time
                                setParsingBubbles([
                                    ...parsingBubbles.filter(b => !b.text.startsWith('RESPONSE:')),
                                    { id: 'parsing-response', sender: 'ai', text: `RESPONSE:\n${rawResponse}`, type: 'text' }
                                ]);
                            } else if (data.type === 'done') {
                                clearTimeout(timeoutId);
                                const extractedData = data.data;
                                const debugInfo = data.debug;
                                
                                console.log('[IMPORT] Extracted data keys:', Object.keys(extractedData || {}));
                                
                                if (!extractedData?.personalInfo) {
                                    setError('Dados inválidos recebidos da IA');
                                    resetToUpload();
                                    return;
                                }
                                
                                (window as any).__importDebug = debugInfo;
                                setParsedData(extractedData);
                                setStep('REVIEW');
                                return;
                            } else if (data.error) {
                                setError(data.error);
                                resetToUpload();
                                return;
                            }
                        } catch (e) {
                            console.log('[IMPORT] SSE parse error:', e);
                        }
                    }
                }
            }
            
            clearTimeout(timeoutId);
            setError('Resposta incompleta');
            resetToUpload();
            
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error('[IMPORT] Catch error:', err);
            setError(err.message || 'Erro desconhecido');
            resetToUpload();
        }
    };

    // ── Row editing ───────────────────────────────────────────────────────────

    const updateRowLabel = (id: string, value: string) => {
        setMappingRows(prev => prev.map(r => r.id === id ? { ...r, userLabel: value, validated: false } : r));
        setHasValidationResult(false);
    };

    const clearRowLabel = (id: string) => {
        setMappingRows(prev => prev.map(r => r.id === id ? { ...r, userLabel: '', validated: false, isAiSuggestion: false } : r));
        setHasValidationResult(false);
    };

    const clearRowAts = (id: string) => {
        setMappingRows(prev => prev.map(r => r.id === id ? { ...r, atsKey: null, validated: false } : r));
        setHasValidationResult(false);
    };

    // ── Chip drop (assign ATS key to right column OR curriculum label to left column) ───────────────────────────

    const handleChipDrop = (rowId: string, chipType?: 'ats' | 'curriculum') => {
        if (!chipDrag || rowDragId) return;
        
        // If dropping curriculum chip, set the userLabel (left column)
        if (chipType === 'curriculum') {
            const curriculumChip = curriculumChips.find(c => c.key === chipDrag);
            if (curriculumChip) {
                setMappingRows(prev => prev.map(r => {
                    // Check if this curriculum label is already used in another row
                    const labelExists = prev.some(row => row.userLabel.toLowerCase() === curriculumChip.label.toLowerCase() && row.id !== rowId);
                    if (r.id === rowId && !labelExists) {
                        return { ...r, userLabel: curriculumChip.label, validated: false };
                    }
                    return r;
                }));
            }
        } else {
            // ATS chip drop - set the atsKey (right column)
            setMappingRows(prev => prev.map(r => {
                if (r.atsKey === chipDrag) return { ...r, atsKey: null, validated: false };
                if (r.id === rowId) return { ...r, atsKey: chipDrag, validated: false };
                return r;
            }));
        }
        setHasValidationResult(false);
        setChipDrag(null);
        setRowDragOver(null);
    };

    // ── Row reorder (drag grip handle) ───────────────────────────────────────

    const handleRowDrop = (targetId: string) => {
        if (!rowDragId || rowDragId === targetId) {
            setRowDragId(null);
            setRowDragOver(null);
            return;
        }
        setMappingRows(prev => {
            const next = [...prev];
            const fromIdx = next.findIndex(r => r.id === rowDragId);
            const toIdx = next.findIndex(r => r.id === targetId);
            if (fromIdx < 0 || toIdx < 0) return prev;
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
        setRowDragId(null);
        setRowDragOver(null);
    };

    // ── Revalidate ────────────────────────────────────────────────────────────

    const handleRevalidate = async () => {
        const originalHeaders = Object.values(parsedData?._sectionHeaders || {})
            .filter(h => h != null)
            .map(h => String(h).toLowerCase().trim());

        setMappingRows(prev => prev.map(r => {
            const label = (r.userLabel || '').trim().toLowerCase();
            if (!label || !r.atsKey) return { ...r, validated: false };

            // Real validation: ANY user input is technically valid for mapping
            // because the user knows what "My Cool Section" maps to.
            // But we keep basic truth checks if possible from the original headers.
            const existsInPdf = originalHeaders.some(h => h === label || h.includes(label) || label.includes(h));
            const matchesAtsTarget = ATS_SECTIONS.find(s => s.key === r.atsKey)?.label.toLowerCase() === label;
            
            // As long as there is an AtsKey selected and a user label typed, it is valid configuration.
            const hasValidConfig = !!label && !!r.atsKey;

            return {
                ...r,
                validated: hasValidConfig || existsInPdf || matchesAtsTarget,
            };
        }));
        setHasValidationResult(true);
    };

    // ── Continue ──────────────────────────────────────────────────────────────

    const handleContinue = async (skipAnalysis = false) => {
        if (!parsedData) return;
        if (!skipAnalysis && !allValidated) return;

        try {
            const finalData = { ...parsedData };

            if (!skipAnalysis) {
                setStep('ANALYSING');
                setAnalysingBubbles([]);
                setIsProcessing(true);
                
                abortControllerRef.current = new AbortController();
                const controller = abortControllerRef.current;

                // Real-time conversation for ATS analysis
                addAnalysingBubble({ 
                    sender: 'user', 
                    text: t('import.wantsAudit'), 
                    type: 'text' 
                });
                
                const aiSettings = primaryAI?.provider ? {
                    provider: primaryAI.provider,
                    apiKey: primaryAI.apiKey || '',
                    model: primaryAI.model,
                    baseUrl: primaryAI.baseUrl
                } : null;
                
                const response = await fetch('/api/langchain-analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resumeData: finalData,
                        atsPrompt: atsPrompt,
                        aiSettings,
                        language
                    }),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ${response.status}: ${errorText}`);
                }

                // Handle SSE stream for analyze
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let rawResponse = '';
                
                if (!reader) {
                    throw new Error('Erro ao ler resposta');
                }

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const jsonStr = trimmedLine.slice(6).trim();
                                const data = JSON.parse(jsonStr);
                                
                                if (data.type === 'chunk') {
                                    rawResponse += data.content;
                                    setAnalysingBubbles([
                                        ...analysingBubbles.filter(b => !b.text.startsWith('RESPONSE:')),
                                        { id: 'analysing-response', sender: 'ai', text: `RESPONSE:\n${rawResponse}`, type: 'text' }
                                    ]);
                                } else if (data.type === 'done') {
                                    const atsResult = data.data;
                                    console.log('[IMPORT] ATS Result:', atsResult);
                                    if (atsResult) finalData.atsScore = atsResult;
                                } else if (data.error) {
                                    throw new Error(data.error);
                                }
                            } catch (e) {
                                console.log('[ANALYZE] SSE parse error:', e, '| line:', trimmedLine.substring(0, 100));
                            }
                        }
                    }
                }
            }

            setStep('SAVING');
            console.log('[IMPORT] Calling saveImportedResume...');
            try {
                const res = await saveImportedResume(finalData, undefined, language);
                console.log('[IMPORT] saveImportedResume result:', res);
                if (res?.error) throw new Error(res.message);
                console.log('[IMPORT] Redirecting to:', `/dashboard/${res.id}`);
                reset();
                router.push(`/dashboard/${res.id}`);
            } catch (saveErr: any) {
                console.error('[IMPORT] Save error:', saveErr);
                setError(saveErr.message || t('import.errorSaving'));
                setStep('REVIEW');
                setParsedData(null);
                setMappingRows([]);
            }
        } catch (err: any) {
            setError(err.message || t('import.errorSaving'));
            setStep('REVIEW');
            setParsedData(null);
            setMappingRows([]);
        }
    };
 
    const handleAbort = () => {
        if (abortControllerRef.current) {
            console.log('[IMPORT] Aborting AI request...');
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsProcessing(false);
            
            const msg = language === 'pt' ? 'Operação cancelada pelo usuário.' : 'Operation cancelled by user.';
            setError(msg);

            // Return to a stable step
            if (step === 'PARSING') setStep('UPLOAD');
            if (step === 'ANALYSING') setStep('REVIEW');
        }
    };

    // ── Auto-populate rows from parsed data on REVIEW step ─────────────────────
    useEffect(() => {
        if (!hasHydrated) return;
        if (step === 'REVIEW' && parsedData && (curriculumChips || []).length === 0) {
            console.log('[IMPORT] Full parsedData:', JSON.stringify(parsedData, null, 2));
            
            // Use _sectionHeaders from API response (which now includes detected headers from raw text)
            const sectionHeaders = (parsedData as any)._sectionHeaders || {};
            
            console.log('[IMPORT] Section headers from API:', sectionHeaders);

            const sectionHasData = (key: string): boolean => {
                const val = (parsedData as any)[key];
                if (val == null || val === '') return false;
                if (typeof val === 'string') return val.trim().length > 0;
                if (Array.isArray(val)) return val.length > 0;
                if (typeof val === 'object') return Object.values(val).some((v: any) => String(v ?? '').trim().length > 0);
                return false;
            };
 
            const newCurriculumChips: {key: string; label: string}[] = [];
            const newRows: MapRow[] = [];
            let rowId = 1;

            // Define the order and mapping for curriculum sections
            // 1. Get all keys from either _sectionHeaders or parsedData directly
            const rawKeys = new Set([
                ...Object.keys(sectionHeaders),
                ...Object.keys(parsedData as any).filter(k => !k.startsWith('_') && k !== 'personalInfo')
            ]);

            for (const key of Array.from(rawKeys)) {
                // If it's in headers or has data, we include it
                if (sectionHeaders[key] || sectionHasData(key)) {
                    const atsSection = ATS_SECTIONS.find(s => s.key === key);
                    const originalHeader = sectionHeaders[key];
                    
                    const curriculumLabel = originalHeader && String(originalHeader).trim() !== '' 
                                            ? String(originalHeader).trim() 
                                            : (atsSection?.label || key);
                    
                    // Add to curriculum chips pool
                    newCurriculumChips.push({ key, label: curriculumLabel });
                    
                    // Auto-map if it's a known ATS key
                    if (atsSection && sectionHasData(key)) {
                        newRows.push({
                            id: `row-${rowId++}`,
                            userLabel: curriculumLabel,
                            atsKey: key,
                            validated: true,
                            isAiSuggestion: false,
                        });
                    }
                }
            }

            console.log('[IMPORT] Detected curriculum sections:', newCurriculumChips.map(c => c.label));
            console.log('[IMPORT] Original headers used:', sectionHeaders);
            console.log('[IMPORT] Auto-mapped rows:', newRows.map(r => ({ label: r.userLabel, atsKey: r.atsKey })));
            
            if (newCurriculumChips.length > 0) {
                setCurriculumChips(newCurriculumChips);
                if (newRows.length > 0) {
                    setMappingRows(newRows);
                    setHasValidationResult(true);
                }
            } else {
                console.warn('[IMPORT] No curriculum sections detected');
            }
        }
    }, [hasHydrated, step, parsedData, curriculumChips.length, ATS_SECTIONS, setCurriculumChips, setMappingRows]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (!hasHydrated) return null;

    return (
        <div className="flex flex-col min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0b1219]">
            <div className={`flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col ${step !== 'REVIEW' ? 'justify-center' : ''}`}>

                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-3 border border-red-100 dark:border-red-900/50 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2"><ShieldAlert className="size-4 shrink-0" />{error}</span>
                        <button onClick={() => setError(null)}><X className="size-4 hover:text-red-800" /></button>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col overflow-hidden">

                    {/* ── UPLOAD ──────────────────────────────── */}
                    {step === 'UPLOAD' && (
                        <div className="flex flex-col items-center justify-center p-16 text-center min-h-[540px]">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf" className="hidden" />
                            <div className="size-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 mb-6 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                                <Upload className="size-8" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t('import.selectPdf')}</h2>
                            <p className="text-xs text-slate-500 mb-8 max-w-md">{t('import.uploadDescription')}</p>
                            <button onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest transition-all">
                                {t('import.selectFile')}
                            </button>
                        </div>
                    )}

                    {/* ── PARSING ─────────────────────────────── */}
                    {step === 'PARSING' && (
                        <ChatView 
                            bubbles={parsingBubbles} 
                            title={t('import.parsingTitle')} 
                            t={t} 
                            isProcessing={isProcessing} 
                            onAbort={handleAbort}
                        />
                    )}

                    {/* ── REVIEW ──────────────────────────────── */}
                    {step === 'REVIEW' && parsedData && (() => {
                        const validatedCount = mappedRows.filter(r => r.validated).length;
                        return (
                            <div className="flex flex-col">
                                {/* Header */}
                                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0b1219] flex items-center gap-3">
                                    <Check className="size-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{t('import.sectionMapping')}</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {t('import.editLeft')} · {t('import.dragAtsRight')} · {t('import.useToReorder')}
                                        </p>
                                    </div>
                                    {mappedRows.length > 0 && (
                                        <div className={`ml-auto px-3 py-1 text-[10px] font-black uppercase tracking-widest border shrink-0 ${allValidated ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20'}`}>
                                            {allValidated ? `✓ ${t('import.validated')}` : `${validatedCount}/${mappedRows.length} ${t('import.valid')}`}
                                        </div>
                                    )}
                                </div>

                                {/* Curriculum sections chip pool - detected from PDF */}
                                {(availableCurriculumChips || []).length > 0 && (
                                    <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">{t('import.yourResumeSections')} — {t('import.dragToMap')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {availableCurriculumChips.map(s => (
                                                <div
                                                    key={s.key}
                                                    draggable
                                                    onDragStart={e => { e.dataTransfer.setData('type', 'curriculum'); e.dataTransfer.setData('chipType', 'curriculum'); setChipDrag(s.key); }}
                                                    onDragEnd={() => { setChipDrag(null); setRowDragOver(null); }}
                                                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border cursor-grab select-none transition-all
                                                        ${chipDrag === s.key ? 'opacity-40 scale-95' : 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:border-blue-400 hover:text-blue-600'}`}
                                                >
                                                    {s.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chip pool */}
                                {(poolChips || []).length > 0 && (
                                    <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('import.availableSections')} — {t('import.dragToMap')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {poolChips.map(s => (
                                                <div
                                                    key={s.key}
                                                    draggable
                                                    onDragStart={e => { e.dataTransfer.setData('type', 'chip'); e.dataTransfer.setData('chipType', 'ats'); setChipDrag(s.key); }}
                                                    onDragEnd={() => { setChipDrag(null); setRowDragOver(null); }}
                                                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border cursor-grab select-none transition-all
                                                        ${chipDrag === s.key ? 'opacity-40 scale-95' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600'}`}
                                                >
                                                    {s.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Table */}
                                <div className="px-8 pt-5 pb-4">
                                    <table className="w-full border border-slate-200 dark:border-slate-800 border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800">
                                                {/* grip column */}
                                                <th className="w-8 border-b border-slate-200 dark:border-slate-700" />
                                                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700 w-[46%]">{t('import.yourResume')}</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border-b border-l border-slate-200 dark:border-slate-700">{t('import.atsSection')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mappingRows.map((row) => {
                                                const atsSection = ATS_SECTIONS.find(s => s.key === row.atsKey);
                                                const isMapped = row.userLabel.trim() && row.atsKey;
                                                const isChipOver = rowDragOver === row.id && chipDrag;
                                                const isRowOver = rowDragOver === row.id && rowDragId;

                                                return (
                                                    <tr
                                                        key={row.id}
                                                        className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-all
                                                            ${!row.userLabel.trim() && !row.atsKey ? 'opacity-40' : ''}
                                                            ${isRowOver ? 'bg-blue-50 dark:bg-blue-900/10 border-t-2 border-t-blue-400' : ''}
                                                            ${isChipOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                                            ${rowDragId === row.id ? 'opacity-50' : ''}`}
                                                        onDragOver={e => { e.preventDefault(); setRowDragOver(row.id); }}
                                                        onDragLeave={() => setRowDragOver(null)}
                                                        onDrop={(e) => {
                                                            if (rowDragId) handleRowDrop(row.id);
                                                            else if (chipDrag) {
                                                                const chipType = e.dataTransfer.getData('chipType') as 'ats' | 'curriculum';
                                                                handleChipDrop(row.id, chipType || 'ats');
                                                            }
                                                        }}
                                                    >
                                                        {/* Grip handle for row reorder */}
                                                        <td className="pl-3 pr-1 py-3 w-8">
                                                            <div
                                                                draggable
                                                                onDragStart={e => { e.dataTransfer.setData('type', 'row'); setRowDragId(row.id); }}
                                                                onDragEnd={() => { setRowDragId(null); setRowDragOver(null); }}
                                                                className="cursor-grab text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 flex items-center justify-center py-1 select-none"
                                                                title={t('import.dragToReorder')}
                                                            >
                                                                <GripVertical className="size-4" />
                                                            </div>
                                                        </td>

                                                        {/* DE */}
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`size-2 rounded-full shrink-0 transition-colors ${isMapped ? (row.validated ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                                                    <input
                                                                        type="text"
                                                                        value={row.userLabel}
                                                                        onChange={e => updateRowLabel(row.id, e.target.value)}
                                                                        placeholder={t('import.exactSectionName')}
                                                                        className="flex-1 text-sm text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none py-0.5 placeholder:text-slate-300 dark:placeholder:text-slate-600 min-w-0 overflow-hidden text-ellipsis"
                                                                    />
                                                                    {row.isAiSuggestion && (
                                                                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-[8px] font-black text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase tracking-tighter shrink-0 select-none">
                                                                            {t('import.aiSuggestion')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {row.userLabel.trim() && (
                                                                    <button onClick={() => {
                                                                         if (row.isAiSuggestion) {
                                                                            setMappingRows((prev: MappingRow[]) => prev.map(r => r.id === row.id ? { ...r, userLabel: '', atsKey: null, validated: false, isAiSuggestion: false } : r));
                                                                        } else {
                                                                            clearRowLabel(row.id);
                                                                        }
                                                                    }} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                                                                        <X className="size-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* PARA */}
                                                        <td className={`px-5 py-3 border-l border-slate-100 dark:border-slate-800 transition-colors ${isChipOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                            {atsSection ? (
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                                        <ArrowRight className="size-3.5 text-blue-500 shrink-0" />
                                                                        {atsSection.label}
                                                                    </span>
                                                                    <button onClick={() => clearRowAts(row.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                                                                        <X className="size-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className={`text-xs italic ${isChipOver ? 'text-blue-500 font-bold' : 'text-slate-400'}`}>
                                                                    {isChipOver ? t('import.dropHere') : t('import.dragAtsChip')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="px-8 py-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4">
                                    <button
                                        onClick={handleRevalidate}
                                        disabled={hasValidationResult && allValidated}
                                        className={`px-8 py-4 text-[11px] font-black uppercase tracking-widest transition-all transition-colors flex items-center gap-3 shadow-lg shadow-orange-500/10 ${(!hasValidationResult || !allValidated)
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'}`}
                                    >
                                        <RefreshCw className={`size-4 ${!hasValidationResult ? 'animate-spin-once' : ''}`} />
                                        {t('import.validateSections')}
                                    </button>

                                    <button
                                        onClick={() => handleContinue(true)}
                                        disabled={!hasValidationResult || allValidated}
                                        className={`px-8 py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-blue-500/10 ${hasValidationResult && !allValidated
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'}`}
                                    >
                                        {t('import.editManually')}
                                    </button>

                                    <button
                                        onClick={() => handleContinue(false)}
                                        disabled={!hasValidationResult || !allValidated}
                                        className={`px-8 py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/10 ${hasValidationResult && allValidated
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'}`}
                                    >
                                        {t('import.analyzeAts')}
                                        <ArrowRight className="size-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── ANALYSING ───────────────────────────── */}
                    {step === 'ANALYSING' && (
                        <ChatView 
                            key="analysing" 
                            bubbles={analysingBubbles} 
                            title={t('import.analysingTitle')} 
                            t={t} 
                            isProcessing={isProcessing} 
                            onAbort={handleAbort}
                        />
                    )}


                    {/* ── SAVING ──────────────────────────────── */}
                    {step === 'SAVING' && (
                        <div className="flex flex-col items-center justify-center p-16 text-center min-h-[480px]">
                            <div className="size-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Check className="size-7" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t('import.saveRedirect')}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('import.syncResults')}</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
