# MusoBuddy Current Styling Preservation Guide
*Created: August 2, 2025*

This document preserves the current visual design and styling of MusoBuddy to allow for future restoration.

## Color Palette & Theme

### Primary Colors (Light Theme)
- **Primary Purple**: `hsl(262, 83%, 72%)` - Main brand color
- **Primary Foreground**: `hsl(210, 20%, 98%)` - Text on purple backgrounds
- **Background**: `hsl(0, 0%, 100%)` - Pure white
- **Foreground**: `hsl(224, 71.4%, 4.1%)` - Primary text color

### Secondary Colors (Light Theme)
- **Secondary**: `hsl(220, 14.3%, 95.9%)` - Light gray backgrounds
- **Secondary Foreground**: `hsl(220.9, 39.3%, 11%)` - Dark text
- **Muted**: `hsl(220, 14.3%, 95.9%)` - Subtle backgrounds
- **Muted Foreground**: `hsl(220, 8.9%, 46.1%)` - Subdued text
- **Border**: `hsl(220, 13%, 91%)` - Light borders
- **Input**: `hsl(220, 13%, 91%)` - Input field borders

### Accent & Status Colors
- **Accent**: `hsl(220, 14.3%, 95.9%)` - Hover states
- **Destructive**: `hsl(0, 84.2%, 60.2%)` - Error/delete actions
- **Ring**: `hsl(262, 83%, 72%)` - Focus ring color
- **Chart Colors**: 
  - Chart 1: `hsl(262, 83%, 72%)`
  - Chart 2: `hsl(252, 83%, 82%)`
  - Chart 3: `hsl(272, 83%, 62%)`
  - Chart 4: `hsl(242, 83%, 82%)`
  - Chart 5: `hsl(282, 83%, 62%)`

### Dark Theme Colors
- **Background**: `hsl(224, 71.4%, 4.1%)` - Very dark blue
- **Foreground**: `hsl(210, 20%, 98%)` - Light text
- **Primary**: `hsl(263, 70%, 65%)` - Slightly muted purple
- **Muted**: `hsl(215, 27.9%, 16.9%)` - Dark gray
- **Border**: `hsl(215, 27.9%, 16.9%)` - Dark borders

### Sidebar-Specific Colors
- **Sidebar Background**: `hsl(0, 0%, 98%)` - Off-white
- **Sidebar Primary**: `hsl(262, 83%, 72%)` - Purple for active items
- **Sidebar Border**: `hsl(220, 13%, 91%)` - Light border

## Typography

### Font Configuration
- **Base Font**: System font stack (sans-serif)
- **Font Smoothing**: `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`
- **Base Font Size**: 16px (responsive scaling applied)

### Responsive Font Scaling
- **Mobile (≤480px)**: 15px base
- **Tablet (481-768px)**: 16px base
- **Desktop (769-1199px)**: 16.5px base
- **Large Desktop (≥1200px)**: 17px base

### Sidebar Typography
- **Font Size**: 0.95rem with enhanced readability
- **Line Height**: 1.35rem for better spacing
- **Class**: `.sidebar-consistent`

## Layout Structure

### Sidebar Design
- **Width**: 256px (64 * 0.25rem = 16rem)
- **Background**: White with subtle shadow
- **Border**: Right border with light gray
- **Position**: Fixed on desktop, sliding overlay on mobile
- **Z-index**: 30 on desktop, 50 on mobile

### Sidebar Navigation Items
- **Padding**: 16px (px-4 py-3)
- **Border Radius**: 8px (rounded-lg)
- **Active State**: Purple background (`bg-purple-600`) with white text
- **Hover State**: Light gray background (`hover:bg-gray-100`)
- **Transition**: Smooth color transitions

### Main Content Layout
- **Desktop Margin**: 16rem left margin to account for sidebar
- **Mobile Margin**: 0 (full width)
- **Max Width**: 7xl (80rem) with auto margins for centering
- **Padding**: 16px on mobile, 24px on desktop

## Component Styling

### Cards
- **Background**: White (`bg-card`)
- **Border**: Subtle border with rounded corners (`rounded-lg border`)
- **Shadow**: Subtle shadow (`shadow-sm`)
- **Padding**: 24px (p-6) for header and content

### Buttons
- **Primary**: Purple background with white text
- **Secondary**: Light gray background
- **Outline**: Border with transparent background
- **Ghost**: Transparent with hover effects
- **Padding**: 16px horizontal, 8px vertical (default size)
- **Border Radius**: Medium (`rounded-md`)

