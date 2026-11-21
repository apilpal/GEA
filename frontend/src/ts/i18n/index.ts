// Internationalization service with TypeScript support

import { STRINGS as EN_STRINGS } from './en';
import { STRINGS as ES_STRINGS } from './es';
import {
    SupportedLocale,
    StringKey,
    StringParams,
    TranslationFunction,
    LocaleContext,
    StringValidator,
    MissingKeyHandler
} from './types';

/**
 * String resources for all supported locales
 */
const STRING_RESOURCES: Record<SupportedLocale, typeof EN_STRINGS> = {
    en: EN_STRINGS,
    es: ES_STRINGS,
    // Future locales can be added here
    // fr: FR_STRINGS,
    // de: DE_STRINGS,
    // hi: HI_STRINGS,
} as const;

/**
 * Default configuration for the i18n service
 */
const DEFAULT_CONFIG = {
    locale: 'en' as SupportedLocale,
    fallbackLocale: 'en' as SupportedLocale,
    validateStrings: true,
    handleMissingKeys: 'fallback' as 'fallback' | 'error' | 'default',
    missingKeyValue: '??KEY_MISSING??',
} as const;

/**
 * Current i18n configuration
 */
let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Cache for compiled translation functions
 */
const translationCache = new Map<string, TranslationFunction>();

/**
 * Default string validator
 */
const defaultValidator: StringValidator = (key: string, value: string): boolean => {
    return typeof value === 'string' && value.length > 0;
};

/**
 * Default missing key handler
 */
const defaultMissingKeyHandler: MissingKeyHandler = (key: StringKey, locale: SupportedLocale): string => {
    console.warn(`Missing translation key "${String(key)}" for locale "${locale}"`);
    return currentConfig.missingKeyValue;
};

/**
 * Interpolates parameters into a string
 */
function interpolateString(str: string, params?: StringParams): string {
    if (!params) return str;

    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = params[key];
        return value !== undefined ? String(value) : match;
    });
}

/**
 * Creates a translation function for a specific locale
 */
function createTranslationFunction(locale: SupportedLocale): TranslationFunction {
    const cacheKey = `t_${locale}`;
    const strings = STRING_RESOURCES[locale] || STRING_RESOURCES[currentConfig.fallbackLocale];

    return (key: StringKey, params?: StringParams): string => {
        const keyStr = String(key);
        const keys = keyStr.split('.');
        let value: any = strings;

        // Navigate through nested object structure
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }

        // Handle missing keys
        if (typeof value !== 'string') {
            switch (currentConfig.handleMissingKeys) {
                case 'error':
                    throw new Error(`Missing translation key "${keyStr}" for locale "${locale}"`);
                case 'fallback':
                    return defaultMissingKeyHandler(key, locale);
                case 'default':
                default:
                    return currentConfig.missingKeyValue;
            }
        }

        // Validate string if validation is enabled
        if (currentConfig.validateStrings && !defaultValidator(keyStr, value)) {
            console.warn(`Invalid string value for key "${keyStr}" in locale "${locale}"`);
        }

        // Interpolate parameters
        return interpolateString(value, params);
    };
}

/**
 * Gets a translation function for the current locale
 */
export function getTranslationFunction(): TranslationFunction {
    const cacheKey = `t_${currentConfig.locale}`;

    if (!translationCache.has(cacheKey)) {
        translationCache.set(cacheKey, createTranslationFunction(currentConfig.locale));
    }

    return translationCache.get(cacheKey)!;
}

/**
 * Translates a string key with optional parameters
 */
export function t(key: StringKey, params?: StringParams): string {
    return getTranslationFunction()(key, params);
}

/**
 * Gets the current locale
 */
export function getCurrentLocale(): SupportedLocale {
    return currentConfig.locale;
}

/**
 * Sets the current locale
 */
export function setLocale(locale: SupportedLocale): void {
    if (!STRING_RESOURCES[locale]) {
        console.warn(`Locale "${locale}" not found, falling back to "${currentConfig.fallbackLocale}"`);
        locale = currentConfig.fallbackLocale;
    }

    currentConfig.locale = locale;
    translationCache.clear(); // Clear cache when locale changes
}

/**
 * Gets the fallback locale
 */
export function getFallbackLocale(): SupportedLocale {
    return currentConfig.fallbackLocale;
}

/**
 * Sets the fallback locale
 */
export function setFallbackLocale(locale: SupportedLocale): void {
    currentConfig.fallbackLocale = locale;
}

/**
 * Configures the i18n service
 */
export function configureI18n(config: Partial<typeof DEFAULT_CONFIG>): void {
    currentConfig = { ...currentConfig, ...config };
    translationCache.clear(); // Clear cache when config changes
}

/**
 * Gets all available locales
 */
export function getAvailableLocales(): SupportedLocale[] {
    return Object.keys(STRING_RESOURCES) as SupportedLocale[];
}

/**
 * Checks if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is SupportedLocale {
    return locale in STRING_RESOURCES;
}

/**
 * Gets all string keys for the current locale
 */
export function getAllStringKeys(): StringKey[] {
    const strings = STRING_RESOURCES[currentConfig.locale] || STRING_RESOURCES[currentConfig.fallbackLocale];
    const keys: StringKey[] = [];

    function extractKeys(obj: any, prefix = ''): void {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'string') {
                keys.push(fullKey as StringKey);
            } else if (typeof value === 'object' && value !== null) {
                extractKeys(value, fullKey);
            }
        }
    }

    extractKeys(strings);
    return keys;
}

/**
 * Validates all string resources
 */
export function validateStringResources(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let valid = true;

    for (const [locale, strings] of Object.entries(STRING_RESOURCES)) {
        function validateObject(obj: any, prefix = ''): void {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (typeof value === 'string') {
                    if (!defaultValidator(fullKey, value)) {
                        errors.push(`Invalid string for key "${fullKey}" in locale "${locale}"`);
                        valid = false;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    validateObject(value, fullKey);
                } else {
                    errors.push(`Invalid value type for key "${fullKey}" in locale "${locale}"`);
                    valid = false;
                }
            }
        }

        validateObject(strings, '');
    }

    return { valid, errors };
}

/**
 * Exports the current locale context
 */
export function getLocaleContext(): LocaleContext {
    return {
        locale: currentConfig.locale,
        fallbackLocale: currentConfig.fallbackLocale,
        t: getTranslationFunction(),
    };
}

/**
 * Initializes the i18n service with browser locale detection
 */
export function initializeI18n(): void {
    // Detect browser locale
    const browserLocale = navigator.language.split('-')[0] as SupportedLocale;

    if (isLocaleSupported(browserLocale)) {
        setLocale(browserLocale);
    } else {
        console.info(`Browser locale "${browserLocale}" not supported, using default "${currentConfig.locale}"`);
    }

    // Validate string resources in development
    if (process.env.NODE_ENV === 'development') {
        const validation = validateStringResources();
        if (!validation.valid) {
            console.warn('String resource validation errors:', validation.errors);
        }
    }
}

// Export types for use in components
export type {
    SupportedLocale,
    StringKey,
    StringParams,
    TranslationFunction,
    LocaleContext,
    StringValidator,
    MissingKeyHandler,
} from './types';

// Export string resources for direct access if needed
export { STRING_RESOURCES };

// Default export for the main i18n service
export default {
    t,
    getCurrentLocale,
    setLocale,
    getFallbackLocale,
    setFallbackLocale,
    configureI18n,
    getAvailableLocales,
    isLocaleSupported,
    getAllStringKeys,
    validateStringResources,
    getLocaleContext,
    initializeI18n,
};