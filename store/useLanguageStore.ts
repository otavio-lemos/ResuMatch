import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import { Language } from '../lib/translations';

interface LanguageStore {
  language: Language;
  hasUserPreference: boolean;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'pt',
      hasUserPreference: false,
      setLanguage: (language) => set({language, hasUserPreference: true}),
    }),
    {name: 'language-storage'}
  )
);

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'pt';
  
  const stored = localStorage.getItem('language-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.language) {
        return parsed.state.language;
      }
    } catch {}
  }
  
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'pt';
}
