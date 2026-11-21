import { Middleware, BaseAction, Dispatch } from '@/ts/types/store';
export type ThunkAction<TState = any, TExtra = any, TReturn = any> = (dispatch: Dispatch<BaseAction>, getState: () => TState, extra: TExtra) => TReturn;
export type ThunkDispatch<TState = any, TExtra = any, TAction extends BaseAction = BaseAction> = (action: TAction | ThunkAction<TState, TExtra>) => any;
export interface ThunkConfig<TState = any, TExtra = any> {
    extraArgument?: TExtra;
}
export declare function createThunk<TState = any, TExtra = any>(config?: ThunkConfig<TState, TExtra>): Middleware<TState, BaseAction, TExtra>;
export declare const thunk: Middleware<any, BaseAction<string, any>, any>;
export declare function createThunkAction<TState = any, TExtra = any, TReturn = any>(thunkFn: ThunkAction<TState, TExtra, TReturn>): ThunkAction<TState, TExtra, TReturn>;
export declare const ThunkUtils: {
    createAsyncThunk: <TArgs extends any[], TResponse, TState = any>(asyncFn: (...args: TArgs) => Promise<TResponse>, actions: {
        request: (...args: TArgs) => BaseAction;
        success: (response: TResponse) => BaseAction;
        failure: (error: Error) => BaseAction;
    }) => (...args: TArgs) => ThunkAction<TState>;
    createApiThunk: <TArgs extends any[], TResponse, TState = any>(apiCall: (...args: TArgs) => Promise<TResponse>, actionCreators: {
        request: (...args: TArgs) => BaseAction;
        success: (data: TResponse) => BaseAction;
        failure: (error: Error) => BaseAction;
    }) => (...args: TArgs) => ThunkAction<any, any, any>;
    delay: <TAction extends BaseAction>(action: TAction, delayMs: number) => ThunkAction;
    conditional: <TState, TAction extends BaseAction>(condition: (state: TState) => boolean, action: TAction, fallbackAction?: BaseAction) => ThunkAction<TState>;
    retry: <TArgs extends any[], TResponse, TState = any>(asyncFn: (...args: TArgs) => Promise<TResponse>, maxRetries?: number, delayMs?: number) => (...args: TArgs) => ThunkAction<TState, any, Promise<TResponse>>;
};
export declare const CommonThunks: {
    fetchData: <TResponse, TState = any>(apiCall: () => Promise<TResponse>, actions: {
        request: () => BaseAction;
        success: (data: TResponse) => BaseAction;
        failure: (error: Error) => BaseAction;
    }) => ThunkAction<TState>;
    submitForm: <TFormData, TResponse, TState = any>(formData: TFormData, submitFn: (data: TFormData) => Promise<TResponse>, actions: {
        request: (data: TFormData) => BaseAction;
        success: (response: TResponse) => BaseAction;
        failure: (error: Error) => BaseAction;
    }) => ThunkAction<TState>;
    debounce: <TAction extends BaseAction>(action: TAction, delayMs: number) => ThunkAction;
};
//# sourceMappingURL=thunk.d.ts.map