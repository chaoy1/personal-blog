# Animation & Visual Enhancement Plan

> **For agentic workers:** Implement this plan task-by-task in priority order. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is independently shippable; do not bundle tasks into one change.

**Goal:** Enhance the site's animation polish, perceived performance, and visual hierarchy without altering the established ink-painting aesthetic or the public homepage composition.

**Architecture:** Keep the current App Router page structure and the existing canvas/CSS animation layers. All changes are additive refinements to existing components and stylesheets; no new runtime dependencies, no external services, no redesign.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Canvas 2D, Vitest.

**Aesthetic constraint (applies to every task):** Animations must stay restrained and ink-painting-flavored — they appear only when useful, never compete with content, and always honor `prefers-reduced-motion` and the existing `useAmbientMotion` policy.

---

## Global Constraints

- Do not replace the public homepage composition, the qianli-bridge background, or the maple-leaf system identity.
- All ambient motion must respect `shouldRunAmbientMotion` (visibility, reduced-motion, save-data) and `useAmbientMotion`.
- At 390px width, `document.body.scrollWidth <= window.innerWidth` on every public page after changes.
- No external service or runtime dependency for motion, weather, themes, or images.
- CSS `will-change` must be bounded: apply it only during active animation and let it drop after completion where feasible.
- Dark-theme variables must be updated in parallel with light-theme variables for every visual change.

---

## Priority Overview

| Priority | Task | Domain | Est. |
|---|---|---|---|
| P0 | Task 1 | Canvas performance: glow textures pre-rendered | 0.5 day |
| P0 | Task 2 | Canvas performance: adaptive particle degradation | 0.5 day |
| P0 | Task 3 | backdrop-filter audit & compositing cleanup | 2 hours |
| P1 | Task 4 | Route transition ink animation | 4 hours |
| P1 | Task 5 | Card micro-interaction polish | 2 hours |
| P1 | Task 6 | Typography: drop cap + heading ornaments | 1 hour |
| P2 | Task 7 | Auto day/night theme by time | 2 hours |
| P2 | Task 8 | Background parallax layers (desktop only) | 3 hours |
| P2 | Task 9 | Season-aware palette | 2 hours |
| P3 | Task 10 | Immersive reading mode (nav auto-hide) | 3 hours |
| P3 | Task 11 | Lightbox thumbnail-origin transition | 3 hours |
| P3 | Task 12 | LQIP progressive image loading | 4 hours |

---

### Task 1: Pre-render glow gradients to texture canvases

**Domain:** Canvas performance (P0)

**Files:**
- Modify: `components/StarryNight.tsx`
- Modify: `components/QianliAmbient.tsx`

**Rationale:** `StarryNight` creates multiple `createRadialGradient` objects per frame for bright-star halos, the moon halo, and firefly glows; `QianliAmbient` does the same for mist wisps. Gradient creation per frame allocates and prevents image caching.

**Approach:**
- At effect setup, render each glow type (star halo, moon halo, firefly, mist wisp) once into an off-screen `<canvas>` texture of fixed size (e.g. 64×64 or 128×128).
- Per frame, replace `ctx.createRadialGradient` + `fillStyle=gradient` + `fill` with `ctx.globalAlpha` + `ctx.drawImage(texture, x - s, y - s, s * 2, s * 2)`.
- Alpha still varies per frame via `globalAlpha`; hue stays fixed per texture.

- [ ] **Step 1: Extract glow texture builder**
  - Add a module-local helper `makeGlowTexture(colorStops: [number, string][], size: number): HTMLCanvasElement`.
- [ ] **Step 2: Migrate StarryNight**
  - Bright-star halo, moon halo, and firefly glow render into textures at setup; frame loop uses `drawImage`.
- [ ] **Step 3: Migrate QianliAmbient**
  - Mist-wisp radial gradients become textures at setup.
- [ ] **Step 4: Verify visually**
  - Both backgrounds must look pixel-identical to before at a normal desktop viewport; confirm reduced-motion fallback still renders nothing (unchanged behavior).

---

### Task 2: Adaptive particle degradation

**Domain:** Canvas performance (P0)

**Files:**
- Modify: `components/StarryNight.tsx`
- Modify: `components/MapleLeaves.tsx`
- Modify: `components/QianliAmbient.tsx`

