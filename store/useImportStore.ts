import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type WizardStep = 'UPLOAD' | 'PARSING' | 'REVIEW' | 'ANALYSING' | 'SAVING' | 'FINISH';

export type ChatBubble = {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  type: 'text' | 'mapping' | 'progress';
  data?: any;
};

export type MappingRow = {
  id: string;
  userLabel: string;
  atsKey: string | null;
  validated: boolean;
  isAiSuggestion?: boolean;
};

export type CurriculumChip = {
  key: string;
  label: string;
};

export type ImportState = {
  step: WizardStep;
  fileName: string | null;
  fileSize: number | null;
  // Parsing chat
  parsingBubbles: ChatBubble[];
  parsedData: any | null;
  // Mapping
  mappingRows: MappingRow[];
  curriculumChips: CurriculumChip[];
  // Analysis chat
  analysingBubbles: ChatBubble[];
  // Status
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: WizardStep) => void;
  setFileInfo: (name: string, size: number) => void;
  addParsingBubble: (bubble: Omit<ChatBubble, 'id'>) => void;
  setParsingBubbles: (bubbles: ChatBubble[]) => void;
  updateParsingBubble: (id: string, updates: Partial<ChatBubble>) => void;
  setParsedData: (data: any) => void;
  setMappingRows: (rows: MappingRow[] | ((prev: MappingRow[]) => MappingRow[])) => void;
  setCurriculumChips: (chips: CurriculumChip[]) => void;
  addAnalysingBubble: (bubble: Omit<ChatBubble, 'id'>) => void;
  setAnalysingBubbles: (bubbles: ChatBubble[]) => void;
  updateAnalysingBubble: (id: string, updates: Partial<ChatBubble>) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  step: 'UPLOAD' as WizardStep,
  fileName: null,
  fileSize: null,
  parsingBubbles: [],
  parsedData: null,
  mappingRows: [],
  curriculumChips: [],
  analysingBubbles: [],
  isProcessing: false,
  error: null,
};

export const useImportStore = create<ImportState>()(
  (set) => ({
    ...INITIAL_STATE,

    setStep: (step) => set({ step }),
      
      setFileInfo: (fileName, fileSize) => set({ fileName, fileSize }),
      
      addParsingBubble: (bubble) => set((state) => ({ 
        parsingBubbles: [...state.parsingBubbles, { ...bubble, id: uuidv4() }] 
      })),
      
      setParsingBubbles: (parsingBubbles) => set({ parsingBubbles }),
      
      updateParsingBubble: (id, updates) => set((state) => ({
        parsingBubbles: state.parsingBubbles.map((b) => b.id === id ? { ...b, ...updates } : b)
      })),
      
      setParsedData: (parsedData) => set({ parsedData }),
      
      setMappingRows: (rowsOrFn) => set((state) => ({
        mappingRows: typeof rowsOrFn === 'function' ? rowsOrFn(state.mappingRows) : rowsOrFn
      })),
      
      setCurriculumChips: (curriculumChips) => set({ curriculumChips }),
      
      addAnalysingBubble: (bubble) => set((state) => ({ 
        analysingBubbles: [...state.analysingBubbles, { ...bubble, id: uuidv4() }] 
      })),
      
      setAnalysingBubbles: (analysingBubbles) => set({ analysingBubbles }),
      
      updateAnalysingBubble: (id, updates) => set((state) => ({
        analysingBubbles: state.analysingBubbles.map((b) => b.id === id ? { ...b, ...updates } : b)
      })),
      
      setIsProcessing: (isProcessing) => set({ isProcessing }),
      
      setError: (error) => set({ error }),
      
      reset: () => set(INITIAL_STATE),
    })
);
