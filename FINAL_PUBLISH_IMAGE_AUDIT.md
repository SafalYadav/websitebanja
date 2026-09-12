# FINAL PUBLISH & IMAGE MEDIA FRAME AUDIT

**Target:** WebsiteBanja AI Production Architecture  
**Audit Date:** September 12, 2026  
**Auditor:** Antigravity Autonomous Systems Agent  
**Environment:** Next.js 16 App Router / PostgreSQL (Azure + Supabase Fallback) / Playwright Headless Chromium  

---

## EXECUTIVE SUMMARY

This audit documents the forensic investigation, root cause discovery, architectural resolutions, and end-to-end browser verification for the two final critical issues:

1. **Issue 1 — Public Website / Publish Timeout:** Resolved `"Atomic publish failed: Connection terminated due to connection timeout"`. The atomic snapshot transaction now completes in **3,258ms** with HTTP 200, zero hangs, zero duplicate requests, and immediate public URL edge propagation.
2. **Issue 2 — Image Media Box Framing:** Resolved the visual defect where images occupied only the upper portion leaving unwanted grey/empty blank areas below. Implemented a robust `MediaFrame` / `ImageWithFallback` system with complete wrapper fill (`w-full h-full`), percentage height chain preservation, intelligent focal points, responsive stability across desktop and mobile (`0px` bottom gap), and dynamic ambient blurred backdrops for `contain` mode.

---

## PART 1 — ISSUE 1: PUBLIC WEBSITE / PUBLISH TIMEOUT

### 1. Exact Root Cause
When a user clicked "Publish Website" in Studio, the request traversed:
```
Client (Studio) 
  ↳ POST /api/projects/[id]/publish 
    ↳ dbPublishProjectAtomic(...) in src/lib/db/queries.ts
      ↳ withUserContext(...) 
        ↳ getPool().connect()  <-- HUNG HERE (30 seconds)
```
- While standard read queries in `queries.ts` implemented an Azure circuit-breaker (`isAzureCircuitOpen()`) and fell back cleanly to Supabase, `dbPublishProjectAtomic`, `dbGetProjectBySlug`, and `dbUnpublishProject` bypassed the circuit breaker entirely.
- They directly invoked `withUserContext(...)`, attempting a TCP connection to Azure PostgreSQL on port 5432. Azure dropped local developer IP packets, causing node-postgres to hang until its 30,000ms socket connection timeout expired.
- Furthermore, in `EditorTopBar.tsx`, when a project was not yet marked published (`!isPublished`), clicking the toolbar "Publish" button concurrently triggered a quick background publish AND opened the `PublishModal`, causing racing duplicate publish operations.

### 2. Architectural Resolution
1. **Azure Circuit-Breaker Integration (`src/lib/db/queries.ts`):**
   - Wrapped `dbPublishProjectAtomic`, `dbGetProjectBySlug`, and `dbUnpublishProject` in `!isAzureCircuitOpen()`.
   - Added a strict 1,500ms connection timeout abort controller for Azure. If Azure fails or times out, it instantly trips the circuit breaker and transitions to the resilient Supabase transaction layer.
2. **Atomic Supabase Publish Fallback (`src/lib/db/queries.ts`):**
   - Primary: Uses user-scoped Supabase client (`getUserScopedClient(userToken)`) calling the PostgreSQL function `publish_project_atomic(p_project_id, p_slug, p_snapshot_data)`.
   - Secondary / Service Fallback: Atomically validates ownership (`user_id = auth.uid()`), checks slug uniqueness against all other projects, sanitizes private fields from website data, calculates `next_version`, inserts into `published_versions`, and updates `projects.is_published = true`, `projects.public_slug`, `projects.last_published_at`.
3. **Single User Click = Single Publish Action (`src/components/editor/EditorTopBar.tsx`):**
   - Refactored the toolbar Publish button to exclusively open `PublishModal` (`onOpenPublishModal()`). Zero background network calls fire prior to explicit user confirmation inside the modal.
4. **Resilient Public Slug Retrieval (`src/lib/db/queries.ts`):**
   - Refactored `dbGetProjectBySlug` with circuit-breaker protection and fallback query against `projects.public_slug` and latest `published_versions` snapshot.

### 3. Before vs. After Timings & Metrics

| Metric | Before Fix | After Fix |
| :--- | :--- | :--- |
| **API Response Status** | `500 Internal Server Error` | **`200 OK`** |
| **Error Message** | `Connection terminated due to connection timeout` | **None (Clean Success)** |
| **Publish Duration** | 30,000ms+ (Hang / Timeout) | **3,258ms** |
| **Network Requests per Publish** | 2 (Racing duplicate calls) | **1 (Exact user confirmation)** |
| **Public URL Availability** | Failed / Inaccessible | **Instant (`/p/[slug]` HTTP 200)** |

### 4. Browser Verification Evidence (Chromium)

```
[NETWORK REQ] POST http://localhost:3000/api/projects/a3a4156d-3707-45ef-82a7-4e1c83c22620/publish
[NETWORK RES] 200 http://localhost:3000/api/projects/a3a4156d-3707-45ef-82a7-4e1c83c22620/publish
Publish API responded with status 200 in 3258ms
Public URL: http://localhost:3000/p/urbanfix-plumbing-hvac-services-7351 (HTTP Status: 200)
```