### Form Elements
- **Inputs**: Light gray border, white background
- **Focus Ring**: Purple ring matching primary color
- **Border Radius**: Medium to match overall design

### Dashboard Grid
- **Main Grid**: 1 column on mobile, 4 columns on xl screens
- **Content Area**: 3 columns (spans xl:col-span-3)
- **Sidebar Widget Area**: 1 column with stacked widgets
- **Gap**: 24px between grid items

## Special Effects & Animations

### Hover Effects
- **Cards**: Slight upward transform (`translateY(-2px)`) with enhanced shadow
- **Class**: `.music-card-hover` with transition
- **Duration**: 0.3s ease

### Gradients
- **Primary Gradient**: `linear-gradient(135deg, hsl(262, 83%, 72%) 0%, hsl(263, 70%, 65%) 100%)`
- **Dark Theme Gradient**: `linear-gradient(135deg, hsl(263, 70%, 65%) 0%, hsl(253, 70%, 75%) 100%)`
- **Classes**: `.superhuman-gradient` and `.superhuman-gradient-dark`

### Sidebar Transitions
- **Transform**: Smooth slide transitions for mobile
- **Duration**: 0.3s ease-in-out
- **Class**: `.sidebar-transition`

## Scrollbar Styling
- **Width**: 8px
- **Track**: Light gray background
- **Thumb**: Purple color matching primary theme
- **Hover**: Slightly darker purple

## Responsive Breakpoints

### Media Queries
- **Mobile**: max-width: 480px
- **Tablet**: 481px - 768px
- **Desktop**: 769px - 1199px
- **Large Desktop**: min-width: 1200px

### Sidebar Behavior
- **Desktop (≥768px)**: Always visible, fixed position
- **Mobile (<768px)**: Sliding overlay with backdrop

### Content Spacing
- **Mobile**: 16px padding
- **Desktop**: 24px padding
- **Max-width**: 7xl container with auto margins

## Logo & Branding
- **Logo**: `/musobuddy-logo-purple.png`
- **Logo Size**: 40px × 40px (w-10 h-10)
- **Logo Styling**: Rounded corners with shadow
- **Tagline**: "Less admin, more music"

## Navigation Structure

### Main Navigation Items
1. Dashboard (Home icon)
2. Bookings (Inbox icon)
3. Address Book (Users icon)
4. Contracts (FileText icon)
5. Invoices (PoundSterling icon)
6. Compliance (Shield icon)
7. Upgrade ⭐ (Crown icon)
8. Settings (Settings icon)
9. Templates (MessageSquare icon)
10. Review Messages (AlertTriangle icon)
11. User Guide (BookOpen icon)

### Conditional Navigation
- **Beta Feedback**: Only for beta testers and admins
- **Admin Panel**: Only for admin users

### User Profile Section
- **Position**: Bottom of sidebar
- **Background**: White with top border
- **Profile Image**: 40px circle or purple background with User icon
- **User Info**: Name and "Musician" subtitle
- **Logout Button**: Small with LogOut icon

## Performance Optimizations

### Text Rendering
- **Webkit Font Smoothing**: Antialiased
- **Text Size Adjust**: 100% to prevent zoom issues
- **Line Height**: 1.5 for readability

### Layout Stability
- **Box Sizing**: Border-box for all elements
- **Margin/Padding Reset**: Zero for all elements
- **Overflow**: Hidden on root to prevent horizontal scroll

### Viewport Settings
- **Width**: 100% with no horizontal overflow
- **Min Height**: 100vh for full viewport coverage
- **Position**: Relative for proper stacking

## CSS Variable Dependencies

All colors use CSS custom properties defined in `:root` and `.dark` selectors, allowing for easy theme switching. The design system is built on shadcn/ui components with Tailwind CSS utilities.

## Important CSS Classes

### Layout Classes
- `.sidebar-consistent`: Enhanced sidebar readability
- `.layout-consistent`: Full viewport height layouts
- `.main-content`: Responsive margin for sidebar
- `.content-container`: Prevents layout shifts

### Visual Classes
- `.glass-effect`: Backdrop blur with transparency
- `.music-card-hover`: Card hover animations
- `.filter-container`: Clean filter styling (removes purple artifacts)
- `.superhuman-gradient`: Primary gradient backgrounds

### Responsive Classes
- `.sidebar-desktop-visible`: Force sidebar visibility on desktop
- `.mobile-nav-hidden`: Hide mobile nav on desktop
- `.sidebar-hidden`: Hide sidebar on mobile
- `.text-responsive`: Responsive text sizing

This document captures the current visual state of MusoBuddy as of August 2, 2025, and can be used to restore the styling if changes are made.