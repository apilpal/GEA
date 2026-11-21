# Theme System Documentation

A comprehensive dark/light mode toggle system with modern styling and TypeScript integration for the enhanced architecture.

## 🚀 Features

### Core Features
- **Theme Management System**: Complete state management with Redux-like store
- **CSS Custom Properties Architecture**: Comprehensive theming with CSS variables
- **Theme Toggle Component**: Reusable component using BaseComponent
- **System Preference Detection**: Automatic detection of `prefers-color-scheme`
- **Theme Persistence**: Saves preferences across browser sessions
- **Smooth Transitions**: Animated theme switching with reduced motion support

### Advanced Features
- **High Contrast Mode**: Accessibility-focused theme variant
- **Reduced Motion Support**: Respects user motion preferences
- **Theme Preview**: Visual preview functionality
- **Keyboard Shortcuts**: Quick theme switching with hotkeys
- **PWA Integration**: Maintains functionality across themes
- **TypeScript Strict Mode**: Full type safety

## 📁 File Structure

```
frontend/src/
├── store/theme/
│   ├── types.ts           # Theme type definitions
│   ├── actions.ts         # Theme actions
│   ├── reducer.ts         # Theme reducer
│   ├── selectors.ts       # Theme selectors
│   ├── thunks.ts          # Async operations
│   └── index.ts           # Theme store module
├── components/theme/
│   ├── theme-toggle-component.ts    # Toggle component
│   ├── theme-store-provider.ts      # Store provider
│   └── index.ts                     # Component exports
├── services/
│   └── theme-service.ts             # Advanced theme service
└── scss/base/
    ├── _themes.scss        # CSS custom properties
    └── _theme-mixins.scss   # SCSS utilities
```

## 🎯 Quick Start

### 1. Basic Setup

Add the theme system to your main application:

```typescript
import { initializeThemeSystem } from './components/theme';

// Initialize theme system
await initializeThemeSystem();
```

### 2. Add Theme Provider

Include the theme store provider in your app root:

```html
<theme-store-provider>
    <!-- Your application content -->
</theme-store-provider>
```

### 3. Add Theme Toggle

Add the theme toggle component anywhere in your app:

```html
<theme-toggle size="md" variant="icon" show-label="false"></theme-toggle>
```

## 📖 Usage Guide

### Theme Toggle Component

#### Basic Usage
```html
<theme-toggle></theme-toggle>
```

#### With Options
```html
<theme-toggle
    size="lg"
    variant="text"
    show-label="true"
    aria-label="Switch theme">
</theme-toggle>
```

#### Properties
- `size`: `'sm' | 'md' | 'lg'` - Component size
- `variant`: `'icon' | 'text' | 'minimal'` - Visual style
- `show-label`: `boolean` - Show text label
- `aria-label`: `string` - Accessibility label

### Programmatic Control

#### Using Theme Service
```typescript
import { Theme } from './services/theme-service';

// Get current theme
const currentTheme = Theme.getCurrent();

// Set theme
await Theme.set('dark');

// Toggle theme
await Theme.toggle();

// Check preferences
const reducedMotion = Theme.isReducedMotion();
const highContrast = Theme.isHighContrast();

// Listen for changes
const unsubscribe = Theme.onChange((theme) => {
    console.log('Theme changed to:', theme);
});
```

#### Using Store Directly
```typescript
import { ThemeStore } from './store/theme';

// Get current state
const state = ThemeStore.selectors.selectThemeState(store.getState());

// Dispatch actions
store.dispatch(ThemeStore.actions.setThemeVariant('dark'));
store.dispatch(ThemeStore.thunks.toggleTheme());
```

## 🎨 Styling Guide

### CSS Custom Properties

The theme system uses CSS custom properties for all styling:

```css
:root {
    --color-primary: #6366f1;
    --color-background: #f5f7fa;
    --color-text: #1f2937;
    /* ... more variables */
}

[data-theme="dark"] {
    --color-primary: #818cf8;
    --color-background: #111827;
    --color-text: #f9fafb;
    /* ... dark theme overrides */
}
```

