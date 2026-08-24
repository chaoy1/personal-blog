# Public Site Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current public visual identity while fixing the first-visit scroll animation, mobile overflow, performance, SEO, and accessibility.

**Architecture:** Keep the current App Router page structure. Extract deterministic motion and SEO helpers for unit testing, then apply narrowly scoped CSS and component changes; visual acceptance uses the existing site as the reference rather than a redesign.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest, Testing Library, Supabase.

**Spec:** `docs/superpowers/specs/2026-08-18-complete-site-refinement-design.md`

## Global Constraints

- Do not replace the public homepage composition or visual identity.
- The full unfold plays once per browser per animation version; reduced-motion users see only the final state.
- At 390px width, `document.body.scrollWidth <= window.innerWidth` on every public page.
- Do not add an external service or runtime dependency for SEO, motion, or analytics.

---

### Task 1: Test foundation and motion policy

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `lib/motion-policy.ts`
- Test: `tests/motion-policy.test.ts`

**Interfaces:**
- Produces: `shouldRunAmbientMotion(input: MotionPolicyInput): boolean`
- Produces: `shouldPlayFullUnfold(input: UnfoldPolicyInput): boolean`
- Produces: `UNFOLD_VERSION_KEY: string`

- [ ] **Step 1: Install and configure the test runner**

Run: `npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom`

Add scripts `"test": "vitest run"` and `"test:watch": "vitest"`. Configure `vitest.config.ts` with `environment: 'jsdom'`, alias `@` to the project root, and `setupFiles: ['./tests/setup.ts']`.

- [ ] **Step 2: Write failing policy tests**

```ts
expect(shouldRunAmbientMotion({ visible: false, reduced: false, saveData: false })).toBe(false)
expect(shouldRunAmbientMotion({ visible: true, reduced: true, saveData: false })).toBe(false)
expect(shouldRunAmbientMotion({ visible: true, reduced: false, saveData: false })).toBe(true)
expect(shouldPlayFullUnfold({ reduced: false, storedVersion: null })).toBe(true)
expect(shouldPlayFullUnfold({ reduced: false, storedVersion: UNFOLD_VERSION_KEY })).toBe(false)
```

- [ ] **Step 3: Verify failure**

Run: `npm test -- tests/motion-policy.test.ts`
Expected: FAIL because `lib/motion-policy.ts` does not exist.

- [ ] **Step 4: Implement the pure policies**

```ts
export const UNFOLD_VERSION_KEY = 'scroll-unfold:v2'
export type MotionPolicyInput = { visible: boolean; reduced: boolean; saveData: boolean }
export type UnfoldPolicyInput = { reduced: boolean; storedVersion: string | null }
export const shouldRunAmbientMotion = (v: MotionPolicyInput) => v.visible && !v.reduced && !v.saveData
export const shouldPlayFullUnfold = (v: UnfoldPolicyInput) => !v.reduced && v.storedVersion !== UNFOLD_VERSION_KEY
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/motion-policy.test.ts`
Expected: PASS.

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts lib/motion-policy.ts tests/motion-policy.test.ts
git commit -m "test: add motion policy coverage"
```

### Task 2: First-visit scroll unfold

**Files:**
- Modify: `components/ScrollUnfold.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Test: `tests/scroll-unfold.test.tsx`

**Interfaces:**
- Consumes: `shouldPlayFullUnfold`, `UNFOLD_VERSION_KEY`
- Produces: full state class `unfold-live`; repeat state class `unfold-returning`

- [ ] **Step 1: Write failing component tests**

Render `ScrollUnfold` with empty local storage and assert `.scroll-unfold` exists. Store `UNFOLD_VERSION_KEY`, render again, and assert the overlay is absent while `document.documentElement` receives `unfold-returning`. Mock reduced motion and assert neither moving state is added.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/scroll-unfold.test.tsx`
Expected: FAIL because the component still uses `sessionStorage` and the old timing.

- [ ] **Step 3: Implement the revised lifecycle**

Use constants `UNFOLD_DURATION_MS = 3000` and `CONTENT_COMPLETE_MS = 4200`. Read/write `localStorage` with `UNFOLD_VERSION_KEY`; remove both root classes during cleanup. Preload `/bg/qianli-bridge.jpg` in `app/layout.tsx` and start after one animation frame once the document is interactive.

- [ ] **Step 4: Retune CSS layers**

Set the rod/paper reveal to 3 seconds with a custom cubic-bezier curve; stagger content beginning at 65% progress; use only transforms and opacity for moving layers. Add a 600ms returning fade and a reduced-motion rule that disables every unfold animation.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/scroll-unfold.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/ScrollUnfold.tsx app/globals.css app/layout.tsx tests/scroll-unfold.test.tsx
git commit -m "feat: refine first-visit scroll unfold"
```

### Task 3: Mobile containment and public readability

**Files:**
- Modify: `app/globals.css`
- Modify: `app/refinement.css`
- Modify: `app/studio.css`
- Modify: `components/SiteNav.tsx`
- Modify: `components/MarkdownView.tsx`
- Modify: `components/ReadingCompanion.tsx`
- Modify: `components/Lightbox.tsx`
- Test: `tests/site-nav.test.tsx`
- Test: `tests/reading-ui.test.tsx`

**Interfaces:**
- Produces: keyboard-safe mobile menu using the existing `menuOpen` state.

- [ ] **Step 1: Write failing navigation tests**

