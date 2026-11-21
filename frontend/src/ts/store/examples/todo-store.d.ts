export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface TodoState {
    items: Record<string, TodoItem>;
    ids: string[];
    loading: boolean;
    error: string | null;
    filter: 'all' | 'active' | 'completed';
}
export declare const TodoActionTypes: {
    readonly ADD_TODO: "TODO_ADD";
    readonly TOGGLE_TODO: "TODO_TOGGLE";
    readonly DELETE_TODO: "TODO_DELETE";
    readonly UPDATE_TODO: "TODO_UPDATE";
    readonly SET_FILTER: "TODO_SET_FILTER";
    readonly CLEAR_COMPLETED: "TODO_CLEAR_COMPLETED";
    readonly FETCH_TODOS: "TODO_FETCH";
};
export declare const TodoActions: {
    addTodo: (text: string) => import("../core").BaseAction<"TODO_ADD", any>;
    toggleTodo: (id: string) => import("../core").BaseAction<"TODO_TOGGLE", any>;
    deleteTodo: (id: string) => import("../core").BaseAction<"TODO_DELETE", any>;
    updateTodo: (id: string, updates: Partial<TodoItem>) => import("../core").BaseAction<"TODO_UPDATE", any>;
    setFilter: (filter: TodoState["filter"]) => import("../core").BaseAction<"TODO_SET_FILTER", any>;
    clearCompleted: import("../core").ActionCreator<import("../core").BaseAction<"TODO_CLEAR_COMPLETED", any>>;
    fetchTodos: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"TODO_FETCH", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"TODO_FETCH", any>>;
    };
};
export declare const TodoSelectors: {
    selectAllTodos: (state: {
        todos: TodoState;
    }) => TodoItem[];
    selectActiveTodos: (state: {
        todos: TodoState;
    }) => TodoItem[];
    selectCompletedTodos: (state: {
        todos: TodoState;
    }) => TodoItem[];
    selectFilteredTodos: (state: {
        todos: TodoState;
    }) => TodoItem[];
    selectTodoStats: (state: {
        todos: TodoState;
    }) => {
        total: number;
        active: number;
        completed: number;
        completionRate: number;
    };
    selectLoading: (state: {
        todos: TodoState;
    }) => boolean;
    selectError: (state: {
        todos: TodoState;
    }) => string | null;
    selectFilter: (state: {
        todos: TodoState;
    }) => TodoState["filter"];
    selectAllCompleted: (state: {
        todos: TodoState;
    }) => boolean;
    selectHasCompleted: (state: {
        todos: TodoState;
    }) => boolean;
};
export declare const TodoThunks: {
    fetchTodos: () => (dispatch: any) => Promise<void>;
    addTodoOptimistic: (text: string) => (dispatch: any) => Promise<void>;
};
export declare function createTodoStore(): import("@/ts/store/core/store").ReduxStore<TodoState, import("../core").BaseAction<string, any>>;
export declare const TodoStore: {
    actions: {
        addTodo: (text: string) => import("../core").BaseAction<"TODO_ADD", any>;
        toggleTodo: (id: string) => import("../core").BaseAction<"TODO_TOGGLE", any>;
        deleteTodo: (id: string) => import("../core").BaseAction<"TODO_DELETE", any>;
        updateTodo: (id: string, updates: Partial<TodoItem>) => import("../core").BaseAction<"TODO_UPDATE", any>;
        setFilter: (filter: TodoState["filter"]) => import("../core").BaseAction<"TODO_SET_FILTER", any>;
        clearCompleted: import("../core").ActionCreator<import("../core").BaseAction<"TODO_CLEAR_COMPLETED", any>>;
        fetchTodos: {
            request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
            success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
            failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
            cancel: import("../core").ActionCreator<import("../core").BaseAction<"TODO_FETCH", any>>;
            reset: import("../core").ActionCreator<import("../core").BaseAction<"TODO_FETCH", any>>;
        };
    };
    thunks: {
        fetchTodos: () => (dispatch: any) => Promise<void>;
        addTodoOptimistic: (text: string) => (dispatch: any) => Promise<void>;
    };
    selectors: {
        selectAllTodos: (state: {
            todos: TodoState;
        }) => TodoItem[];
        selectActiveTodos: (state: {
            todos: TodoState;
        }) => TodoItem[];
        selectCompletedTodos: (state: {
            todos: TodoState;
        }) => TodoItem[];
        selectFilteredTodos: (state: {
            todos: TodoState;
        }) => TodoItem[];
        selectTodoStats: (state: {
            todos: TodoState;
        }) => {
            total: number;
            active: number;
            completed: number;
            completionRate: number;
        };
        selectLoading: (state: {
            todos: TodoState;
        }) => boolean;
        selectError: (state: {
            todos: TodoState;
        }) => string | null;
        selectFilter: (state: {
            todos: TodoState;
        }) => TodoState["filter"];
        selectAllCompleted: (state: {
            todos: TodoState;
        }) => boolean;
        selectHasCompleted: (state: {
            todos: TodoState;
        }) => boolean;
    };
    reducer: import("../core").Reducer<TodoState, import("../core").BaseAction<string, any>>;
    createStore: typeof createTodoStore;
};
//# sourceMappingURL=todo-store.d.ts.map