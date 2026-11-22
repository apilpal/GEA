# SCSS Style Guide

## Quick Reference for Developers

### File Structure
```
src/scss/
├── base/           # Variables, mixins, resets
├── components/     # Reusable components
├── layout/         # App layout, grids
├── pages/          # Page-specific styles
└── utilities/      # Helper classes
```

### Import Syntax
```scss
// Variables (global access)
@forward 'src/scss/base/_variables';

// Modules with namespaces
@use 'src/scss/base/_mixins' as mixins;
@use 'src/scss/components/_icons' as icons;
```

### Naming Conventions

#### Variables
```scss
// Colors: $primary-color, $secondary-color
// Spacing: $space-4, $space-8
// Typography: $font-size-lg, $font-size-base
// Breakpoints: $mobile, $tablet, $desktop
```

#### Selectors (BEM)
```scss
.block { }                    // Block
.block__element { }           // Element
.block--modifier { }          // Modifier
```

### Common Patterns

#### Component Structure
```scss
@use '../base/variables' as vars;
@use '../base/mixins' as mixins;

.my-component {
  @include mixins.card-shadow;
  padding: vars.$space-4;

  &__header { font-size: vars.$font-size-lg; }
  &__content { margin-top: vars.$space-3; }
}
```

#### Responsive Design
```scss
@include mixins.mobile { /* 320px+ */ }
@include mixins.tablet { /* 768px+ */ }
@include mixins.desktop { /* 1200px+ */ }
```

#### Accessibility
```scss
@include mixins.focus-visible;
@include mixins.touch-target;
@include mixins.sr-only;
```

### Build Commands
```bash
npm run build:scss     # Compile SCSS
npm run watch:scss     # Watch mode
npm run build          # Full build
```

### Before Committing
- [ ] Run `npm run build:scss` to check for errors
- [ ] Test responsive behavior
- [ ] Verify accessibility features work
- [ ] Check for naming conflicts

---

*For detailed documentation, see [SCSS Architecture Guide](SCSS_ARCHITECTURE.md) in the development documentation folder.*