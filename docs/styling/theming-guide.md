# 🎨 SCSS Theming Guide

Comprehensive guide to the SCSS architecture, theming system, and styling standards for the Student Profiles PWA.

## 📋 Overview

This guide consolidates all SCSS-related documentation including:
- **Architecture**: System design and organization
- **Theming**: Theme system and customization
- **Components**: Reusable component styling
- **Standards**: Coding conventions and best practices
- **Performance**: Optimization techniques

---

## 🏗️ Architecture Overview

### **File Structure**
```
src/scss/
├── base/                    # Foundation styles
│   ├── _variables.scss     # Design tokens & variables
│   ├── _mixins.scss        # Reusable mixins
│   ├── _base.scss          # Base styles & resets
│   ├── _themes.scss        # Theme definitions
│   └── _theme-mixins.scss  # Theme utility mixins
├── components/             # Component-specific styles
│   ├── _icons.scss         # Icon system
│   ├── _buttons.scss       # Button components
│   └── _forms.scss         # Form components
├── layout/                 # Layout & grid systems
│   ├── _app.scss           # Main application layout
│   └── _grid.scss          # Responsive grid system
└── utilities/              # Utility classes
    └── _helpers.scss       # Helper classes
```

### **Import Strategy**
```scss
// 1. Variables (global access)
@forward 'base/variables';

// 2. Base styles (foundational)
@import 'base/base';

// 3. Theme system
@import 'base/themes';

// 4. Component styles
@import 'components/buttons';
@import 'components/forms';

// 5. Layout styles
@import 'layout/app';
```

---

## 🎯 Design Tokens

### **Color System**
```scss
// Primary colors
$primary-50: #f0f9ff;
$primary-500: #3b82f6;
$primary-900: #1e3a8a;

// Semantic colors
$success: #10b981;
$warning: #f59e0b;
$error: #ef4444;
$info: #3b82f6;

// Neutral colors
$gray-50: #f9fafb;
$gray-900: #111827;
```

### **Typography Scale**
```scss
$font-size-xs: 0.75rem;    // 12px
$font-size-sm: 0.875rem;   // 14px
$font-size-base: 1rem;     // 16px
$font-size-lg: 1.125rem;   // 18px
$font-size-xl: 1.25rem;    // 20px
$font-size-2xl: 1.5rem;    // 24px
```

### **Spacing System**
```scss
$space-1: 0.25rem;   // 4px
$space-2: 0.5rem;    // 8px
$space-3: 0.75rem;   // 12px
$space-4: 1rem;      // 16px
$space-6: 1.5rem;    // 24px
$space-8: 2rem;      // 32px
```

### **Breakpoint System**
```scss
$mobile: 320px;
$tablet: 768px;
$desktop: 1200px;
$wide: 1440px;
```

---

## 🎨 Theme System

### **Theme Variables**
```scss
:root {
  // Light theme (default)
  --color-primary: #{$primary-500};
  --color-background: #{$gray-50};
  --color-text: #{$gray-900};
  --shadow-sm: #{0 1px 2px 0 rgba(0, 0, 0, 0.05)};
  --shadow-md: #{0 4px 6px -1px rgba(0, 0, 0, 0.1)};
}

[data-theme="dark"] {
  --color-primary: #{$primary-400};
  --color-background: #{$gray-900};
  --color-text: #{$gray-50};
  --shadow-sm: #{0 1px 2px 0 rgba(0, 0, 0, 0.3)};
  --shadow-md: #{0 4px 6px -1px rgba(0, 0, 0, 0.4)};
}
```

### **Theme Implementation**
```scss
@use 'base/variables' as vars;
@use 'base/theme-mixins' as themes;

.my-component {
  @include themes.light-theme {
    background: vars.$gray-50;
    color: vars.$gray-900;
  }

  @include themes.dark-theme {
    background: vars.$gray-900;
    color: vars.$gray-50;
  }
}
```

---

## 🧩 Component Styling

### **BEM Methodology**
```scss
// Block
.card { }

// Element
.card__header { }
.card__body { }
.card__footer { }

// Modifier
.card--featured { }
.card--compact { }
.card__header--large { }
```

