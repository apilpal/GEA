import { createStore, combineReducers } from '@/ts/store/core/store';
import { createAction, createAsyncAction } from '@/ts/store/core/actions';
import { createReducer } from '@/ts/store/core/reducers';
import { createSelector } from '@/ts/store/core/selectors-simple';

/**
 * Todo item interface
 */
export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Todo state interface
 */
export interface TodoState {
    items: Record<string, TodoItem>;
    ids: string[];
    loading: boolean;
    error: string | null;
    filter: 'all' | 'active' | 'completed';
}

/**
 * Initial todo state
 */
const initialTodoState: TodoState = {
    items: {},
    ids: [],
    loading: false,
    error: null,
    filter: 'all'
};

/**
 * Todo action types
 */
export const TodoActionTypes = {
    ADD_TODO: 'TODO_ADD',
    TOGGLE_TODO: 'TODO_TOGGLE',
    DELETE_TODO: 'TODO_DELETE',
    UPDATE_TODO: 'TODO_UPDATE',
    SET_FILTER: 'TODO_SET_FILTER',
    CLEAR_COMPLETED: 'TODO_CLEAR_COMPLETED',
    FETCH_TODOS: 'TODO_FETCH'
} as const;

/**
 * Todo actions
 */
export const TodoActions = {
    addTodo: (text: string) => createAction(TodoActionTypes.ADD_TODO)({ id: Date.now().toString(), text, completed: false, createdAt: new Date(), updatedAt: new Date() }),
    toggleTodo: (id: string) => createAction(TodoActionTypes.TOGGLE_TODO)(id),
    deleteTodo: (id: string) => createAction(TodoActionTypes.DELETE_TODO)(id),
    updateTodo: (id: string, updates: Partial<TodoItem>) => createAction(TodoActionTypes.UPDATE_TODO)({ id, updates }),
    setFilter: (filter: TodoState['filter']) => createAction(TodoActionTypes.SET_FILTER)(filter),
    clearCompleted: createAction(TodoActionTypes.CLEAR_COMPLETED),
    fetchTodos: createAsyncAction('TODO_FETCH')
};

/**
 * Todo reducer
 */
const todoReducer = createReducer(initialTodoState, {
    [TodoActionTypes.ADD_TODO]: (state, action) => {
        const todo = (action as any).payload as TodoItem;
        return {
            ...state,
            items: { ...state.items, [todo.id]: todo },
            ids: [...state.ids, todo.id],
            error: null
        };
    },
    [TodoActionTypes.TOGGLE_TODO]: (state, action) => {
        const id = (action as any).payload as string;
        const todo = state.items[id];
        if (!todo) return state;

        return {
            ...state,
            items: {
                ...state.items,
                [id]: {
                    ...todo,
                    completed: !todo.completed,
                    updatedAt: new Date()
                }
            },
            error: null
        };
    },
    [TodoActionTypes.DELETE_TODO]: (state, action) => {
        const id = (action as any).payload as string;
        const { [id]: deleted, ...remainingItems } = state.items;

        return {
            ...state,
            items: remainingItems,
            ids: state.ids.filter(todoId => todoId !== id),
            error: null
        };
    },
    [TodoActionTypes.UPDATE_TODO]: (state, action) => {
        const { id, updates } = (action as any).payload;
        const todo = state.items[id];
        if (!todo) return state;

        return {
            ...state,
            items: {
                ...state.items,
                [id]: {
                    ...todo,
                    ...updates,
                    updatedAt: new Date()
                }
            },
            error: null
        };
    },
    [TodoActionTypes.SET_FILTER]: (state, action) => ({
        ...state,
        filter: (action as any).payload as TodoState['filter'],
        error: null
    }),
    [TodoActionTypes.CLEAR_COMPLETED]: (state) => {
        const activeIds = state.ids.filter(id => !state.items[id].completed);
        const activeItems: Record<string, TodoItem> = {};

        activeIds.forEach(id => {
            activeItems[id] = state.items[id];
        });

        return {
            ...state,
            items: activeItems,
            ids: activeIds,
            error: null
        };
    },
    'TODO_FETCH_REQUEST': (state) => ({
        ...state,
        loading: true,
        error: null
    }),
    'TODO_FETCH_SUCCESS': (state, action) => {
        const todos = (action as any).payload as TodoItem[];
        const items: Record<string, TodoItem> = {};
        const ids: string[] = [];

        todos.forEach(todo => {
            items[todo.id] = todo;
            ids.push(todo.id);
        });

        return {
            ...state,
            loading: false,
            items,
            ids,
            error: null
        };
    },
    'TODO_FETCH_FAILURE': (state, action) => ({
        ...state,
        loading: false,
        error: (action as any).payload as string
    })
});

