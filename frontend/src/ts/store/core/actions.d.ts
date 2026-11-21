import { BaseAction, ActionCreator } from './types';
export declare const ActionTypes: {
    readonly REQUEST: "REQUEST";
    readonly SUCCESS: "SUCCESS";
    readonly FAILURE: "FAILURE";
    readonly CANCEL: "CANCEL";
    readonly RESET: "RESET";
    readonly CREATE: "CREATE";
    readonly READ: "READ";
    readonly UPDATE: "UPDATE";
    readonly DELETE: "DELETE";
    readonly SET_LOADING: "SET_LOADING";
    readonly SET_ERROR: "SET_ERROR";
    readonly CLEAR_ERROR: "CLEAR_ERROR";
    readonly SHOW_NOTIFICATION: "SHOW_NOTIFICATION";
    readonly HIDE_NOTIFICATION: "HIDE_NOTIFICATION";
    readonly NAVIGATE: "NAVIGATE";
    readonly GO_BACK: "GO_BACK";
    readonly GO_FORWARD: "GO_FORWARD";
    readonly SET_FIELD_VALUE: "SET_FIELD_VALUE";
    readonly SET_FIELD_ERROR: "SET_FIELD_ERROR";
    readonly CLEAR_FORM: "CLEAR_FORM";
    readonly VALIDATE_FORM: "VALIDATE_FORM";
};
export declare function createAction<TType extends string>(type: TType): ActionCreator<BaseAction<TType>>;
export declare function createActionWithPayload<TPayload>(type: string): ActionCreator<BaseAction<string, TPayload>>;
export declare function createAsyncAction<TType extends string, TPayload = undefined, TResponse = any, TError = any>(type: TType): {
    request: ActionCreator<BaseAction<string, TPayload>>;
    success: ActionCreator<BaseAction<string, TResponse>>;
    failure: ActionCreator<BaseAction<string, TError>>;
    cancel: ActionCreator<BaseAction<TType, any>>;
    reset: ActionCreator<BaseAction<TType, any>>;
};
export declare function createCRUDActions<TEntity, TCreateData = Omit<TEntity, 'id'>, TUpdateData = Partial<TEntity>>(resourceName: string): {
    fetchAll: {
        request: ActionCreator<BaseAction<string, undefined>>;
        success: ActionCreator<BaseAction<string, TEntity[]>>;
        failure: ActionCreator<BaseAction<string, any>>;
        cancel: ActionCreator<BaseAction<string, any>>;
        reset: ActionCreator<BaseAction<string, any>>;
    };
    fetchById: {
        request: ActionCreator<BaseAction<string, string>>;
        success: ActionCreator<BaseAction<string, TEntity>>;
        failure: ActionCreator<BaseAction<string, any>>;
        cancel: ActionCreator<BaseAction<string, any>>;
        reset: ActionCreator<BaseAction<string, any>>;
    };
    create: {
        request: ActionCreator<BaseAction<string, TCreateData>>;
        success: ActionCreator<BaseAction<string, TEntity>>;
        failure: ActionCreator<BaseAction<string, any>>;
        cancel: ActionCreator<BaseAction<string, any>>;
        reset: ActionCreator<BaseAction<string, any>>;
    };
    update: {
        request: ActionCreator<BaseAction<string, {
            id: string;
            data: TUpdateData;
        }>>;
        success: ActionCreator<BaseAction<string, TEntity>>;
        failure: ActionCreator<BaseAction<string, any>>;
        cancel: ActionCreator<BaseAction<string, any>>;
        reset: ActionCreator<BaseAction<string, any>>;
    };
    delete: {
        request: ActionCreator<BaseAction<string, string>>;
        success: ActionCreator<BaseAction<string, string>>;
        failure: ActionCreator<BaseAction<string, any>>;
        cancel: ActionCreator<BaseAction<string, any>>;
        reset: ActionCreator<BaseAction<string, any>>;
    };
};
export type ActionBuilder<T extends Record<string, ActionCreator<any>>> = {
    [K in keyof T]: T[K] extends ActionCreator<infer A> ? A : never;
};
export type ActionsUnion<T extends Record<string, ActionCreator<any>>> = ReturnType<T[keyof T]>;
export declare function createActionTypes<T extends Record<string, string>>(types: T): T;
export declare const AsyncActionTypes: {
    readonly API_CALL_START: "API_CALL_START";
    readonly API_CALL_SUCCESS: "API_CALL_SUCCESS";
    readonly API_CALL_FAILURE: "API_CALL_FAILURE";
    readonly API_CALL_CANCEL: "API_CALL_CANCEL";
};
export declare const UIActionTypes: {
    readonly SET_LOADING: "SET_LOADING";
    readonly SET_ERROR: "SET_ERROR";
    readonly CLEAR_ERROR: "CLEAR_ERROR";
    readonly SHOW_TOAST: "SHOW_TOAST";
    readonly HIDE_TOAST: "HIDE_TOAST";
    readonly TOGGLE_SIDEBAR: "TOGGLE_SIDEBAR";
    readonly SET_THEME: "SET_THEME";
};
export declare const FormActionTypes: {
    readonly SET_VALUE: "SET_VALUE";
    readonly SET_ERROR: "SET_ERROR";
    readonly SET_TOUCHED: "SET_TOUCHED";
    readonly CLEAR_FIELD: "CLEAR_FIELD";
    readonly CLEAR_FORM: "CLEAR_FORM";
    readonly VALIDATE_FORM: "VALIDATE_FORM";
    readonly SET_SUBMITTING: "SET_SUBMITTING";
};
export declare const CommonActions: {
    setLoading: ActionCreator<BaseAction<string, boolean>>;
    setGlobalLoading: ActionCreator<BaseAction<string, boolean>>;
    setError: ActionCreator<BaseAction<string, {
        message: string;
        code?: string;
    }>>;
    clearError: ActionCreator<BaseAction<"CLEAR_ERROR", any>>;
    showToast: ActionCreator<BaseAction<string, {
        message: string;
        type: "success" | "error" | "warning" | "info";
        duration?: number;
    }>>;
    hideToast: ActionCreator<BaseAction<"HIDE_TOAST", any>>;
    setTheme: ActionCreator<BaseAction<string, "light" | "dark">>;
    navigate: ActionCreator<BaseAction<string, {
        path: string;
        params?: Record<string, any>;
    }>>;
    goBack: ActionCreator<BaseAction<"GO_BACK", any>>;
    goForward: ActionCreator<BaseAction<"GO_FORWARD", any>>;
};
export declare function isActionType<T extends BaseAction>(action: BaseAction, actionType: T['type']): action is T;
export declare function isAsyncAction(action: BaseAction): boolean;
export declare function getBaseActionType(actionType: string): string;
export declare function hasPayload<T extends BaseAction>(action: T): action is T extends {
    payload: any;
} ? T : never;
export declare function hasMeta<T extends BaseAction>(action: T): action is T extends {
    meta: any;
} ? T : never;
export declare function isErrorAction<T extends BaseAction>(action: T): action is T extends {
    error: true;
} ? T : never;
//# sourceMappingURL=actions.d.ts.map