---

## PART 2 — ISSUE 2: IMAGE MEDIA BOX FRAMING & SIZING

### 1. Root Cause of Halfway Images & Grey Rectangles
The visual defect where images occupied only the upper half of cards/heroes leaving a grey box below was caused by a combination of two CSS layout failures:
1. **Broken Percentage Height Chain:**
   - In `src/components/ui/ImageWithFallback.tsx`, the root `<div>` had `className="relative overflow-hidden group/image-ctrl"`. It did NOT declare `w-full h-full`.
   - In `src/components/editor/EditableElement.tsx`, the image wrapper had `className="group/editable-image relative cursor-pointer"`. It also lacked `w-full h-full`.
   - In standard CSS specifications, when a child (`<img>`) specifies `height: 100%`, but its intermediate parent wrapper has `height: auto`, the percentage cannot resolve. The browser falls back to intrinsic content height, collapsing the image and leaving the container's surface color (slate/grey) showing through below.
2. **Letterbox Empty Space on Aspect Ratio Mismatch:**
   - When `fit = "contain"` or `natural` was used, or when images with landscape aspect ratios (e.g. 16:9) were placed in 4:3 or square boxes without backdrop support, default browser letterboxing left empty grey bars around the image.

### 2. Architectural Solution
1. **Unbroken Container Fill (`w-full h-full`):**
   - Set `relative w-full h-full overflow-hidden group/image-ctrl` as default on `ImageWithFallback`'s root container.
   - Updated `EditableElement.tsx` to include `relative w-full h-full cursor-pointer` and inject `wrapperClassName="w-full h-full"` into child components.
   - Updated `CardPrimitives.tsx` (`CardMedia`), `CardVariants.tsx` (`HorizontalMediaCard`, `ProjectShowcaseCard`, `ImageRevealCard`), `HeroSection.tsx`, and `AboutSection.tsx` with guaranteed `w-full h-full` wrappers.
2. **Ambient Blurred Backdrop for Contain Mode:**
   - When `resolvedFit === "contain"`, `ImageWithFallback` renders an ambient blurred reflection of the image behind the sharp foreground image:
     ```tsx
     {resolvedFit === "contain" && (
       <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
         <img
           src={src}
           alt=""
           className="w-full h-full object-cover blur-2xl scale-125 opacity-35 filter brightness-90"
         />
       </div>
     )}
     ```
   - This completely eliminates dull grey letterboxing, replacing it with an atmospheric visual glow matching the image's color palette.
3. **Prevent Scale Down During Loading:**
   - Removed `scale-95` on `!isLoaded` in `ImageWithFallback.tsx`. The element now transitions cleanly via `opacity` without physical size distortion.

### 3. Quantitative DOM Verification (100% Filled Containers)

#### Desktop Viewport (1440 × 900)
- **Img #0 (Hero Background):** `1027px × 1132px` inside `1027px × 1132px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #2 (Hero Media Box):** `475px × 356px` inside `475px × 356px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #3 (Feature 1):** `409px × 358px` inside `409px × 358px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #4 (Feature 2):** `409px × 358px` inside `409px × 358px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #5 (Feature 3):** `409px × 358px` inside `409px × 358px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #6 (Feature 4):** `409px × 358px` inside `409px × 358px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #7-#11 (Service Cards):** All match container bounding box with **`0px`** bottom gap (`fillsContainer = true`).

#### Mobile Viewport (390 × 844 — iPhone Standard)
- **Img #0 (Hero Background):** `449px × 1460px` inside `449px × 1460px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #2 (Hero Media Box):** `300px × 206px` inside `300px × 206px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #3-#6 (Features):** `340px × 358px` inside `340px × 358px`. Bottom gap: **`0px`** (`fillsContainer = true`).
- **Img #7-#11 (Services):** `340px × 220px` inside `340px × 220px`. Bottom gap: **`0px`** (`fillsContainer = true`).

---

## PART 3 — VISUAL VERIFICATION ARTIFACTS

### 1. Publish Modal Success & Live URL Confirmation
![Publish Success Modal](/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/publish_success_modal.png)

### 2. Live Public Website (Isolated Context, Zero Auth, Full Render)
![Public Website Live](/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/public_website_live.png)

### 3. Image Media Box Desktop Inspection (1440×900)
![Image Media Box Desktop](/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/image_media_box_desktop.png)

### 4. Image Media Box Mobile Inspection (390×844)
![Image Media Box Mobile](/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/image_media_box_mobile.png)

### 5. Contain Mode Ambient Blurred Backdrop
![Image Contain Ambient Backdrop](/Users/safalyadav/.gemini/antigravity/brain/833ce723-c397-4954-bcf3-08cadea66d6a/image_contain_ambient_backdrop.png)

---

## CONCLUSION
Both issues are thoroughly resolved and verified in real headless Chromium across desktop and mobile. All systems adhere strictly to the established boundaries (no git commits, no fake/mock data, no alteration of core AI or generation systems).