/**
 * Todo selectors
 */
export const TodoSelectors = {
    /**
     * Selects all todo items as array
     */
    selectAllTodos: (state: { todos: TodoState }): TodoItem[] =>
        state.todos.ids.map(id => state.todos.items[id]).filter(Boolean),

    /**
     * Selects active (incomplete) todos
     */
    selectActiveTodos: (state: { todos: TodoState }): TodoItem[] =>
        TodoSelectors.selectAllTodos(state).filter(todo => !todo.completed),

    /**
     * Selects completed todos
     */
    selectCompletedTodos: (state: { todos: TodoState }): TodoItem[] =>
        TodoSelectors.selectAllTodos(state).filter(todo => todo.completed),

    /**
     * Selects todos based on current filter
     */
    selectFilteredTodos: (state: { todos: TodoState }): TodoItem[] => {
        const allTodos = TodoSelectors.selectAllTodos(state);
        const filter = state.todos.filter;

        switch (filter) {
            case 'active':
                return TodoSelectors.selectActiveTodos(state);
            case 'completed':
                return TodoSelectors.selectCompletedTodos(state);
            default:
                return allTodos;
        }
    },

    /**
     * Selects todo statistics
     */
    selectTodoStats: (state: { todos: TodoState }): {
        total: number;
        active: number;
        completed: number;
        completionRate: number;
    } => {
        const total = state.todos.ids.length;
        const completed = TodoSelectors.selectCompletedTodos(state).length;
        const active = total - completed;

        return {
            total,
            active,
            completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    },

    /**
     * Selects loading state
     */
    selectLoading: (state: { todos: TodoState }): boolean => state.todos.loading,

    /**
     * Selects error state
     */
    selectError: (state: { todos: TodoState }): string | null => state.todos.error,

    /**
     * Selects current filter
     */
    selectFilter: (state: { todos: TodoState }): TodoState['filter'] => state.todos.filter,

    /**
     * Selects whether all todos are completed
     */
    selectAllCompleted: (state: { todos: TodoState }): boolean => {
        const todos = TodoSelectors.selectAllTodos(state);
        return todos.length > 0 && todos.every(todo => todo.completed);
    },

    /**
     * Selects whether there are any completed todos
     */
    selectHasCompleted: (state: { todos: TodoState }): boolean =>
        TodoSelectors.selectCompletedTodos(state).length > 0
};

/**
 * Todo thunks for async operations
 */
export const TodoThunks = {
    /**
     * Fetches todos from an API
     */
    fetchTodos: () => async (dispatch: any) => {
        dispatch(TodoActions.fetchTodos.request());

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockTodos: TodoItem[] = [
                { id: '1', text: 'Learn TypeScript', completed: true, createdAt: new Date(), updatedAt: new Date() },
                { id: '2', text: 'Build Redux store', completed: false, createdAt: new Date(), updatedAt: new Date() },
                { id: '3', text: 'Create components', completed: false, createdAt: new Date(), updatedAt: new Date() }
            ];

            dispatch(TodoActions.fetchTodos.success(mockTodos));
        } catch (error) {
            dispatch(TodoActions.fetchTodos.failure(error as Error));
        }
    },

    /**
     * Adds a todo with optimistic updates
     */
    addTodoOptimistic: (text: string) => async (dispatch: any) => {
        const todo = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Optimistically add todo
        dispatch(TodoActions.addTodo(todo.text));

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            // Success - todo is already added
        } catch (error) {
            // Revert optimistic update
            dispatch(TodoActions.deleteTodo(todo.id));
            throw error;
        }
    }
};

/**
 * Creates a todo store instance
 */
export function createTodoStore() {
    return createStore(todoReducer, initialTodoState, {
        devTools: true,
        middleware: [
            // Add logger in development
            process.env.NODE_ENV === 'development' ?
                require('../middleware/logger').logger : undefined
        ].filter(Boolean)
    });
}

/**
 * Complete todo store with actions, reducers, and selectors
 */
export const TodoStore = {
    actions: TodoActions,
    thunks: TodoThunks,
    selectors: TodoSelectors,
    reducer: todoReducer,
    createStore: createTodoStore
};