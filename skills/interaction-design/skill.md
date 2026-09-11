---
name: websitebanja-interaction-design
description: 8-state component completeness (hover, focus, active, loading, disabled, error, empty), and tactile micro-feedback.
version: 1.0.0
---

# WebsiteBanja AI — Interaction Design Intelligence Skill

> **Role**: State Machine Completeness, Micro-Interaction Engineering, Feedback Physics, and Interactive Affordance Architecture.  
> **Source**: Modern interactive design systems (Nielsen Norman Group, Material 3, Apple Human Interface Guidelines), reactive UI state models, and web accessibility standards.  
> **Application Priority**: State Completeness & User Feedback > Interaction Responsiveness (<100ms) > Spatial Clarity > Delight.

---

## 1. Core Philosophy: The Law of State Completeness

An interactive element is an ongoing conversation with the user. If an element fails to respond visually to a cursor hover, tap, or focus event, the user assumes the interface is frozen or broken.

### The 8 Canonical Interactive States
Every interactive component (button, card, input, tab, menu item) must have mathematically distinct definitions for all 8 states:
1. **Rest (Default)**: Clean baseline state communicating functional affordance (elevated border, clear contrast, cursor pointer).
2. **Hover**: Cursor proximity confirmation (`transition-all duration-150 ease-out`). Slight luminance lift, 1–2px micro-elevation (`translate-y-[-1px]`), or border illumination.
3. **Focus-Visible**: Keyboard tab acquisition (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`). High optical contrast.
4. **Active (Pressed / Down)**: Direct physical compression feedback (`scale-[0.98]` or `translate-y-[1px]`). Instantaneous tactile confirmation of actuation.
5. **Loading**: In-flight asynchronous operation. Replace text/icons with an inline spinner (`animate-spin`) or pulse shimmer. Button must become `aria-busy="true"` and non-clickable to prevent duplicate submissions.
6. **Success**: Operation complete confirmation. Brief green checkmark or toast notification ("Message Sent!").
7. **Error**: Validation or network failure. Red border highlight (`border-destructive`), alert icon, and immediate explanatory text linked via `aria-describedby`.
8. **Disabled**: Action unavailable. Muted contrast (`opacity-50 pointer-events-none cursor-not-allowed`). Never leave a user guessing *why* something is disabled; provide an accompanying tooltip or helper text.

---

## 2. Interactive Component Recipes & Behavioral Specs

### A. The Action Button State Machine
```html
<button
  className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg
             bg-primary text-primary-foreground shadow-sm
             transition-all duration-150 ease-out
             hover:bg-primary/90 hover:shadow hover:-translate-y-0.5
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
             active:translate-y-0 active:scale-[0.98]
             disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
>
  Get Started Free
</button>
```

### B. Interactive Cards with Cohesive Hover
- When a card represents a navigation destination:
  - Lift the card slightly (`hover:-translate-y-1 hover:shadow-lg`).
  - Illuminate the outer border (`hover:border-primary/40`).
  - Nudge the nested action arrow icon (`group-hover:translate-x-1`).
  - Entire bounding box must respond to click, avoiding disjointed child link targets.

### C. Collapsible Accordions & Disclosure Panels
- **Trigger**: Full-width row with accessible `<button aria-expanded={isOpen} aria-controls="faq-content">`.
- **Icon**: Chevron icon that rotates smoothly 180 degrees (`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`).
- **Panel**: Smoothly expands height with `overflow-hidden` to prevent layout clipping.

### D. Gliding Active Tabs
- Tab list with accessible `role="tablist"` and `role="tab"`.
- Active tab features an underlying pill backdrop gliding smoothly across tabs (`layoutId="activeTabIndicator"`).
- Inactive tabs maintain clean hover states (`hover:text-foreground`).

### E. Modals, Drawers & Dialogs
- **Mount Entrance**: Backdrop fades in (`opacity-0 -> opacity-100` over 150ms). Dialog slides up smoothly (`scale-95 translate-y-4 -> scale-100 translate-y-0` over 200ms).
- **Dismissal Hooks**:
  - Click on backdrop overlay dismisses modal.
  - Dedicated close icon button with accessible `aria-label="Close dialog"`.
  - Pressing `Escape` key immediately closes modal and restores focus to the trigger button.
- **Scroll Lock**: Body scroll must be locked (`overflow-hidden` on `document.body`) while modal is open to prevent disorienting background scroll.

---

## 3. Empty & Error States

Never present a user with a blank white void:
- **Empty State Anatomy**:
  - Light, clean illustration or subdued Lucide SVG icon.
  - Clear heading explaining the situation: `"No projects found"`.
  - Helpful descriptive sentence: `"You haven't created any website projects yet."`.
  - Prominent recovery CTA button: `"Create Your First Project"`.
- **Form Error State**:
  - Red border stroke (`border-destructive`).
  - Inline error text directly below the offending input.
  - Preserve all validly entered data; never wipe an entire form because one field had an error.

---

## 4. Critical Interaction Anti-Patterns

1. **The Dead Click**: An element styled with blue underlined text or button borders that does not respond to clicks.
2. **Missing Loading States**: Submitting a payment or contact form without disabling the button and showing a spinner, leading frustrated users to click 5 times and generate 5 duplicate submissions.
3. **The Unclosable Modal**: Opening a pop-up without an obvious `X` close button, ignoring the `Escape` key, and failing to dismiss when clicking outside.
4. **Instant Flash State Changes**: Snapping hover colors instantly with 0ms transition. Always provide a subtle `150ms` easing transition for organic tactile feel.
5. **Layout Shifting on Hover**: Adding a 2px border on hover to an element that had 0px border at rest, causing the entire surrounding page layout to jump by 2px. (Always set a transparent 2px border at rest: `border-2 border-transparent hover:border-primary`).

---

## 5. Pre-Ship Interaction Design Checklist

- [ ] Do all buttons feature distinct rest, hover, focus-visible, and active/pressed states?
- [ ] Are form submit actions accompanied by immediate loading indicators and double-click prevention?
- [ ] Do modals and slide-out sheets support `Escape` key dismissal and outside click closing?
- [ ] Are all hover transitions smoothed with `duration-150` or `duration-200` easing?
- [ ] Are empty states and error scenarios equipped with clear explanatory text and primary recovery CTAs?