Test that opening the mobile menu focuses its first link, Tab remains inside the menu, Escape closes it, and focus returns to the toggle. Test that reading progress has a text alternative, Lightbox restores focus after Escape, and Markdown tables receive a scrollable region label.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/site-nav.test.tsx tests/reading-ui.test.tsx`
Expected: FAIL because focus is not moved or restored.

- [ ] **Step 3: Implement focus management**

Add refs for the toggle and panel, focus the first link on open, trap Tab between visible focusable elements, and restore focus on close. Preserve current route-closing and body scroll locking.

Update the reading companion with `aria-valuenow`/`aria-valuetext`, wrap Markdown tables in a labelled horizontal region, and return Lightbox focus to the image that opened it.

- [ ] **Step 4: Consolidate responsive CSS**

At `max-width: 720px`, constrain `.wrap`, `.home-hero`, `.masthead`, `.hero-stats`, `.daily-quote`, `.mobile-nav-panel`, tables, code, and media to the viewport. Hide the two off-canvas vertical decorations instead of leaving them at negative/right-edge coordinates. Use `overflow-wrap:anywhere` for long URLs and table wrappers for Markdown tables.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/site-nav.test.tsx tests/reading-ui.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

Browser checks at 390×844: `/`, `/posts`, one article, `/moments`, `/album`, `/timeline`, `/guestbook`, `/about`, `/login`, `/account`; assert no horizontal scrollbar.

```bash
git add app/globals.css app/refinement.css app/studio.css components/SiteNav.tsx components/MarkdownView.tsx components/ReadingCompanion.tsx components/Lightbox.tsx tests/site-nav.test.tsx tests/reading-ui.test.tsx
git commit -m "fix: contain public layouts on mobile"
```

### Task 4: Ambient performance policy

**Files:**
- Modify: `components/BackgroundStage.tsx`
- Modify: `components/StarryNight.tsx`
- Modify: `components/MapleLeaves.tsx`
- Modify: `components/QianliAmbient.tsx`
- Modify: `components/ScrollFX.tsx`
- Test: `tests/background-stage.test.tsx`

**Interfaces:**
- Consumes: `shouldRunAmbientMotion`
- Produces: ambient effects that pause when hidden, reduced-motion, or data-saving.

- [ ] **Step 1: Write failing tests**

Mock `document.visibilityState`, `matchMedia`, and `navigator.connection.saveData`; assert particles are omitted when any stop condition is true and rendered when all conditions allow motion.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/background-stage.test.tsx`
Expected: FAIL because visibility and save-data are not considered.

- [ ] **Step 3: Implement shared policy use**

Subscribe to `visibilitychange`, reduced-motion changes, and theme changes in `BackgroundStage`; pass `active` to ambient children. Cancel animation frames and Web Animations handles when inactive. Skip pointer tracking on touch-only devices.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/background-stage.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/BackgroundStage.tsx components/StarryNight.tsx components/MapleLeaves.tsx components/QianliAmbient.tsx components/ScrollFX.tsx tests/background-stage.test.tsx
git commit -m "perf: pause ambient effects when inactive"
```

### Task 5: Public form feedback and accessibility

**Files:**
- Modify: `components/Comments.tsx`
- Modify: `components/CommentThread.tsx`
- Modify: `app/guestbook/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/account/page.tsx`
- Test: `tests/public-forms.test.tsx`

**Interfaces:**
- Produces: consistent form state labels `idle`, `submitting`, `success`, and `error` with retry-safe input retention.

- [ ] **Step 1: Write failing form tests**

Test that comment and guestbook text remains after a failed request, submitting disables only the submit action, error text uses `role="alert"`, success uses `role="status"`, login announces invalid credentials, and account save announces completion without moving focus.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/public-forms.test.tsx`
Expected: FAIL because feedback semantics and retention are inconsistent.

- [ ] **Step 3: Implement consistent states**

Keep each page's existing request endpoint and copy. Add explicit `aria-busy`, `role="alert"`, and `role="status"`; clear input only after a successful response; expose a retry button when the last request failed; keep labels programmatically associated with every input.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/public-forms.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add components/Comments.tsx components/CommentThread.tsx app/guestbook/page.tsx app/login/page.tsx app/account/page.tsx tests/public-forms.test.tsx
git commit -m "fix: improve public form feedback"
```

### Task 6: SEO, structured data, and public verification

**Files:**
- Create: `lib/seo.ts`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/layout.tsx`
- Modify: `app/posts/[slug]/page.tsx`
- Modify: `app/moments/page.tsx`
- Modify: `app/album/page.tsx`
- Modify: `app/guestbook/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/account/page.tsx`
- Test: `tests/seo.test.ts`

**Interfaces:**
- Produces: `articleJsonLd(post: Post, siteUrl: string): ArticleSchema`
- Produces: Next.js `MetadataRoute.Sitemap` and `MetadataRoute.Robots`.

- [ ] **Step 1: Write failing schema tests**

Assert the helper emits `@type: 'Article'`, headline, canonical URL, published/modified dates, and omits undefined image values.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/seo.test.ts`
Expected: FAIL because `lib/seo.ts` does not exist.

- [ ] **Step 3: Implement metadata and JSON-LD**

Use `NEXT_PUBLIC_SITE_URL` with a localhost fallback for canonical generation. Add metadata base, per-page descriptions, Article JSON-LD, sitemap entries for public routes and published posts, and robots rules that disallow `/admin` and `/api/admin`.

- [ ] **Step 4: Final verification and commit**

Run: `npm test`
Run: `npm run typecheck`
Run: `npm run build`
Expected: all commands exit 0.

Browser-check light/dark, keyboard focus, reduced motion, and metadata in page source.

```bash
git add lib/seo.ts app/sitemap.ts app/robots.ts app/layout.tsx app/posts app/moments app/album app/timeline app/guestbook app/about tests/seo.test.ts
git commit -m "feat: complete public SEO and accessibility refinement"
```
