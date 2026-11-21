import { Middleware, BaseAction } from '@/ts/types/store';
export interface LoggerConfig {
    logActions?: boolean;
    logState?: boolean;
    logErrors?: boolean;
    collapsed?: boolean;
    logger?: {
        log: (message?: any, ...optionalParams: any[]) => void;
        group: (groupTitle?: string) => void;
        groupEnd: () => void;
        error: (message?: any, ...optionalParams: any[]) => void;
    };
    ignoreActions?: string[];
    actionTransformer?: (action: BaseAction) => any;
    stateTransformer?: (state: any) => any;
}
export declare function createLogger<TState = any>(config?: LoggerConfig): Middleware<TState>;
export declare const logger: Middleware<any>;
export declare const devLogger: Middleware<any>;
export declare const prodLogger: Middleware<any>;
//# sourceMappingURL=logger.d.ts.map