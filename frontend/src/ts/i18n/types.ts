// Internationalization type definitions

/**
 * Supported locales in the application
 */
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'hi';

/**
 * String key type for type-safe string resource access
 */
export type StringKey = keyof typeof STRINGS.en;

/**
 * String interpolation parameters
 */
export interface StringParams {
    [key: string]: string | number | boolean | undefined;
}

/**
 * Translation function type
 */
export type TranslationFunction = (key: StringKey, params?: StringParams) => string;

/**
 * Locale context interface
 */
export interface LocaleContext {
    locale: SupportedLocale;
    fallbackLocale: SupportedLocale;
    t: TranslationFunction;
}

/**
 * String resource validation function
 */
export type StringValidator = (key: string, value: string) => boolean;

/**
 * Missing key handler function
 */
export type MissingKeyHandler = (key: StringKey, locale: SupportedLocale) => string;