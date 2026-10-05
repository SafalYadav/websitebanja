# Google Maps generation continuation — 2026-10-03

## Implemented paths

- `automation/pipelineOrchestrator.ts` and `outreach/personalizationEngine.ts` now invoke `canonicalGenerationOrchestrator.generateWebsite()` rather than bypassing final validation.
- The canonical orchestrator resolves stored leads before grounding, propagates the Google source ID and tenant, rejects mismatched profiles, and rejects non-READY validation after repairs.
- `groundedIntelligenceService.researchBusiness()` → `GooglePlacesSource.groundBusiness()` uses exact Place Details for supplied IDs. Failed/mismatched IDs cannot fall back to a different business. Ambiguous text results require selection. Legacy cached profiles without Google identity evidence are not accepted for exact-ID requests.
- `groundedAssetSelector` → `applyGroundedAssetsToWebsite` → `ReviewsSection` retains actual ratings, removes fabricated fallback testimonials, and renders author links. Neutral asset selection clears unrelated template images. Selected Google photo credits are passed to `WebsiteRenderer`.
- `/api/public/places-photo` validates resource names and dimensions, keeps credentials in request headers, times out upstream requests, avoids caching expiring photo redirects, and returns an error rather than a fake verified image when unconfigured.
- Outreach no longer fabricates a successful localhost preview after generation failure.

## Verification

- `npx tsc --noEmit`: passed.
- `node tests/google_places_identity.test.mjs`: passed; mocked regression coverage for no fuzzy fallback, wrong identity, real rating preservation, photo metadata, omitted-field diagnostics, dimension rejection, credentials, redirect caching, and missing configuration.
- `node tests/verify_permanent_generation_quality.mjs`: passed across five deterministic business fixtures. The suite now explicitly mocks Google and isolates fixture tenants rather than accepting stale cached profiles as live proof.
- Live application-adapter request using configured credentials for `ChIJubbC31KxbTkRuSCIa3GCkrY`: returned `Jaipur Bike Rental - Bike on Rent`; photos and reviews fields were both omitted. This is not evidence of a billing/SKU problem. Real-photo display and real-review display remain unverified for that business.
- Live canonical pipeline with the same Place ID: `success: true`, `status: READY`, final validation `READY`; local preview `/preview/prev_jaipur-bike-rental-bike-on-rent_f942ef27`. Google photo/review counts remained zero. Telemetry reported Azure PostgreSQL configuration missing; this run does not verify database persistence.

## Scope and remaining evidence

The regenerated preview `/preview/prev_jaipur-bike-rental-bike-on-rent_4fec9779` loaded successfully in the browser. Browser inspection caught invented FAQ/About 5/5 defaults, which were removed and rechecked. Subsequent fixes remove unsupported industry feature guarantees and reject generic scraped headings as service evidence. Existing generated previews are snapshots; these latter changes require regeneration and do not rewrite historical previews.

These checks do not certify database writes, workspace storage, full visual/content quality, deployment, or sending outreach. Synthetic tests do not establish live Google media availability. No outreach was sent and no website was published. Existing unrelated worktree deletions were preserved.