**Approach:**
- Track a rolling average of frame `dt` per component. When avg dt > 33ms (28fps) sustained for ~60 frames, halve the particle count for stars/fireflies/leaves/dusts. When avg dt > 50ms, drop to a quarter.
- Degradation is one-way per session (never restore mid-session) to avoid oscillation.
- Keep `reduced-motion` behavior untouched.

- [ ] **Step 1: Add `useAdaptiveQuality` helper (module-local per component or shared in `components/`)**
  - Returns a `quality: 1 | 0.5 | 0.25` multiplier from frame timings.
- [ ] **Step 2: Apply multiplier**
  - Star count, firefly count, dust count in `StarryNight`/`QianliAmbient`; leaf count in `MapleLeaves` multiply by `quality` at resize/spawn.
- [ ] **Step 3: Verify**
  - Force low frame rate in DevTools (CPU throttling) and confirm counts shrink and fps recovers.

---

### Task 3: backdrop-filter audit & compositing cleanup

**Domain:** CSS performance (P0)

**Files:**
- Modify: `app/globals.css`

**Rationale:** `backdrop-filter: blur()` appears on `.site-nav`, `.item`, `.article`, `.page-intro`, `.verse`, `.sigil`, `.hero-stats`, `.daily-quote`, `.tl-date`, `.reading-companion`, `.timeline-more-wrap .btn`, and layered card backgrounds. Each samples the entire backdrop and can force extra composite layers.

**Approach:**
- Keep backdrop blur only where true translucency is the design intent: `.site-nav`, `.tl-date`, `.timeline-more-wrap .btn`, `.article-nav` (floating paper).
- Remove backdrop blur from fully opaque cards (`.item`, `.article`, `.page-intro`, `.hg-item`, `.hm-card`, comments); compensate with the existing `--card-bg` opacity plus stronger `box-shadow` for separation.
- `.verse`/`.sigil`/`.hero-stats`/`.daily-quote` capsules: replace `backdrop-filter` with a slightly more opaque `background-color` (they sit over the painting but are small).

- [ ] **Step 1: Inventory and patch globals.css**
- [ ] **Step 2: Verify visual parity**
  - Compare before/after screenshots at desktop and 390px; ink cards must keep their paper texture, floating controls keep translucency.
- [ ] **Step 3: Confirm reduced composite layers**
  - DevTools Layers panel: fewer layers during scroll on the home page list.

---

### Task 4: Route transition ink animation

**Domain:** Navigation animation (P1)

**Files:**
- Modify: `app/layout.tsx` (or a new `components/PageInkTransition.tsx`)
- Modify: `app/globals.css`

**Approach:**
- Implement a lightweight transition wrapper keyed on `usePathname()`: on route change, the outgoing page fades with a top-edge brush wipe (`clip-path: inset(0 0 0 0)` → `inset(100% 0 0 0)`) for ~250ms; the incoming page rises with `translateY(14px) → 0` + `blur(2px) → 0` for ~300ms.
- Use CSS classes toggled in a client component; no router event patching of Next internals.
- Disable under reduced-motion and when `useAmbientMotion() !== true`; fall back to instant swap.
- Keep total motion under 350ms.

- [ ] **Step 1: Create `PageInkTransition` client component**
  - Observes `pathname`, manages `ink-exit` / `ink-enter` classes around `children`.
- [ ] **Step 2: Add CSS keyframes**
  - `@keyframes ink-wipe-exit` and `@keyframes ink-rise-enter`; both wrapped in the project's existing reduced-motion guard.
- [ ] **Step 3: Wire into `app/layout.tsx`**
  - Wrap `{children}` without changing server component contract.
- [ ] **Step 4: Verify**
  - Navigate between `/`, `/posts`, `/moments`, `/album`; exit animation ≤ 350ms and no layout shift of sticky nav.

---

### Task 5: Card micro-interaction polish

**Domain:** Interaction animation (P1)

**Files:**
- Modify: `app/globals.css`

