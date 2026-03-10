import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Experience = {
    id: string;
    position: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
};

export type Education = {
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
};

export type SkillCategory = {
    id: string;
    category: string;
    skills: string[];
};

export type PersonalInfo = {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
    title: string;
    photoUrl?: string;
};

export type AppearanceSettings = {
    fontFamily: string;
    fontSize: string;
    lineSpacing: string;
    pageSize: 'A4' | 'LETTER' | 'LEGAL' | 'EXECUTIVE';
};

export type SectionType = 'STANDARD' | 'TEXT' | 'SIMPLE_LIST' | 'DATED_LIST';

export type DatedListItem = {
    id: string;
    title: string;
    subtitle: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
};

export type SectionConfig = {
    id: string;
    title: string;
    type: SectionType;
    active: boolean;
    content?: string;
    items?: string[] | DatedListItem[];
};

export interface AICheck {
  label: string;
  passed: boolean;
  feedback: string;
}

export interface AIMetric {
  value: number;
  target: string;
  status: 'good' | 'warning' | 'danger';
}

export interface DetailedSuggestion {
  type: string;
  field: string;
  original: string;
  issue: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  resolved?: boolean;
}

export interface AIAnalysis {
  score: number;
  scores: {
    design: number;
    estrutura: number;
    conteudo: number;
  };
  designChecks: AICheck[];
  estruturaChecks: AICheck[];
  conteudoMetrics: {
    wordCount: AIMetric;
    paragraphsPerSection: AIMetric;
    charsPerParagraph: AIMetric;
    experienceDescriptions: AIMetric;
    starBullets?: AIMetric;
    keywordCount?: AIMetric;
    pageCount?: AIMetric;
  };
  improvedBullets: { original: string; improved: string; section?: string; index?: number; reason?: string }[];
  detailedSuggestions?: DetailedSuggestion[];
  jdMatch?: {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
  };
  methodology?: string;
}

export type Certification = {
    id: string;
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
};

export type Language = {
    id: string;
    language: string;
    proficiency: string;
};

export type Volunteer = {
    id: string;
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
};

export type ResumeData = {
    personalInfo: PersonalInfo;
    summary: string;
    experiences: Experience[];
    education: Education[];
    skills: SkillCategory[];
    projects: DatedListItem[];
    certifications?: Certification[];
    languages?: Language[];
    volunteer?: Volunteer[];
    templateId: string;
    appearance: AppearanceSettings;
    sectionsConfig: SectionConfig[];
    aiAnalysis?: AIAnalysis;
    jdAnalysis?: AIAnalysis;
    jobDescription?: string;
    language: 'pt' | 'en';
};

type ResumeStore = {
    resumeId: string | null;
    data: ResumeData;
    activeSection: string;
    syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
    needsNewAnalysis: boolean;
    isAnalyzing: boolean;
    error: string | null;
    debugInfo: {
        lastPayload?: any;
        lastResponse?: any;
    } | null;

    setResumeId: (id: string) => void;
    setSyncStatus: (status: 'idle' | 'loading' | 'saving' | 'saved' | 'error') => void;
    saveLocalResume: () => Promise<void>;
    loadLocalResume: (id: string) => Promise<void>;
    setActiveSection: (section: string) => void;
    updatePersonalInfo: (info: Partial<PersonalInfo>) => void;
    updateSummary: (summary: string) => void;
    setTemplateId: (templateId: string) => void;
    updateAppearance: (settings: Partial<AppearanceSettings>) => void;
    setAiAnalysis: (analysis: AIAnalysis, isJD?: boolean) => void;
    analyzeResume: (atsPrompt?: string, jobDescription?: string, aiSettings?: any, language?: string) => Promise<void>;

    addExperience: () => void;
    updateExperience: (id: string, exp: Partial<Experience>) => void;
    removeExperience: (id: string) => void;

    addEducation: () => void;
    updateEducation: (id: string, edu: Partial<Education>) => void;
    removeEducation: (id: string) => void;

    addSkillCategory: () => void;
    updateSkillCategory: (id: string, category: string, skills: string[]) => void;
    removeSkillCategory: (id: string) => void;

    toggleSection: (id: string, active: boolean) => void;
    renameSection: (id: string, title: string) => void;
    addCustomSection: (type: SectionType) => void;
    removeSection: (id: string) => void;
    updateSectionContent: (id: string, content: string) => void;
    addSectionListItem: (sectionId: string) => void;
    updateSectionListItem: (sectionId: string, itemId: string, data: any) => void;
    removeSectionListItem: (sectionId: string, itemId: string) => void;
    reorderSections: (newOrder: SectionConfig[]) => void;

    setFullData: (data: ResumeData) => void;
    setJobDescription: (jd: string) => void;

    setLanguage: (lang: 'pt' | 'en') => void;
    translateResume: (targetLang: 'pt' | 'en', authSettings?: any) => Promise<void>;
    
    // Suggestion application methods
    applySuggestion: (suggestion: DetailedSuggestion) => void;
    applyMultipleSuggestions: (suggestions: DetailedSuggestion[]) => void;
    markSuggestionsApplied: (suggestions: DetailedSuggestion[]) => void;
};