### **Component Structure**
```scss
@use '../base/variables' as vars;
@use '../base/mixins' as mixins;

.card {
  @include mixins.card-shadow;
  background: vars.$white;
  border-radius: vars.$radius-md;
  padding: vars.$space-4;

  &__header {
    font-size: vars.$font-size-lg;
    font-weight: 600;
    margin-bottom: vars.$space-3;
  }

  &__body {
    color: vars.$gray-700;
    line-height: 1.6;
  }

  &__footer {
    border-top: 1px solid vars.$gray-200;
    margin-top: vars.$space-4;
    padding-top: vars.$space-3;
  }

  // Modifiers
  &--featured {
    border: 2px solid vars.$primary-500;
  }

  &--compact {
    padding: vars.$space-3;
  }
}
```

---

## 📱 Responsive Design

### **Breakpoint Mixins**
```scss
@mixin mobile {
  @media (min-width: 320px) { @content; }
}

@mixin tablet {
  @media (min-width: 768px) { @content; }
}

@mixin desktop {
  @media (min-width: 1200px) { @content; }
}

@mixin wide {
  @media (min-width: 1440px) { @content; }
}
```

### **Responsive Component**
```scss
.responsive-component {
  // Mobile first
  display: block;

  @include mixins.tablet {
    display: flex;
    gap: vars.$space-4;
  }

  @include mixins.desktop {
    gap: vars.$space-6;
  }

  &__sidebar {
    @include mixins.tablet {
      flex: 0 0 250px;
    }

    @include mixins.desktop {
      flex: 0 0 300px;
    }
  }

  &__content {
    @include mixins.tablet {
      flex: 1;
    }
  }
}
```

---

## ♿ Accessibility Features

### **Focus Management**
```scss
@mixin focus-visible {
  outline: 2px solid vars.$primary-500;
  outline-offset: 2px;
}

@mixin touch-target {
  min-height: 44px;
  min-width: 44px;
}

@mixin sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### **Accessible Components**
```scss
.accessible-button {
  @include mixins.touch-target;
  @include mixins.focus-visible;

  &:focus-visible {
    @include mixins.focus-visible;
  }
}

.sr-only-label {
  @include mixins.sr-only;
}
```

---

## 🚀 Performance Optimization

### **Efficient SCSS**
```scss
// ✅ Good: Use variables and mixins
@use '../base/variables' as vars;
@use '../base/mixins' as mixins;

.my-component {
  @include mixins.card-shadow;
  padding: vars.$space-4;
  margin: vars.$space-2;
}

// ❌ Avoid: Inline values
.my-component {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin: 0.5rem;
}
```

### **Build Optimization**
```bash
# Production build
npm run build:scss

# Watch mode for development
npm run watch:scss

# Lint SCSS
npm run lint:scss
```

---

## 🛠️ Development Workflow

### **Adding New Components**
1. **Create** component SCSS file in `src/scss/components/`
2. **Import** in main SCSS file
3. **Document** component styles and variants
4. **Test** responsive behavior and accessibility

### **Modifying Themes**
1. **Update** design tokens in `_variables.scss`
2. **Test** theme switching functionality
3. **Verify** all components work with new tokens
4. **Update** documentation

### **Best Practices**
- Use semantic color names over hex values
- Leverage mixins for common patterns
- Follow BEM naming conventions
- Test on multiple devices and screen sizes
- Ensure WCAG accessibility compliance

---

## 📚 Related Documentation

- **[Frontend Setup](./)** - Frontend configuration
- **[Component Registry](../architecture/component-registry.md)** - Component documentation *(Consolidated)*
- **[SCSS Architecture](scss-architecture.md)** - Detailed architecture guide
- **[Theme Integration Example](../../frontend/src/ts/examples/theme-integration-example.ts)** - Code examples

---

## 🎯 Quick Reference

### **Common Mixins**
- `@include card-shadow;` - Standard card shadow
- `@include focus-visible;` - Accessible focus indicator
- `@include mobile/tablet/desktop { ... }` - Responsive breakpoints
- `@include theme-light/dark { ... }` - Theme-specific styles

### **Color Usage**
- **Primary**: Brand colors and important actions
- **Semantic**: Success, warning, error, info states
- **Neutral**: Text, backgrounds, borders
- **Interactive**: Links, buttons, form elements

### **Typography**
- **Headings**: `$font-size-2xl` to `$font-size-base`
- **Body**: `$font-size-base` with `$font-size-sm` for secondary text
- **Small**: `$font-size-xs` for metadata and captions

---

*This theming guide is continuously updated to reflect the current SCSS architecture and best practices. For the latest information, check the source files in `src/scss/`.*

**Last Updated:** October 2025