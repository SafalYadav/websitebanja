// src/lib/constants/indianLanguages.ts
export * from './mitraLanguages';

import { MITRA_LANGUAGE_LIST, type MitraLanguageConfig } from './mitraLanguages';

export interface IndianLanguage {
  code: string;
  name: string;
  nativeName: string;
  greeting: string;
}

export const SUPPORTED_INDIAN_LANGUAGES: IndianLanguage[] = MITRA_LANGUAGE_LIST.map((lang: MitraLanguageConfig) => ({
  code: lang.code,
  name: lang.name,
  nativeName: lang.displayName,
  greeting: lang.greeting,
}));

export const DEFAULT_LANGUAGE = SUPPORTED_INDIAN_LANGUAGES[0];
