import { BaseAction, ActionCreator, AsyncActionCreator, CreateActionType } from './types';

/**
 * Action type constants for common operations
 */
export const ActionTypes = {
    // Async operation types
    REQUEST: 'REQUEST',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    CANCEL: 'CANCEL',
    RESET: 'RESET',

    // CRUD operation types
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',

    // UI state types
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
    HIDE_NOTIFICATION: 'HIDE_NOTIFICATION',

    // Navigation types
    NAVIGATE: 'NAVIGATE',
    GO_BACK: 'GO_BACK',
    GO_FORWARD: 'GO_FORWARD',

    // Form types
    SET_FIELD_VALUE: 'SET_FIELD_VALUE',
    SET_FIELD_ERROR: 'SET_FIELD_ERROR',
    CLEAR_FORM: 'CLEAR_FORM',
    VALIDATE_FORM: 'VALIDATE_FORM',
} as const;

/**
 * Creates a type-safe action creator function
 */
export function createAction<TType extends string>(type: TType): ActionCreator<BaseAction<TType>> {
    return Object.assign(
        (payload?: any): BaseAction<TType> => ({
            type,
            payload
        }),
        {
            type,
            toString: () => type
        }
    );
}

/**
 * Creates a type-safe action creator with payload
 */
export function createActionWithPayload<TPayload>(
    type: string
): ActionCreator<BaseAction<string, TPayload>> {
    return Object.assign(
        (payload: TPayload): BaseAction<string, TPayload> => ({
            type,
            payload
        }),
        {
            type,
            toString: () => type
        }
    );
}

/**
 * Creates an async action creator with request/success/failure variants
 */
export function createAsyncAction<TType extends string, TPayload = undefined, TResponse = any, TError = any>(
    type: TType
) {
    const requestType = `${type}_${ActionTypes.REQUEST}` as TType;
    const successType = `${type}_${ActionTypes.SUCCESS}` as TType;
    const failureType = `${type}_${ActionTypes.FAILURE}` as TType;

    return {
        request: createActionWithPayload<TPayload>(requestType),
        success: createActionWithPayload<TResponse>(successType),
        failure: createActionWithPayload<TError>(failureType),
        cancel: createAction(`${type}_${ActionTypes.CANCEL}` as TType),
        reset: createAction(`${type}_${ActionTypes.RESET}` as TType)
    };
}

/**
 * Creates CRUD action creators for a resource
 */
export function createCRUDActions<TEntity, TCreateData = Omit<TEntity, 'id'>, TUpdateData = Partial<TEntity>>(
    resourceName: string
) {
    return {
        fetchAll: createAsyncAction<typeof resourceName, undefined, TEntity[]>(`${resourceName}/FETCH_ALL`),
        fetchById: createAsyncAction<typeof resourceName, string, TEntity>(`${resourceName}/FETCH_BY_ID`),
        create: createAsyncAction<typeof resourceName, TCreateData, TEntity>(`${resourceName}/CREATE`),
        update: createAsyncAction<typeof resourceName, { id: string; data: TUpdateData }, TEntity>(`${resourceName}/UPDATE`),
        delete: createAsyncAction<typeof resourceName, string, string>(`${resourceName}/DELETE`)
    };
}

/**
 * Type-safe action type builder
 */
export type ActionBuilder<T extends Record<string, ActionCreator<any>>> = {
    [K in keyof T]: T[K] extends ActionCreator<infer A> ? A : never;
};

/**
 * Utility type for extracting action types from action creators
 */
export type ActionsUnion<T extends Record<string, ActionCreator<any>>> = ReturnType<T[keyof T]>;

/**
 * Helper function to create action type constants with proper typing
 */
export function createActionTypes<T extends Record<string, string>>(types: T): T {
    return Object.freeze(types);
}

/**
 * Standard async action types for common operations
 */
export const AsyncActionTypes = createActionTypes({
    API_CALL_START: 'API_CALL_START',
    API_CALL_SUCCESS: 'API_CALL_SUCCESS',
    API_CALL_FAILURE: 'API_CALL_FAILURE',
    API_CALL_CANCEL: 'API_CALL_CANCEL'
} as const);

/**
 * Standard UI action types
 */
export const UIActionTypes = createActionTypes({
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    SHOW_TOAST: 'SHOW_TOAST',
    HIDE_TOAST: 'HIDE_TOAST',
    TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
    SET_THEME: 'SET_THEME'
} as const);

/**
 * Standard form action types
 */
export const FormActionTypes = createActionTypes({
    SET_VALUE: 'SET_VALUE',
    SET_ERROR: 'SET_ERROR',
    SET_TOUCHED: 'SET_TOUCHED',
    CLEAR_FIELD: 'CLEAR_FIELD',
    CLEAR_FORM: 'CLEAR_FORM',
    VALIDATE_FORM: 'VALIDATE_FORM',
    SET_SUBMITTING: 'SET_SUBMITTING'
} as const);

/**
 * Common action patterns with type safety
 */
export const CommonActions = {
    // Loading actions
    setLoading: createActionWithPayload<boolean>(UIActionTypes.SET_LOADING),
    setGlobalLoading: createActionWithPayload<boolean>('SET_GLOBAL_LOADING'),

    // Error actions
    setError: createActionWithPayload<{ message: string; code?: string }>(UIActionTypes.SET_ERROR),
    clearError: createAction(UIActionTypes.CLEAR_ERROR),

    // Toast/Notification actions
    showToast: createActionWithPayload<{
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        duration?: number;
    }>(UIActionTypes.SHOW_TOAST),
    hideToast: createAction(UIActionTypes.HIDE_TOAST),

    // Theme actions
    setTheme: createActionWithPayload<'light' | 'dark'>(UIActionTypes.SET_THEME),

    // Navigation actions
    navigate: createActionWithPayload<{ path: string; params?: Record<string, any> }>('NAVIGATE'),
    goBack: createAction('GO_BACK'),
    goForward: createAction('GO_FORWARD')
};

/**
 * Utility function to check if an action is of a specific type
 */
export function isActionType<T extends BaseAction>(
    action: BaseAction,
    actionType: T['type']
): action is T {
    return action.type === actionType;
}

/**
 * Utility function to check if an action is an async action
 */
export function isAsyncAction(action: BaseAction): boolean {
    return action.type.includes(`_${ActionTypes.REQUEST}`) ||
           action.type.includes(`_${ActionTypes.SUCCESS}`) ||
           action.type.includes(`_${ActionTypes.FAILURE}`);
}

/**
 * Utility function to extract the base action type from an async action
 */
export function getBaseActionType(actionType: string): string {
    return actionType.replace(new RegExp(`_${ActionTypes.REQUEST}$`), '')
                     .replace(new RegExp(`_${ActionTypes.SUCCESS}$`), '')
                     .replace(new RegExp(`_${ActionTypes.FAILURE}$`), '');
}

/**
 * Type guard to check if action has payload
 */
export function hasPayload<T extends BaseAction>(
    action: T
): action is T extends { payload: any } ? T : never {
    return 'payload' in action && action.payload !== undefined;
}

/**
 * Type guard to check if action has meta
 */
export function hasMeta<T extends BaseAction>(
    action: T
): action is T extends { meta: any } ? T : never {
    return 'meta' in action && action.meta !== undefined;
}

/**
 * Type guard to check if action is an error action
 */
export function isErrorAction<T extends BaseAction>(
    action: T
): action is T extends { error: true } ? T : never {
    return action.error === true;
}