const DEFAULT_TITLES: Record<string, { pt: string, en: string }> = {
    personal: { pt: 'Informações Pessoais', en: 'Personal Information' },
    summary: { pt: 'Resumo Profissional', en: 'Professional Summary' },
    experience: { pt: 'Experiência Profissional', en: 'Professional Experience' },
    education: { pt: 'Formação Acadêmica', en: 'Education' },
    skills: { pt: 'Competências', en: 'Skills' },
};

const EMPTY_RESUME_DATA: ResumeData = {
    personalInfo: {
        fullName: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
        photoUrl: '',
    },
    summary: '',
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    templateId: 'classic',
    appearance: {
        fontFamily: 'Inter',
        fontSize: '11',
        lineSpacing: '1.5',
        pageSize: 'A4',
    },
    sectionsConfig: [
        { id: 'personal', title: 'Informações Pessoais', type: 'STANDARD', active: true },
        { id: 'summary', title: 'Resumo Profissional', type: 'STANDARD', active: true },
        { id: 'experience', title: 'Experiência Profissional', type: 'STANDARD', active: true },
        { id: 'education', title: 'Formação Acadêmica', type: 'STANDARD', active: true },
        { id: 'projects', title: 'Projetos de Destaque', type: 'DATED_LIST', active: true },
        { id: 'skills', title: 'Habilidades & Competências', type: 'STANDARD', active: true },
        { id: 'certifications', title: 'Certificações', type: 'SIMPLE_LIST', active: false, items: [] },
        { id: 'languages', title: 'Idiomas', type: 'TEXT', active: false, content: '' },
        { id: 'volunteer', title: 'Voluntariado', type: 'DATED_LIST', active: false, items: [] },
    ],
    jobDescription: '',
    language: 'pt',
};