### SCSS Mixins

Use theme-aware mixins in your styles:

```scss
@import 'theme-mixins';

.my-component {
    @include theme-bg('--color-background');
    @include theme-color('--color-text');
    @include theme-transition('--transition-base');

    .button {
        @include button-primary;
    }

    .card {
        @include card;
    }
}
```

### Utility Classes

Use semantic color classes:

```html
<div class="bg-primary text-inverse">Primary Background</div>
<div class="bg-surface card">Surface Card</div>
<button class="focus-ring">Focusable Button</button>
```

## ⚡ Advanced Features

### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + T` - Toggle theme
- `Ctrl/Cmd + Shift + L` - Set light theme
- `Ctrl/Cmd + Shift + D` - Set dark theme

### System Integration

The theme system automatically:
- Detects system color scheme preference
- Respects reduced motion settings
- Supports high contrast mode
- Persists user preferences

### Theme Preview

Create visual previews of themes:

```typescript
import { Theme } from './services/theme-service';

const preview = Theme.createPreview('dark');
element.innerHTML = preview;
```

### Configuration Export/Import

Share theme configurations:

```typescript
// Export configuration
const configJson = Theme.exportConfig();

// Import configuration
await Theme.importConfig(configJson);
```

## 🔧 Configuration

### Theme Configuration Options

```typescript
interface ThemeConfig {
    variant: 'light' | 'dark' | 'auto';
    systemPreference: 'light' | 'dark';
    reducedMotion: boolean;
    highContrast: boolean;
    transitionDuration: number;
}
```

### Custom Theme Variables

Extend the theme system with custom variables:

```scss
:root {
    --color-custom: #your-color;
}

[data-theme="dark"] {
    --color-custom: #your-dark-color;
}
```

## 🔍 Testing

### Component Testing

```typescript
import { ThemeToggleComponent } from './components/theme';

describe('ThemeToggleComponent', () => {
    it('should toggle theme on click', async () => {
        const component = new ThemeToggleComponent();
        document.body.appendChild(component);

        // Simulate click
        component.click();
        // Assert theme changed
    });
});
```

### Integration Testing

```typescript
import { initializeThemeSystem } from './components/theme';

describe('Theme System Integration', () => {
    beforeEach(async () => {
        await initializeThemeSystem();
    });

    it('should persist theme preference', () => {
        // Test persistence logic
    });
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Theme not applying**: Ensure theme store provider is included in app root
2. **CSS variables not working**: Check that `_themes.scss` is imported
3. **Transitions not smooth**: Verify reduced motion preference

### Debug Mode

Enable debug logging:

```typescript
// In development
console.log('Current theme:', Theme.getCurrent());
console.log('Theme config:', Theme.getThemeConfig());
```

## 📱 PWA Integration

The theme system works seamlessly with PWAs:

1. **Service Worker**: Theme preferences persist across sessions
2. **Install Prompt**: Respects user's current theme
3. **Offline Support**: Theme state maintained offline

## 🌟 Best Practices

1. **Always include theme provider at app root**
2. **Use semantic color classes for consistency**
3. **Test with reduced motion enabled**
4. **Provide alternative focus indicators**
5. **Consider high contrast mode in designs**

## 📄 API Reference

### Theme Service Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getCurrent()` | Get current theme | `'light' \| 'dark'` |
| `set(theme)` | Set theme | `Promise<void>` |
| `toggle()` | Toggle theme | `Promise<void>` |
| `onChange(listener)` | Listen for changes | `() => void` |

### CSS Custom Properties

| Property | Description |
|----------|-------------|
| `--color-primary` | Primary brand color |
| `--color-background` | Main background |
| `--color-text` | Primary text color |
| `--shadow-md` | Medium shadow |
| `--transition-base` | Standard transition |

## 🤝 Contributing

1. Follow existing TypeScript patterns
2. Add tests for new features
3. Update documentation
4. Ensure accessibility compliance

## 📜 License

This theme system is part of the main application and follows the same license terms.