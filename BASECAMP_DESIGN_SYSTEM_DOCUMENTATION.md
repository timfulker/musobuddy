# Basecamp-Inspired Design System Documentation

## Overview
This document details the complete Basecamp-inspired design system implemented in MusoBuddy, including all styling, colors, fonts, and component modifications.

## Core Design Principles
- **Clean, confident styling** inspired by Basecamp's approach
- **High contrast** for readability and professionalism
- **Minimal but impactful** use of signature yellow accent color
- **Modern typography** with Inter font family
- **Consistent spacing** and rounded corners for approachability

## Typography
### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Font Weights Used
- Regular (400) for body text
- Medium (500) for labels and secondary headings
- Semibold (600) for primary headings and emphasis
- Bold (700) for major headers

## Color System

### Primary Brand Color
- **Basecamp Yellow**: `#ffd500` (hsl(52, 100%, 50%))
- Used sparingly for accents, highlights, and call-to-action elements

### Text Colors
- **Primary Text (Light)**: `#2d2d2d` (slate-700)
- **Primary Text (Dark)**: `#e2e8f0` (slate-200)
- **Secondary Text (Light)**: `#64748b` (slate-500)
- **Secondary Text (Dark)**: `#94a3b8` (slate-400)

### Background Colors
- **Light Mode Background**: `#ffffff` (white)
- **Dark Mode Background**: `#0f172a` (slate-900)
- **Card Background (Light)**: `#ffffff` with subtle shadows
- **Card Background (Dark)**: `#1e293b` (slate-800)

### CSS Variables (Basecamp Theme)
```css
.basecamp-theme {
  /* Light mode */
  --background: #ffffff;
  --foreground: #2d2d2d;
  --muted: #f8fafc;
  --muted-foreground: #64748b;
  --primary: #ffd500;
  --primary-foreground: #2d2d2d;
  --accent: #ffd500;
  --accent-foreground: #2d2d2d;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #ffd500;
  --radius: 0.75rem;
  
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.basecamp-theme.dark {
  /* Dark mode */
  --background: #0f172a;
  --foreground: #e2e8f0;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --primary: #ffd500;
  --primary-foreground: #0f172a;
  --accent: #ffd500;
  --accent-foreground: #0f172a;
  --border: #334155;
  --input: #334155;
  --ring: #ffd500;
  --radius: 0.75rem;
  
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
```

## Component Styling

### Sidebar Navigation
```tsx
// Basecamp theme - larger rounded corners, yellow accents
"rounded-lg",
isActive(path) 
  ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
  : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
```

### Cards and Containers
- **Border Radius**: `0.75rem` (rounded-lg) for modern appearance
- **Shadows**: Subtle shadows for depth without being heavy
- **Padding**: Generous padding for breathing room

### Buttons and Interactive Elements
- **Primary Actions**: Basecamp yellow background with dark text
- **Secondary Actions**: Transparent with yellow accents on hover
- **Focus States**: Yellow ring for accessibility

## Layout and Spacing
- **Container Max Width**: Responsive with appropriate margins
- **Grid Gaps**: Consistent spacing using Tailwind's spacing scale
- **Section Padding**: Generous padding for readability

## Interactive States

### Hover Effects
- **Subtle Background Changes**: Light yellow tints on hover
- **Text Color Shifts**: Darker text on hover for emphasis
- **Smooth Transitions**: CSS transitions for polished feel

### Focus States
- **Yellow Ring**: Consistent focus indicators using `--ring` color
- **High Contrast**: Ensures accessibility compliance

### Active States
- **Bold Yellow**: Full basecamp-yellow background for active items
- **Dark Text**: High contrast text on yellow backgrounds

## Implementation Notes

### Theme Application
```tsx
// Theme class applied to document body
const themeClass = theme === 'basecamp' ? 'basecamp-theme' : 'purple-theme';
document.body.className = themeClass + (isDark ? ' dark' : '');
```

### Tailwind Configuration
```js
// Custom color in tailwind.config.ts
'basecamp-yellow': '#ffd500',
```

### CSS Custom Properties
All color values are defined as CSS variables to enable proper dark mode switching and maintain consistency across components.

## Benefits of This Design System
1. **Professional Appearance**: Clean, modern look that builds trust
2. **High Readability**: Strong contrast and clear typography
3. **Brand Recognition**: Distinctive yellow accent creates memorable identity
4. **Accessibility**: Proper focus states and color contrast ratios
5. **Scalability**: Consistent system that works across all components

## Usage Guidelines
- Use basecamp-yellow sparingly for maximum impact
- Maintain consistent spacing and typography scales
- Ensure all interactive elements have proper hover/focus states
- Test in both light and dark modes for consistency