**Approach (each is a small independent CSS change):**
- Post card seal (`.tag-seal`): add a 2px X-axis rebound keyframe at
  animation end using `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- Post title underline (`.post-title::after`): transition color from `--seal` to `--seal-deep` alongside scaleX.
- Card paper texture: on `.item:hover`, shift `background-position` by 2px to suggest paper stirred by wind.
- Read button (`.read::after` arrow): on hover, run fly-out/fly-in keyframe (`translateX(0)` → `translateX(8px)` fade → `translateX(-8px)` → settle).
- Timeline dots (`.tl-dot`): on reveal (`is-in`), stamp effect: scale from 1.4 → 1 + 2px downward settle.
- Hero stats numbers: count-up from 0 on first viewport entry via existing IO pattern (JS, one-shot), `easeOutExpo` easing, duration ~900ms; skip entirely when `useAmbientMotion() !== true`.
- Form focus: extend existing focus states with `box-shadow: 0 0 0 3px var(--glow)`.
- `.btn:active`: ink-bleed radial background pulse from press point (CSS-only approximation acceptable).

- [ ] **Step 1: CSS micro-interactions in globals.css**
- [ ] **Step 2: Count-up for `.hero-stats` numbers**
  - Modify `app/page.tsx` hero-stats markup minimally (wrap `<b>` counts); add small client hook or reuse ScrollFX IO.
- [ ] **Step 3: Verify each micro-interaction in isolation and dark theme**

---

### Task 6: Typography — drop cap & heading ornaments

**Domain:** Visual hierarchy (P1)

**Files:**
- Modify: `app/globals.css`

**Approach:**
- `.md-body > p:first-of-type::first-letter`: KaiTi, ~2.8em, `var(--seal)`, float left, tight right margin; ensure it only styles the article body (not excerpts or previews) and degrades gracefully for paragraphs starting with non-letter characters.
- `.md-body h2::after`: a small rotated diamond `◆` in `--seal` after heading text, `inline-block`, 45° rotate, offset by `0.5em`.
- Excerpt lead: `.article-excerpt` keeps existing left rule; add a slightly larger first-line indent rhythm (1.05 line-height nudge) for breathing.

- [ ] **Step 1: Implement drop cap and h2 ornament in globals.css**
- [ ] **Step 2: Verify in both themes, mobile 390px, and inside admin preview pane**

---

### Task 7: Auto day/night theme by time

**Domain:** Theme behavior (P2)

**Files:**
- Modify: `app/layout.tsx` (bootstrap script)
- Modify: `components/ThemeToggle.tsx`

**Approach:**
- Extend theme storage values: `'light' | 'dark' | 'auto'`. Default for new visitors: `'auto'`.
- `auto` resolves by simple local heuristic: day hours 06:00–18:00 → light; else dark. No geolocation, no API.
- ThemeToggle cycles light → dark → auto; knob shows a hybrid half-sun/half-moon state for `auto` (CSS only).
- Resolution re-evaluates on `visibilitychange` and every 15 minutes; switching themes cross-fades via existing color transitions.

- [ ] **Step 1: Update bootstrap script in layout.tsx to resolve `auto` at paint time (no FOUC).**
- [ ] **Step 2: Update ThemeToggle tri-state cycle and icon state.**
- [ ] **Step 3: Persist `'auto'` to localStorage; honor existing stored `'light'`/`'dark'`.**
- [ ] **Step 4: Test all three states and transitions.**

---

### Task 8: Background parallax layers (desktop only)

**Domain:** Background depth (P2)

**Files:**
- Modify: `components/BackgroundStage.tsx` (split layers)
- Modify: `app/globals.css`

**Approach:**
- Keep current single `bg-painting` as the base. Add two pseudo-layers clipped from the same artwork via `background-position` tricks (far ridge tint layer, near-tree silhouette layer) — no new image assets.
- Desktop fine-pointer only: translate layers at `scrollY * 0.06` and `scrollY * 0.12` via `transform: translate3d`, rAF-throttled using the existing ScrollFX scroll handler pattern.
- Disabled under reduced-motion, save-data, coarse pointers, and < 1080px width.

- [ ] **Step 1: CSS layer definitions with `data-parallax` hooks in globals.css.**
- [ ] **Step 2: JS driver inside BackgroundStage gated on `supportsFinePointer()` and `useAmbientMotion() === true`.**
- [ ] **Step 3: Verify no jank at 60fps and clean disable on mobile/reduced-motion.**

---

### Task 9: Season-aware palette

**Domain:** Theming (P2)

**Files:**
- Modify: `app/layout.tsx` (bootstrap script sets `data-season`)
- Modify: `app/globals.css`

**Approach:**
- Bootstrap script sets `document.documentElement.dataset.season` from month: 3–5 `spring`, 6–8 `summer`, 9–11 `autumn`, 12/1/2 `winter`.
- CSS: `[data-season='spring']` etc. override a small curated subset: `--glow`, `--c-wm`, `--c-wm-hover`, hero `.branch` leaf color, daily-quote border tint. Autumn maps to current values (no-op default).
- No changes to maple sprites or painting imagery in this task.

- [ ] **Step 1: Bootstrap `data-season` in layout.tsx.**
- [ ] **Step 2: Curate variable overrides per season in globals.css (light and dark themes both).**
- [ ] **Step 3: Verify each season via DevTools forced attribute.**

---

### Task 10: Immersive reading mode (nav auto-hide)

**Domain:** Reading UX (P3)

**Files:**
- Modify: `components/SiteNav.tsx`
- Modify: `app/globals.css`

**Approach:**
- On article pages only (`/posts/[slug]`): hide `.site-nav` via `transform: translateY(-100%)` after scrolling down past 200px, reveal on any upward scroll; CSS transition ~300ms.
- `ReadingCompanion` rail keeps sticky behavior; when nav is hidden, reading-progress bar slides to `top: 0` (CSS variable driven).
- Only on fine-pointer viewports ≥ 1080px; never on admin paths.

- [ ] **Step 1: Scroll-direction tracker in SiteNav (rAF-throttled, follows existing ScrollFX pattern).**
- [ ] **Step 2: CSS transitions for `.site-nav.nav-hidden` and `.reading-progress` offset variable.**
- [ ] **Step 3: Verify on long article; no overlap, no layout jump.**

---

### Task 11: Lightbox thumbnail-origin transition

**Domain:** Lightbox animation (P3)

**Files:**
- Modify: `components/Lightbox.tsx`
- Modify: `app/globals.css`

**Approach:**
- On open, capture the clicked image's `getBoundingClientRect()`. Mount the lightbox image at that rect (position: fixed), then FLIP-animate to the centered target: `translate` + `scale` over ~380ms with `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- On close, reverse the FLIP to the opener rect (if still connected), else fall back to fade.
- Preserve all existing a11y: focus trap, Escape, aria-modal, opener focus restore.
- Skip FLIP under reduced-motion (keep current fade only).

