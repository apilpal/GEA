import { STRINGS as EN_STRINGS } from './en';
import { SupportedLocale, StringKey, StringParams, TranslationFunction, LocaleContext } from '../types/i18n';
declare const STRING_RESOURCES: Record<SupportedLocale, typeof EN_STRINGS>;
declare const DEFAULT_CONFIG: {
    readonly locale: SupportedLocale;
    readonly fallbackLocale: SupportedLocale;
    readonly validateStrings: true;
    readonly handleMissingKeys: "fallback" | "error" | "default";
    readonly missingKeyValue: "??KEY_MISSING??";
};
export declare function getTranslationFunction(): TranslationFunction;
export declare function t(key: StringKey, params?: StringParams): string;
export declare function getCurrentLocale(): SupportedLocale;
export declare function setLocale(locale: SupportedLocale): void;
export declare function getFallbackLocale(): SupportedLocale;
export declare function setFallbackLocale(locale: SupportedLocale): void;
export declare function configureI18n(config: Partial<typeof DEFAULT_CONFIG>): void;
export declare function getAvailableLocales(): SupportedLocale[];
export declare function isLocaleSupported(locale: string): locale is SupportedLocale;
export declare function getAllStringKeys(): StringKey[];
export declare function validateStringResources(): {
    valid: boolean;
    errors: string[];
};
export declare function getLocaleContext(): LocaleContext;
export declare function initializeI18n(): void;
export type { SupportedLocale, StringKey, StringParams, TranslationFunction, LocaleContext, StringValidator, MissingKeyHandler, } from '../types/i18n';
export { STRING_RESOURCES };
declare const _default: {
    t: typeof t;
    getCurrentLocale: typeof getCurrentLocale;
    setLocale: typeof setLocale;
    getFallbackLocale: typeof getFallbackLocale;
    setFallbackLocale: typeof setFallbackLocale;
    configureI18n: typeof configureI18n;
    getAvailableLocales: typeof getAvailableLocales;
    isLocaleSupported: typeof isLocaleSupported;
    getAllStringKeys: typeof getAllStringKeys;
    validateStringResources: typeof validateStringResources;
    getLocaleContext: typeof getLocaleContext;
    initializeI18n: typeof initializeI18n;
};
export default _default;
//# sourceMappingURL=index.d.ts.map