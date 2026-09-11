---
name: websitebanja-saas-ux
description: Software-as-a-Service UX patterns, interactive product tours, tier comparison matrices, and friction-free onboarding.
version: 1.0.0
---

# WebsiteBanja AI — SaaS UX & Product Architecture Intelligence Skill

> **Role**: Subscription Web Architecture, Self-Serve Onboarding Engineering, Dashboard Information Design, and Retention UX.  
> **Source**: B2B SaaS benchmarks, product-led growth (PLG) frameworks, enterprise usability guidelines, and recurring revenue churn reduction research.  
> **Application Priority**: Time-to-Value (TTV) Minimization > Workflow Friction Reduction > Information Density Balance > Visual Polish.

---

## 1. Core Philosophy: Time-to-Value & Frictionless Workflows

The success of a SaaS application hinges on a single metric: **Time-to-Value (TTV)**—the duration from initial signup until the user experiences their first "aha!" moment of tangible utility.

Every barrier, superfluous onboarding modal, or confusing navigation hurdle increases day-1 churn. WebsiteBanja AI designs SaaS interfaces to be immediately intuitive, self-guiding, and focused on user productivity.

---

## 2. Core SaaS Architectural Surfaces

### A. The Collapsible Workspace Navigation Sidebar
- **Width**: `240px–280px` expanded; `64px` icon-only collapsed.
- **Top Zone**: Workspace / Organization switcher with avatar and plan badge (`"Pro Plan"`).
- **Middle Zone**: Primary application modules with active route indicators and unread count badges.
- **Bottom Zone**: Usage quota progress bar (`"8,420 / 10,000 API calls used • 84%"`), Settings, Help/Docs, User profile menu.
- **Mobile**: Collapses completely into a full-height slide-out drawer (`z-50`) triggered by top-left hamburger button.

### B. Global Command Palette (Cmd+K / Ctrl+K)
Modern power users navigate SaaS platforms via keyboard commands:
- Accessible from anywhere in the application via `Cmd+K` or search bar click.
- Groups results: **Recent Pages**, **Quick Actions** (`"Invite Team Member"`, `"Generate API Key"`), **Documentation**, **Entities**.
- Full keyboard navigation support (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).

### C. Self-Serve Onboarding & Activation Steppers
- Avoid 10-step unskippable product tours with intrusive tooltips.
- Use an embedded, non-modal **Getting Started Checklist** (3–4 high-impact milestones):
  - [x] Create workspace
  - [ ] Connect data source or GitHub repo
  - [ ] Invite your first collaborator
- Award immediate visual celebration (confetti burst or progress badge) upon completion.

### D. Billing, Subscription & Usage Transparency
- **Plan Comparison**: Highlight current plan vs upgrade target with clear delta callouts.
- **Usage Meters**: Visual progress bars showing resource consumption (storage, seats, credits) with warning colors at 85% (`text-amber-500`) and 100% (`text-destructive`).
- **Cancellation & Pause Flows**: Provide transparent, 1-click self-serve cancellation without dark patterns. Offer a "Pause Subscription" or "Downgrade to Free Tier" alternative ethically.

---

## 3. Empty States & Progressive Activation

Never show a naked blank table with `"No data"`:
```
┌─────────────────────────────────────────────────────────┐
│ [Icon: Folder with Plus Sign]                           │
│                                                         │
│ No projects created yet                                 │
│ Projects help you organize and deploy websites with     │
│ custom domains. Create your first project to get started.│
│                                                         │
│ [Primary CTA Button: "+ Create New Project"]             │
│ [Secondary Link: "Read Documentation ->"]               │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Settings & Permissions Architecture

- Group settings into clear categories: **General**, **Members & Roles**, **Billing**, **API Keys**, **Integrations**, **Audit Logs**.
- Granular Role-Based Access Control (RBAC): Clearly delineate permissions:
  - **Owner**: Full billing and project deletion rights.
  - **Admin**: Can invite members and configure integrations.
  - **Member / Editor**: Can create and edit content.
  - **Viewer**: Read-only observation.

---

## 5. Critical SaaS UX Anti-Patterns

1. **The Trapped User (Contact Us to Cancel)**: Forcing self-serve subscribers to email support or call a phone number to cancel an online subscription. This triggers immediate credit card chargebacks and brand toxicity.
2. **The Intrusive Product Tour**: Forcing users through 8 consecutive modal pop-ups that block the screen before they can touch the application.
3. **The Hidden Billing Receipt**: Hiding past invoices and VAT receipts behind obscure submenus, frustrating corporate accounting teams.
4. **Vague Error Messages**: Presenting `"Something went wrong. Error 500"` without instructions on how to recover or resolve the issue.

---

## 6. Pre-Ship SaaS UX Quality Checklist

- [ ] Is Time-to-Value prioritized with an intuitive setup flow?
- [ ] Does the sidebar collapse cleanly and feature a clear usage meter?
- [ ] Is a global search or command palette affordance present?
- [ ] Are all empty states equipped with explanatory context and primary creation buttons?
- [ ] Is billing and subscription management transparent, self-serve, and ethical?
- [ ] Are team roles and permissions clearly differentiated?