- [ ] **Step 1: Implement FLIP open/close in Lightbox.tsx.**
- [ ] **Step 2: CSS: replace `lightbox-pop` usage with FLIP-driven inline transforms; keep fade as fallback.**
- [ ] **Step 3: Verify from `.md-body img`, `.album-item img`, `.tl-thumb`, and `moment-images`.**

---

### Task 12: LQIP progressive image loading

**Domain:** Perceived loading (P3)

**Files:**
- Modify: `components/PostList.tsx` / album renderers as applicable
- Modify: `app/globals.css`
- (Optional) New: `scripts/` utility to pre-generate placeholders for existing Supabase assets

**Approach:**
- Store a tiny (≤ 24px wide) blurred placeholder URL (Supabase transform or pre-generated webp) alongside each photo record when possible; otherwise derive client-side from the public URL with low-quality query params if the backend supports it.
- Render placeholder blurred-up (`filter: blur(8px); transform: scale(1.05)`) as the base layer; full image fades in on `load` via `opacity` transition.
- If placeholder generation is not feasible for existing data, keep this task to CSS infrastructure only and apply the pattern to future uploads.

- [ ] **Step 1: Decide placeholder strategy from Supabase capabilities (read `app/api/admin/upload/route.ts`).**
- [ ] **Step 2: Implement image wrapper with progressive fade in globals.css + relevant components.**
- [ ] **Step 3: Verify on album grid with network throttling.**

---

## Out of Scope

- Keyboard shortcut enhancements beyond the existing Ctrl/Cmd+K search.
- Weather-API-driven ambient effects.
- WebGL/Three.js backgrounds.
- Any redesign of the admin console animations (admin stays utilitarian).
