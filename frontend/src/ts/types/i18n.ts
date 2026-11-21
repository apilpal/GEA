import { STRINGS } from '../i18n/en';

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'hi';
export type StringKey = keyof typeof STRINGS;
export interface StringParams {
    [key: string]: string | number | boolean | undefined;
}
export type TranslationFunction = (key: StringKey, params?: StringParams) => string;
export interface LocaleContext {
    locale: SupportedLocale;
    fallbackLocale: SupportedLocale;
    t: TranslationFunction;
}
export type StringValidator = (key: string, value: string) => boolean;
export type MissingKeyHandler = (key: StringKey, locale: SupportedLocale) => string;