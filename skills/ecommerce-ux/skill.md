---
name: websitebanja-ecommerce-ux
description: E-commerce conversion architecture, product cards, category filters, trust guarantees, and checkout reassurance.
version: 1.0.0
---

# WebsiteBanja AI — E-Commerce UX & Conversion Architecture Skill

> **Role**: Digital Retail Architecture, Product Discovery Engineering, Checkout Friction Elimination, and Cart Velocity Optimization.  
> **Source**: Baymard Institute e-commerce usability research, Shopify UX standards, consumer purchase psychology, and mobile retail benchmarks.  
> **Application Priority**: Frictionless Checkout & Discovery > Transparent Pricing > Trust & Social Validation > Visual Merchandising.

---

## 1. Core Philosophy: Low-Friction Discovery to Payment

In digital commerce, every fraction of a second of delay, confusing variant selector, or unexpected fee at checkout directly destroys conversion rates. The average e-commerce cart abandonment rate exceeds **70%**; over 48% of that abandonment stems from unexpected extra costs (shipping, taxes, fees) introduced late in the funnel.

WebsiteBanja AI engineers e-commerce experiences that emphasize transparent pricing, effortless product discovery, and lightning-fast checkout flows.

---

## 2. Product Discovery & Faceted Filtering

### A. Instant Predictive Search
- Omnipresent search bar at top of page with placeholder: `"Search products, categories, brands..."`.
- Instant autocomplete dropdown displaying:
  - Top 3 matching product thumbnails with prices.
  - Top 3 matching categories.
  - Recent search history chips.
- **Zero-Results Page Recovery**: When a search returns zero results, never display an empty dead-end. Provide:
  - Did you mean suggestions.
  - "Browse our top-selling collections".
  - A direct customer support link.

### B. Faceted Filtering Architecture
- **Desktop**: Left-aligned sticky sidebar or horizontal filter pills bar.
- **Mobile**: Single floating "Filter & Sort" button triggering a full-height bottom sheet with instant item counts (`"Show 42 Results"`).
- **Essential Facets**: Category, Price Range Slider, Size Chips, Color Swatches, Customer Rating (4★ and up), In-Stock Only toggle.

---

## 3. Product Card & Product Detail Page (PDP) Architecture

### A. The High-Converting Product Card
```
┌─────────────────────────────────────────────────────────┐
│ [Product Image with Aspect 4:5 or 1:1]                  │
│ [Badges: "New" or "20% OFF" - top left]                 │
│ [Wishlist Heart Button - top right]                     │
├─────────────────────────────────────────────────────────┤
│ ★★★★★ (128 reviews)                                    │
│ Organic Cotton Classic Crewneck                         │
│ $48.00  [strikethrough: $60.00]                         │
│ [Color Swatch Dots: Black, White, Olive]                │
│ [Quick Add Button / Hover Slide-Up: "Add to Bag"]       │
└─────────────────────────────────────────────────────────┘
```

### B. The Product Detail Page (PDP)
1. **Visual Showcase (Left 60% on Desktop)**: High-resolution image gallery with thumbnail column, zoom on hover, and mobile swipe carousel with visible dot pagination.
2. **Buy Box (Right 40% on Desktop)**:
   - Eyebrow category and brand name.
   - Clear product title (H1).
   - Star rating badge linking directly down to reviews section (`"4.8/5 • 342 Reviews"`).
   - Price display with savings delta: `"$85.00  $110.00 (Save 22%)"`.
   - Variant Selectors: Size pills with visual cross-out for out-of-stock items, plus accessible "Size Guide" modal link.
   - Primary Action: Prominent, high-contrast `"Add to Cart"` button paired with express one-tap checkout (`Apple Pay` / `Google Pay`).
   - Shipping & Return Transparency: `"Free standard shipping on orders over $50 • 30-day hassle-free returns"`.
3. **Product Information Accordions**: Materials & Care, Dimensions/Specs, Shipping & Delivery Timelines.

---

## 4. The Cart & Checkout Velocity Engine

### A. The Slide-Out Mini-Cart Drawer
- Clicking "Add to Cart" slides open a side drawer (`z-50`) without navigating away from the shopping page.
- **Free Shipping Incentive Bar**: Real-time progress bar: `"Add $12.00 more to unlock FREE shipping!"`.
- Quantity increment controls (`- 1 +`) with instant price recalculation.
- Clear, prominent `"Proceed to Checkout"` button.

### B. High-Velocity Checkout Architecture
1. **Mandatory Guest Checkout**: Never force users to create a permanent password and account before completing their first purchase. (Account creation can be offered on the order confirmation screen with a single click).
2. **Transparent Upfront Costs**: Display estimated shipping and taxes early; never shock the customer with a $15 mystery fee on the final submit screen.
3. **Single-Page or 3-Step Accordion Flow**:
   $$\text{1. Shipping Address} \longrightarrow \text{2. Delivery Method} \longrightarrow \text{3. Secure Payment}$$
4. **Trust Badges**: Norton/McAfee secure encryption badges, accepted payment method icons (Visa, Mastercard, Amex, PayPal, Klarna).

---

## 5. Mobile Commerce Ergonomics

- **Sticky Bottom Add-to-Cart Bar**: When the user scrolls past the primary PDP buy box on mobile, affix a compact sticky bar to the bottom of the screen containing the product title, price, and a full-width `"Add to Cart"` button.
- **Touch-Friendly Variant Swatches**: Color and size chips must be at least `44×44px` to prevent mis-taps.

---

## 6. Critical E-Commerce Anti-Patterns

1. **The Hidden Shipping Cost Ambush**: Concealing shipping fees until the absolute final payment button, driving immediate cart abandonment.
2. **Forced Account Registration**: Blocking checkout until a customer verifies an email link and creates a complex password.
3. **The Microscopic Size Selector**: Tiny 20px size buttons on mobile that frustrate users trying to select medium vs large.
4. **Sneak-into-Basket Traps**: Automatically checking a box that adds a $4.99 "extended warranty" or "carbon offset" to the cart without explicit user consent (unethical dark pattern).
5. **No Stock Status Visibility**: Allowing a customer to add an item to their cart, only to announce it is backordered on the payment page.

---

## 7. Pre-Ship E-Commerce Quality Checklist

- [ ] Does the product page offer clear variant selectors with out-of-stock indicators?
- [ ] Is shipping and return policy transparently stated before the checkout step?
- [ ] Is Guest Checkout explicitly available without forced account creation?
- [ ] Does mobile view feature a sticky Add-to-Cart bar and large touch targets?
- [ ] Does the mini-cart drawer provide clear quantity controls and a free shipping threshold meter?
- [ ] Are all prices, discounts, and totals mathematically consistent and free of hidden fees?