export const useResumeStore = create<ResumeStore>((set, get) => ({
    resumeId: null,
    data: EMPTY_RESUME_DATA,
    activeSection: 'personal',
    syncStatus: 'idle',
    needsNewAnalysis: true,
    isAnalyzing: false,
    error: null,
    debugInfo: null,

    setResumeId: (id) => {
      if (typeof window !== 'undefined' && id) {
        localStorage.setItem('lastResumeId', id);
      }
      set({ resumeId: id });
    },
    setSyncStatus: (status) => set({ syncStatus: status }),

    loadLocalResume: async (id) => {
        if (typeof window !== 'undefined' && id) {
          localStorage.setItem('lastResumeId', id);
        }
        set({ syncStatus: 'loading', resumeId: id, needsNewAnalysis: false });
        try {
            const res = await fetch(`/api/resumes/${id}`);
            if (!res.ok) throw new Error('Resume not found');
            const data = await res.json();

            const dataSections = data.sectionsConfig || data.sections_config || [];
            
            // Merge inteligente: preserve todas as seções padrão e atualize apenas as que vieram da IA
            const mergedSections = [...EMPTY_RESUME_DATA.sectionsConfig];
            if (dataSections && Array.isArray(dataSections)) {
                for (const dataSection of dataSections) {
                    const index = mergedSections.findIndex(s => s.id === dataSection.id);
                    if (index >= 0) {
                        // Mesclar preservando a ordem e estrutura padrão
                        mergedSections[index] = { 
                            ...mergedSections[index], 
                            ...dataSection,
                            // Garantir que type não seja alterado
                            type: mergedSections[index].type 
                        };
                    }
                }
            }

            // Mover data.projects para sectionsConfig se existir
            if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
                const projIndex = mergedSections.findIndex(s => s.id === 'projects');
                if (projIndex >= 0) {
                    // Evitar sobrescrever se já existir items carregados pelo sectionsConfig
                    if (!mergedSections[projIndex].items || mergedSections[projIndex].items.length === 0) {
                        mergedSections[projIndex].items = data.projects;
                    }
                }
            }

            const mergedData: ResumeData = {
                ...EMPTY_RESUME_DATA,
                ...data,
                personalInfo: { ...EMPTY_RESUME_DATA.personalInfo, ...(data.personalInfo || {}) },
                appearance: { ...EMPTY_RESUME_DATA.appearance, ...(data.appearance || {}) },
                experiences: data.experiences || [],
                education: data.education || [],
                skills: data.skills || [],
                projects: data.projects || [],
                sectionsConfig: mergedSections,
                aiAnalysis: data.aiAnalysis || data.ai_analysis || undefined,
                jdAnalysis: data.jdAnalysis || undefined,
                language: data.language || 'pt',
            };

            set({ data: mergedData, syncStatus: 'idle' });
        } catch (error) {
            console.error('Error loading resume:', error);
            set({ syncStatus: 'error' });
        }
    },

    saveLocalResume: async () => {
        const { resumeId, data } = get();
        set({ syncStatus: 'saving' });
        if (!resumeId) {
            set({ syncStatus: 'saved' });
            setTimeout(() => set({ syncStatus: 'idle' }), 3000);
            return;
        }
        try {
            const res = await fetch(`/api/resumes/${resumeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeData: data })
            });
            if (!res.ok) throw new Error('Failed to save resume');
            set({ syncStatus: 'saved' });
            setTimeout(() => { if (get().syncStatus === 'saved') set({ syncStatus: 'idle' }); }, 3000);
        } catch (error) {
            console.error('Error saving resume:', error);
            set({ syncStatus: 'error' });
        }
    },

    analyzeResume: async (atsPrompt, jobDescription, aiSettings, language = 'pt') => {
        set({ isAnalyzing: true, error: null });
        const payload = {
            resumeData: get().data,
            atsPrompt,
            jobDescription,
            aiSettings,
            language
        };
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            set({ debugInfo: { lastPayload: payload, lastResponse: result } });

            if (!response.ok) {
                const errorMessage = result.error || (response.status === 503 ? "AI service overloaded. Please try again." : "Erro ao processar análise.");
                throw new Error(errorMessage);
            }

            if (jobDescription) {
                set((state) => ({
                    data: { ...state.data, jdAnalysis: result },
                    isAnalyzing: false,
                    needsNewAnalysis: false
                }));
            } else {
                set((state) => ({
                    data: { ...state.data, aiAnalysis: result },
                    isAnalyzing: false,
                    needsNewAnalysis: false
                }));
            }

            get().saveLocalResume();
        } catch (err: any) {
            set({ error: err.message, isAnalyzing: false });
        }
    },

    setActiveSection: (section) => set({ activeSection: section }),
    updatePersonalInfo: (info) => set((state) => ({ data: { ...state.data, personalInfo: { ...state.data.personalInfo, ...info } } })),
    updateSummary: (summary) => set((state) => ({ data: { ...state.data, summary } })),
    setTemplateId: (templateId) => set((state) => ({ data: { ...state.data, templateId } })),
    updateAppearance: (settings) => set((state) => ({ data: { ...state.data, appearance: { ...state.data.appearance, ...settings } } })),
    setAiAnalysis: (analysis, isJD) => {
        set((state) => ({
            needsNewAnalysis: false,
            data: {
                ...state.data,
                [isJD ? 'jdAnalysis' : 'aiAnalysis']: analysis
            }
        }));
        get().saveLocalResume();
    },

    addExperience: () => set((state) => ({ data: { ...state.data, experiences: [...state.data.experiences, { id: uuidv4(), position: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }] } })),
    updateExperience: (id, exp) => set((state) => ({ data: { ...state.data, experiences: state.data.experiences.map((e) => e.id === id ? { ...e, ...exp } : e) } })),
    removeExperience: (id) => set((state) => ({ data: { ...state.data, experiences: state.data.experiences.filter((e) => e.id !== id) } })),
    addEducation: () => set((state) => ({ data: { ...state.data, education: [...state.data.education, { id: uuidv4(), degree: '', institution: '', location: '', startDate: '', endDate: '', current: false, description: '' }] } })),
    updateEducation: (id, edu) => set((state) => ({ data: { ...state.data, education: state.data.education.map((e) => e.id === id ? { ...e, ...edu } : e) } })),
    removeEducation: (id) => set((state) => ({ data: { ...state.data, education: state.data.education.filter((e) => e.id !== id) } })),
    addSkillCategory: () => set((state) => ({ data: { ...state.data, skills: [...state.data.skills, { id: uuidv4(), category: '', skills: [] }] } })),
    updateSkillCategory: (id, category, skills) => set((state) => ({ data: { ...state.data, skills: state.data.skills.map((s) => s.id === id ? { ...s, category, skills } : s) } })),
    removeSkillCategory: (id) => set((state) => ({ data: { ...state.data, skills: state.data.skills.filter((s) => s.id !== id) } })),
    toggleSection: (id, active) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => s.id === id ? { ...s, active } : s) } })),
    renameSection: (id, title) => set((state) => {
        let finalTitle = title.trim();
        if (!finalTitle) finalTitle = DEFAULT_TITLES[id] ? DEFAULT_TITLES[id][state.data.language] : (state.data.language === 'pt' ? 'Nova Seção' : 'New Section');
        return { data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => s.id === id ? { ...s, title: finalTitle } : s) } };
    }),
    addCustomSection: (type) => set((state) => {
        const newId = `custom_${uuidv4()}`;
        const newSection: SectionConfig = { id: newId, title: 'Nova Seção', type, active: true, content: type === 'TEXT' ? '' : undefined, items: type === 'SIMPLE_LIST' ? [] : (type === 'DATED_LIST' ? [] : undefined) };
        return { data: { ...state.data, sectionsConfig: [...state.data.sectionsConfig, newSection] }, activeSection: newId };
    }),
    removeSection: (id) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.filter((s) => s.id !== id) } })),
    updateSectionContent: (id, content) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => s.id === id ? { ...s, content } : s) } })),
    addSectionListItem: (sectionId) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.type === 'SIMPLE_LIST') return { ...s, items: [...(s.items as string[] || []), ''] };
        if (s.type === 'DATED_LIST') return { ...s, items: [...(s.items as DatedListItem[] || []), { id: uuidv4(), title: '', subtitle: '', location: '', startDate: '', endDate: '', current: false, description: '' }] };
        return s;
    }) } })),
    updateSectionListItem: (sectionId, itemId, data) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.type === 'SIMPLE_LIST') { const idx = parseInt(itemId); const newItems = [...(s.items as string[])]; newItems[idx] = data; return { ...s, items: newItems }; }
        if (s.type === 'DATED_LIST') return { ...s, items: (s.items as DatedListItem[]).map((item) => item.id === itemId ? { ...item, ...data } : item) };
        return s;
    }) } })),
    removeSectionListItem: (sectionId, itemId) => set((state) => ({ data: { ...state.data, sectionsConfig: state.data.sectionsConfig.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.type === 'SIMPLE_LIST') { const idx = parseInt(itemId); return { ...s, items: (s.items as string[]).filter((_, i) => i !== idx) }; }
        if (s.type === 'DATED_LIST') return { ...s, items: (s.items as DatedListItem[]).filter((i) => i.id !== itemId) };
        return s;
    }) } })),
    reorderSections: (newOrder) => set((state) => ({ data: { ...state.data, sectionsConfig: newOrder } })),
    setFullData: (data) => set((state) => {
        const newData = { ...data };
        if (newData.projects && Array.isArray(newData.projects) && newData.projects.length > 0) {
            const sections = [...(newData.sectionsConfig || state.data.sectionsConfig)];
            const projIdx = sections.findIndex(s => s.id === 'projects');
            if (projIdx >= 0 && (!sections[projIdx].items || sections[projIdx].items.length === 0)) {
                sections[projIdx] = { ...sections[projIdx], items: newData.projects };
                newData.sectionsConfig = sections;
            }
        }
        return { data: newData };
    }),
    setJobDescription: (jd) => set((state) => ({ data: { ...state.data, jobDescription: jd } })),
    setLanguage: (language) => set((state) => ({ data: { ...state.data, language } })),
    translateResume: async (targetLang, authSettings) => {
        const { data, setFullData, setSyncStatus } = get();
        if (data.language === targetLang) return;
        setSyncStatus('saving');
        try {
            const { translateResumeData } = await import('@/app/actions/ai');
            const { response: translatedData } = await translateResumeData(data, targetLang, authSettings);
            const newSections = translatedData.sectionsConfig.map((s: SectionConfig) => {
                const defaults = DEFAULT_TITLES[s.id];
                if (defaults && s.title === defaults[data.language]) return { ...s, title: defaults[targetLang] };
                return s;
            });
            setFullData({ ...translatedData, sectionsConfig: newSections, language: targetLang });
            set({ needsNewAnalysis: true });
            setSyncStatus('saved');
        } catch (error) { console.error('Translation failed:', error); setSyncStatus('error'); }
    },

    // Suggestion application methods
    applySuggestion: (suggestion) => {
        set((state) => {
            const newState = { ...state };
            
            // Apply the suggestion based on its type and field
            switch (suggestion.type) {
                case 'experience':
                    if (suggestion.field.startsWith('bullet_')) {
                        // Find and update the specific experience bullet
                        const experienceIndex = newState.data.experiences.findIndex(exp => 
                            exp.id === suggestion.field.split('_')[1]
                        );
                        if (experienceIndex >= 0) {
                            const updatedExperiences = [...newState.data.experiences];
                            const bulletIndex = parseInt(suggestion.field.split('_')[2]);
                            
                            // Split description by bullet points and update the specific one
                            const bullets = updatedExperiences[experienceIndex].description.split('\n•').map((bullet, idx) => 
                                idx === bulletIndex ? suggestion.suggestion : bullet.trim()
                            );
                            
                            updatedExperiences[experienceIndex].description = bullets.join('\n•');
                        }
                    }
                    break;
                    
                case 'skills':
                    // Update skills section
                    const skillIndex = newState.data.skills.findIndex(skill => 
                        skill.id === suggestion.field
                    );
                    if (skillIndex >= 0) {
                        const updatedSkills = [...newState.data.skills];
                        const categoryIndex = parseInt(suggestion.field.split('_')[1]);
                        if (categoryIndex >= 0 && categoryIndex < updatedSkills[skillIndex].skills.length) {
                            updatedSkills[skillIndex].skills[categoryIndex] = suggestion.suggestion;
                        }
                    }
                    break;
                    
                case 'summary':
                    // Update summary
                    newState.data.summary = suggestion.suggestion;
                    break;
                    
                case 'personal':
                    // Update personal info field
                    if (suggestion.field in newState.data.personalInfo) {
                        newState.data.personalInfo = {
                            ...newState.data.personalInfo,
                            [suggestion.field]: suggestion.suggestion
                        };
                    }
                    break;
            }
            
            // Mark suggestion as applied
            if (newState.data.aiAnalysis?.detailedSuggestions) {
                newState.data.aiAnalysis.detailedSuggestions = newState.data.aiAnalysis.detailedSuggestions.map(s => 
                    s.field === suggestion.field && s.type === suggestion.type 
                        ? { ...s, resolved: true }
                        : s
                );
            }
            
            return { data: newState.data, needsNewAnalysis: true };
        });
    },

    applyMultipleSuggestions: (suggestions) => {
        set((state) => {
            const newState = { ...state };
            
            // Apply each suggestion
            suggestions.forEach(suggestion => {
                switch (suggestion.type) {
                    case 'experience':
                        if (suggestion.field.startsWith('bullet_')) {
                            const experienceIndex = newState.data.experiences.findIndex(exp => 
                                exp.id === suggestion.field.split('_')[1]
                            );
                            if (experienceIndex >= 0) {
                                const updatedExperiences = [...newState.data.experiences];
                                const bulletIndex = parseInt(suggestion.field.split('_')[2]);
                                
                                // Split description by bullet points and update the specific one
                                const bullets = updatedExperiences[experienceIndex].description.split('\n•').map((bullet, idx) => 
                                    idx === bulletIndex ? suggestion.suggestion : bullet.trim()
                                );
                                
                                updatedExperiences[experienceIndex].description = bullets.join('\n•');
                            }
                        }
                        break;
                        
                    case 'skills':
                        const skillIndex = newState.data.skills.findIndex(skill => 
                            skill.id === suggestion.field
                        );
                        if (skillIndex >= 0) {
                            const updatedSkills = [...newState.data.skills];
                            const categoryIndex = parseInt(suggestion.field.split('_')[1]);
                            if (categoryIndex >= 0 && categoryIndex < updatedSkills[skillIndex].skills.length) {
                                updatedSkills[skillIndex].skills[categoryIndex] = suggestion.suggestion;
                            }
                        }
                        break;
                        
                    case 'summary':
                        newState.data.summary = suggestion.suggestion;
                        break;
                        
                    case 'personal':
                        if (suggestion.field in newState.data.personalInfo) {
                            newState.data.personalInfo = {
                                ...newState.data.personalInfo,
                                [suggestion.field]: suggestion.suggestion
                            };
                        }
                        break;
                }
            });
            
            // Mark all suggestions as applied
            if (newState.data.aiAnalysis?.detailedSuggestions) {
                newState.data.aiAnalysis.detailedSuggestions = newState.data.aiAnalysis.detailedSuggestions.map(s => 
                    suggestions.some(selected => selected.field === s.field && selected.type === s.type)
                        ? { ...s, resolved: true }
                        : s
                );
            }
            
            return { data: newState.data, needsNewAnalysis: true };
        });
    },

    markSuggestionsApplied: (suggestions) => {
        set((state) => {
            if (!state.data.aiAnalysis?.detailedSuggestions) return state;
            
            const updatedSuggestions = state.data.aiAnalysis.detailedSuggestions.map(s => 
                suggestions.some(selected => selected.field === s.field && selected.type === s.type)
                    ? { ...s, resolved: true }
                    : s
            );
            
            return {
                data: {
                    ...state.data,
                    aiAnalysis: {
                        ...state.data.aiAnalysis,
                        detailedSuggestions: updatedSuggestions
                    }
                },
                needsNewAnalysis: true
            };
        });
    },
}));
