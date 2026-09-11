---
name: websitebanja-ux-psychology
description: Hick's Law choice limits, Fitts's Law spatial targets, Miller's Law chunking, Jakob's Law, and zero dark patterns.
version: 1.0.0
---

# WebsiteBanja AI — UX Psychology Intelligence Skill

> **Role**: Behavioral Cognitive Architecture, Mental Model Alignment, Cognitive Load Minimization, and Ethical Decision Engineering.  
> **Source**: Classical cognitive psychology (Kahneman, Norman), human-computer interaction laws (Hick, Fitts, Miller, Jakob), Gestalt perceptual psychology, and ethical design principles.  
> **Application Priority**: Cognitive Clarity & Usability > Familiar Mental Models > Emotional Trust > Aesthetic Novelty.

---

## 1. Core Philosophy: Cognitive Fluency & Ethical Respect

Human brains process digital interfaces through finite cognitive bandwidth (working memory). A website succeeds when it creates **cognitive fluency**—the subjective ease with which a user processes information and makes decisions.

### Cognitive System 1 vs. System 2 (Kahneman)
- **System 1 (Fast, Intuitive, Automatic)**: Operates 95% of the time. Users scan, recognize familiar layouts (Jakob's Law), react to color contrasts, and make instant emotional trust assessments.
- **System 2 (Slow, Deliberate, Analytical)**: Engaged during complex pricing comparisons, technical feature evaluation, or legal reviews. High friction forces System 2 to work harder, leading to decision fatigue and high abandonment.
WebsiteBanja AI designs interfaces that empower System 1 scanning while providing effortless clarity for System 2 analysis.

---

## 2. The Canonical Laws of UX Psychology

### A. Hick's Law: Decision Time & Choice Architecture
$$T = b \cdot \log_2(n + 1)$$
The time required to make a decision increases logarithmically with the number and complexity of choices.
- **Application**:
  - In Hero sections: Offer exactly **one primary action** and at most **one secondary action**. Never present four competing buttons.
  - In Navigation: Group links into **5 to 7 logical categories** maximum.
  - In Pricing: Limit active pricing plans to **3 choices** (Starter, Pro, Enterprise). If extra tiers exist, tuck them behind an "Enterprise / Custom" modal or toggle.

### B. Fitts's Law: Target Acquisition & Spatial Ergonomics
The time required to rapidly move to a target area is a function of the target distance and the target width.
- **Application**:
  - Make primary conversion buttons physically larger (`py-3.5 px-8 text-base font-semibold` minimum).
  - Place primary mobile actions directly inside the natural **thumb zone** (bottom 40% of the mobile viewport).
  - Enlarge click/tap boundaries on small text links and icons with invisible padding (`p-2 -m-2`).

### C. Miller's Law: Working Memory & Chunking
The average human can hold only **7 (plus or minus 2) items** in active working memory.
- **Application**:
  - Break long lists of 20 features into **3 or 4 thematic category chunks**.
  - Format phone numbers (`(555) 019-2834`) and credit cards into distinct grouped chunks rather than unbroken numeric strings.
  - Structure long checkout or onboarding flows into **3 to 4 sequential steps** with a visible progress indicator.

### D. Jakob's Law of Internet User Experience
Users spend most of their time on *other websites*. This means they expect your website to work the same way as all the other sites they already know.
- **Application**:
  - Brand logo sits at the top-left; clicking it always navigates to home.
  - Shopping cart icon sits at the top-right with an active badge indicator.
  - Search inputs use a magnifying glass icon and clear button.
  - Never reinvent fundamental UI metaphors (e.g. making an underlined blue phrase unclickable, or making a static banner look like a button).

---

## 3. Gestalt Perceptual Principles in Layout

1. **Law of Proximity**: Objects positioned close to each other are perceived as a unified functional group.
   - The gap between an input label and its input field must be small (`mb-1.5`, 6px).
   - The gap between the input field and the next input field must be significantly larger (`mb-5`, 20px).
2. **Law of Similarity**: Elements with identical color, shape, or typography are perceived as having identical functionality.
   - All primary conversion buttons must share the exact same background color and border radius.
   - Never use the primary CTA color for static informational banners or decorative pills.
3. **Law of Continuity**: The human eye instinctively follows lines, arrows, and visual pathways.
   - Alternate visual layouts (left text / right image -> right text / left image) to guide the scanning eye down the page.
4. **Law of Focal Point**: Whatever stands out visually will capture and hold the viewer's attention first.
   - Use high visual luminance and generous whitespace around conversion focal points.

---

## 4. Progressive Disclosure & Cognitive Offloading

Never overwhelm a first-time visitor with the entire operational complexity of a business on the first fold:
- **First Layer (Instant Orientation)**: Core value proposition, 3 primary benefits, and 1 primary CTA.
- **Second Layer (Exploration)**: Interactive feature tabs, customer case studies, and comparative bento grids.
- **Third Layer (Deep Dive)**: Detailed technical specifications, searchable knowledge bases, and comprehensive FAQs.

---

## 5. Ethical Trust Engineering vs. Dark Patterns

| Ethical Trust Building (MANDATORY) | Manipulative Dark Patterns (STRICTLY FORBIDDEN) |
| :--- | :--- |
| Authentic customer reviews with verifiable names | Fabricated testimonials and stock photos of fake founders |
| Transparent, upfront pricing with clear cancellation terms | Hidden recurring fees or obscure billing terms |
| Real-time inventory status ("Available for booking") | Fake countdown timers that restart on refresh |
| Respectful opt-outs ("Skip for now") | Guilt-inducing confirm-shaming ("No thanks, I dislike profit") |

---

## 6. Pre-Ship UX Psychology Checklist

- [ ] Does the page respect Hick's Law by limiting primary choices at key decision points?
- [ ] Are form inputs and lists chunked into groups of 3 to 5 items (Miller's Law)?
- [ ] Are primary conversion buttons positioned within easy reach of the thumb on mobile (Fitts's Law)?
- [ ] Does the layout adhere to standard platform conventions (Jakob's Law)?
- [ ] Is spatial proximity used intentionally so related items sit closer than unrelated items?
- [ ] Are all dark patterns, fake urgency, and manipulative confirm-shaming completely eliminated?
