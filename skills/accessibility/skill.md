---
name: websitebanja-accessibility
description: Inclusive design floor, WCAG 2.2 AA contrast (4.5:1), keyboard navigation, focus rings, single H1, and ARIA discipline.
version: 1.0.0
---

# WebsiteBanja AI — Accessibility & WCAG Intelligence Skill

> **Role**: Inclusive Interface Engineering, WCAG 2.2 AA/AAA Compliance, Assistive Tech Interoperability, and Universal Usability.  
> **Source**: W3C Web Content Accessibility Guidelines (WCAG 2.2), WAI-ARIA 1.2 Authoring Practices, Section 508, and screen-reader usability testing.  
> **Application Priority**: Universal Accessibility & Legal Compliance (Absolute Floor) > Semantic Accuracy > Visual Polish.

---

## 1. Core Philosophy: Accessibility as the Floor of Quality

In WebsiteBanja AI, accessibility is never an optional feature or an afterthought. An interface that cannot be navigated by keyboard or understood by assistive technology is fundamentally broken.

### The 4 WCAG Principles (POUR)
1. **Perceivable**: Information and user interface components must be presentable to users in ways they can perceive (sufficient contrast, text alternatives for non-text content, adaptable structure).
2. **Operable**: Interface components and navigation must be operable via any input method (100% keyboard accessibility, sufficient time to read, zero seizure-inducing flashes, clear navigational paths).
3. **Understandable**: Information and operation of user interfaces must be clear and predictable (readable text, predictable navigation, form input assistance and error prevention).
4. **Robust**: Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

### The First Rule of ARIA
> **Rule**: Do NOT use ARIA when native HTML semantic elements already provide the built-in accessibility behavior.
- Use `<button>` instead of `<div role="button" tabindex="0">`.
- Use `<nav>` instead of `<div role="navigation">`.
- Use `<dialog>` or native HTML form elements rather than custom synthetic widgets.

---

## 2. Contrast Ratios & Visual Perception (WCAG 2.2 AA)

| Element Type | Minimum Contrast Ratio | Preferred Enhanced (AAA) | Practical Guideline |
| :--- | :--- | :--- | :--- |
| **Normal Body Text (<18pt / <24px)** | **4.5 : 1** | **7.0 : 1** | Use dark charcoal (`#1E293B`) on white or light silver (`#E2E8F0`) on dark. |
| **Large Text (>=18pt or >=14pt Bold)** | **3.0 : 1** | **4.5 : 1** | Applies to major H1 and H2 display headlines. |
| **Active UI Components & Borders** | **3.0 : 1** | **4.5 : 1** | Form input borders, toggle switches, and focus indicators against background. |
| **Disabled Elements / Decorative Icons**| No strict minimum | 2.0 : 1 | Avoid hiding crucial instructional copy inside "disabled" muted styling. |

---

## 3. Semantic Heading Hierarchy

Screen reader users navigate web pages primarily by jumping between headings. A broken heading structure causes severe disorientation:
1. **Single H1 Rule**: Every page must have exactly **one `<h1>`** representing the primary topic of the page (usually the hero title).
2. **Never Skip Levels**: Never jump from `<h2>` directly to `<h4>`. The sequence must descend logically:
   $$\text{H1 (Page Title)} \longrightarrow \text{H2 (Major Section)} \longrightarrow \text{H3 (Subsection / Card Title)} \longrightarrow \text{H4 (Nested Item)}$$
3. **Visual Size vs. Semantic Level**: Decouple styling from semantic tag. If an `<h3>` needs to look large, style it with Tailwind utility classes (`<h3 className="text-2xl font-bold">`) rather than inappropriately promoting it to an `<h1>`.

---

## 4. Keyboard Navigation & Focus Architecture

1. **The Focus Ring Mandate**: Never remove CSS focus outlines (`outline: none` or `outline-0`) without immediately supplying a high-contrast replacement:
   ```html
   className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
   ```
2. **Logical Tab Order**: Tab navigation must strictly follow the visual reading order (left-to-right, top-to-bottom). Never use positive `tabindex` values (`tabindex="1"`), as this violently disrupts standard DOM navigation.
3. **Modal & Drawer Focus Trapping**: When a dialog or mobile navigation drawer opens:
   - Focus must immediately move inside the modal container.
   - Tab cycling must remain trapped within the open modal.
   - Pressing the `Escape` key must immediately dismiss the modal and return focus to the trigger button.
4. **Skip-to-Content Link**: Provide a hidden skip link at the top of the body that becomes visible on keyboard focus:
   ```html
   <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
     Skip to main content
   </a>
   ```

---

## 5. Forms, Labels & Error Announcements

1. **Explicit Label Association**: Every form input must have a programmatically linked `<label>`:
   ```html
   <label htmlFor="user-email" className="block text-sm font-medium">Work Email</label>
   <input id="user-email" type="email" aria-describedby="email-error" required />
   <p id="email-error" role="alert" className="text-xs text-destructive mt-1">Please enter a valid business email.</p>
   ```
2. **Never Rely on Placeholders as Labels**: Placeholders disappear when the user types, eliminating field context for users with cognitive or memory impairments.
3. **Accessible Error Announcements**: Form errors must use `role="alert"` or `aria-live="polite"` so screen readers immediately inform the user without page reloading.

---

## 6. Image Alternatives (Alt Text) Discipline

- **Informative Images**: Alt text must succinctly describe the meaning or context of the image: `alt="Handcrafted pepperoni sourdough pizza baked in wood-fired oven"`.
- **Decorative Images**: Background textures, abstract gradients, and auxiliary icons paired with text must use empty alt text (`alt=""`) or `aria-hidden="true"` so screen readers ignore them cleanly.
- **Never Use Filenames**: Never leave `alt="IMG_20260911_001.png"` or `alt="image"`.

---

## 7. Critical Accessibility Anti-Patterns

1. **The Invisible Focus Indicator**: Removing focus outlines with `outline: none`, rendering the website completely unusable for millions of keyboard-only users.
2. **Text Embedded in Raster Images**: Writing crucial promotions or contact details into flat JPEG banners where screen readers cannot parse them.
3. **Non-Descriptive Link Text**: Links that say "Click Here", "Read More", or "Link" with zero context. Screen readers provide a "Links List" modal where 10 links named "Read More" are completely unintelligible. Use: "Read more about our cloud security architecture".
4. **Color-Only State Communication**: Signifying form error exclusively by turning an input border red without an accompanying icon or text explanation. (Color-blind users cannot differentiate).
5. **Ignoring Reduced Motion**: Forcing fast flashing transitions on users who have set OS preferences for reduced motion.

---

## 8. Pre-Ship WCAG 2.2 AA Quality Checklist

- [ ] Does the page pass automated WCAG 2.2 AA contrast checks (minimum 4.5:1 text, 3:1 UI components)?
- [ ] Can the entire website be navigated comfortably using only the `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape` keys?
- [ ] Is there exactly one `<h1>` per page, followed by an unbroken heading hierarchy?
- [ ] Do all form fields have explicit `<label htmlFor="...">` associations?
- [ ] Do all interactive components feature visible, high-contrast `:focus-visible` rings?
- [ ] Are informative images supplied with descriptive alt text, and decorative images hidden with `alt=""`?
- [ ] Does motion respect `useReducedMotion()` and OS reduced-motion preferences?
