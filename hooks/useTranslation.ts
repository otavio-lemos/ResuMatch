'use client';

import { useLanguageStore } from '@/store/useLanguageStore';
import { translations, Language } from '@/lib/translations';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations.pt>;

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  
  const t = (key: string) => {
    const keys = key.split('.');
    let result: any = translations[language];
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return undefined;
      }
    }
    
    return result;
  };
  
  return { t, language };
}

export function getTranslation(key: string, language: Language): string {
  const keys = key.split('.');
  let result: any = translations[language];
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  
  return typeof result === 'string' ? result : key;
}
