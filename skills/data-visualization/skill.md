---
name: websitebanja-data-visualization
description: Executive analytics dashboards, KPI metric scorecards, interactive charts, and clear data hierarchy.
version: 1.0.0
---

# WebsiteBanja AI — Data Visualization Intelligence Skill

> **Role**: Information Visualization Architecture, Chart Selection Engineering, Dashboard Hierarchy, and Ethical Data Communication.  
> **Source**: Edward Tufte principles of graphical integrity, Cleveland-McGill perceptual accuracy rankings, and modern dashboard UX benchmarks.  
> **Application Priority**: Truthful Data Representation > Perceptual Clarity & Legibility > Accessible Contrast > Aesthetic Polish.

---

## 1. Core Philosophy: Graphical Integrity & Minimal Data-Ink Ratio

Data visualization exists to make complex patterns instantly intelligible and actionable. The highest crime in data visualization is creating "chart junk"—gratuitous 3D effects, ambiguous gradients, and deceptive axes that distort reality.

### Tufte's Lie Factor Law
$$\text{Lie Factor} = \frac{\text{Size of effect shown in graphic}}{\text{Size of effect in data}}$$
The Lie Factor must equal **1.0**. Any chart where a 5% gain visually looks like a 500% explosion due to a truncated axis or distorted scale is functionally defective and unethical.

---

## 2. Chart Selection Matrix (Form Follows Data Type)

Choosing the wrong chart type confuses users and destroys analytical utility. Use this exact mapping:

| Data Type / Analytical Goal | Correct Chart Type | Forbidden Chart Type | Why? |
| :--- | :--- | :--- | :--- |
| **Trend Over Continuous Time** | Line Chart / Smooth Area Chart | Bar Chart with 50 tight bars | Line slopes accurately communicate velocity and acceleration over continuous temporal intervals. |
| **Categorical Comparison (5–12 items)**| Horizontal or Vertical Bar Chart | Radar / Spider Chart | Human brains perceive linear length differences with far higher accuracy than polar angles. |
| **Composition / Part-to-Whole (<5 items)**| Donut Chart with central metric | Pie Chart with 12 tiny slices | Pie slices with >5 items become unreadable; donut centers provide high-value space for total summaries. |
| **High-Volume Correlation** | Scatter Plot with regression line | Cluttered Dual-Axis Area | Scatter plots expose outliers, clusters, and correlation without misleading area overlaps. |
| **Single Vital Metric** | KPI / Stat Card with Sparkline | Complex Gauge / Speedometer | Gauges consume huge whitespace for 1 number. KPI cards show value, delta (+14%), and historical trend compactly. |

---

## 3. Dashboard Information Hierarchy

High-converting, professional dashboards follow a top-down cognitive pyramid:
```
┌────────────────────────────────────────────────────────────────────────┐
│ Level 1: Vital Pulse / KPI Cards (Row of 3 to 4 metrics)              │
│ Total Revenue ($142.5k) │ Active Users (12.4k) │ Conversion (3.8%)    │
├────────────────────────────────────────────────────────────────────────┤
│ Level 2: Primary Temporal Narrative (Wide Aspect Chart)               │
│ 12-Month Revenue & Churn Trend Line Chart with Interactive Tooltip    │
├───────────────────────────────────┬────────────────────────────────────┤
│ Level 3: Categorical Breakdown    │ Level 4: Granular Table / Logs     │
│ Top Acquired Channels (Bar Chart) │ Recent Transactions with Status    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Accessible Chart Palettes & Colorblind Safety

1. **Distinct Semantic Hues**: Avoid using 5 subtle shades of the same blue. Use distinctly separated hues (e.g. Primary Teal, Amber Accent, Slate Gray).
2. **Never Rely on Color Alone**:
   - Pair colored lines with distinct dashed patterns (`solid`, `dashed`, `dotted`) in technical charts.
   - Accompany bar segments with explicit numeric text labels.
3. **Colorblind-Safe Palettes**: Verify that red (error/decline) and green (success/growth) can be differentiated by users with protanopia or deuteranopia by pairing with directional arrow icons ($\uparrow / \downarrow$).

---

## 5. Responsive Data Visualization & Mobile Adaptation

- **Desktop (1024px+)**: Full interactive canvas with hover tooltips, multi-series legends, and granular date filters.
- **Mobile (< 768px)**:
  - Downsample high-density points (e.g., aggregate 365 daily points into 12 monthly bars).
  - Hide dense secondary gridlines to prevent visual clutter.
  - Position interactive tooltips in a fixed pill header above the chart rather than floating directly under the user's tapping thumb.
  - Provide an accessible "View Data Table" toggle below every chart so users can read raw numbers directly.

---

## 6. Critical Data Visualization Anti-Patterns

1. **The Truncated Y-Axis Lie**: Starting a bar chart at 90 instead of 0, making a tiny 92 vs 98 difference look like a 500% collapse. (Bar charts MUST always start at baseline 0).
2. **The Rainbow Explosion**: Using 14 vibrant random colors in a single chart without a unified design system palette.
3. **The Microscopic Mobile Axis**: Cramming 30 tiny date labels along an X-axis on mobile until they overlap into an unreadable black smear.
4. **Dual Incompatible Axes**: Overlaying two metrics with wildly different scales (e.g. Temperature and Dollar Sales) on left and right axes, creating false correlation artifacts.

---

## 7. Pre-Ship Data Visualization Checklist

- [ ] Does the selected chart type match the mathematical reality of the data?
- [ ] Do bar charts start at baseline zero to prevent visual distortion?
- [ ] Does the color palette pass colorblind accessibility checks with supporting labels/icons?
- [ ] Are axes and tooltips clearly formatted with units ($, %, ms, GB)?
- [ ] Are mobile charts simplified with clean downsampling and zero label collisions?
- [ ] Is an accessible tabular data fallback provided for screen readers?
