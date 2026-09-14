# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented and verified on 2026-09-14. The plan remains intentionally limited to Phase 1; no Phase 2 data-boundary or AppStore work was included.

**Goal:** Implement Phase 1 of the site design-system refactor by introducing semantic tokens, documenting CSS ownership, and migrating `PageIntro`, `ArticleNav`, and existing feedback/button styling without changing business behavior or the established Chinese-landscape visual identity.

**Architecture:** Keep the existing global CSS loading order (`globals.css` → `refinement.css` → `studio.css`) while assigning each layer a clear responsibility. `globals.css` owns tokens and resets, `refinement.css` owns shared component contracts, and `studio.css` keeps page-specific recipes and admin styling. Existing legacy variables and DOM contracts remain available during migration; only the two explicitly selected shared components move to a single final owner in this phase.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, global CSS, Vitest, Testing Library, Node 18.18+.

**Spec:** `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`

## Global Constraints

- Preserve `public/bg/qianli-bridge.jpg` and the current full-bleed landscape, calligraphy, seals, side inscriptions, day/night atmosphere, statistics entry, daily phrase, and downward-browse entry.
- Preserve all existing routes and core article, moments, album, timeline, guestbook, about, account, and admin behavior.
- Do not restore the opening scroll, add full-screen entrance masks, add seasonal/time themes, route-exit animation, background parallax, number rolling, or auto-hiding navigation.
- Do not modify Supabase schema, RLS, authentication protocol, upload interfaces, draft recovery, or conflict protection.
- Do not introduce a large UI framework or global state library.
- New styles must not introduce new `!important` declarations.
- Keep the existing `useAmbientMotion(): boolean | null`, reduced-motion, Save-Data, and page-visibility contracts.
- Use the documented responsive intervals: mobile `< 640px`, tablet `640–899px`, compact desktop `900–1199px`, wide desktop `>= 1200px`.
- Required verification commands are `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- Do not stage or push files as part of this plan unless separately requested.

## File Map

- Modify `app/globals.css`: add semantic color, typography, spacing, radius, shadow, container, and gutter tokens; retain legacy aliases and existing environmental artwork variables.
- Modify `app/refinement.css`: become the final shared-style owner for `ArticleNav`, `PageIntro`, focus treatment, and the selected existing feedback/button state rules.
- Modify `app/studio.css`: remove only the duplicate general `ArticleNav`/`PageIntro` declarations that are superseded by the shared owner; retain page-specific recipes, About styling, timeline styling, and admin styling.
- Modify `components/PageIntro.tsx`: add an optional `variant` prop with `standard`, `display`, and `compact` values, defaulting to `standard`, while preserving the existing markup and default class behavior.
- Modify `tests/article-nav.test.tsx`: add the component-level minimum hit-area contract marker without changing the existing accessibility assertions.
- Create `tests/design-system-contract.test.ts`: verify semantic tokens, legacy compatibility variables, CSS ownership, responsive token markers, and the absence of a new `!important` in the migrated rules.
- Create `tests/page-intro.test.tsx`: verify the default and explicit `PageIntro` variant class contracts.
- Create `docs/qa/2026-09-14-site-design-system-foundation.md`: record the token mapping, CSS layer ownership, baseline visual invariants, and the verification matrix for this phase.

### Task 1: Establish failing design-system and component contract tests

**Files:**
- Create: `tests/design-system-contract.test.ts`
- Create: `tests/page-intro.test.tsx`
- Modify: `tests/article-nav.test.tsx`

**Interfaces:**
- Consumes: the existing `PageIntro` props `{ index, eyebrow, title, seal, description }` and existing `.article-nav` DOM classes.
- Produces: executable contracts for semantic tokens, CSS ownership, `PageIntro` variants, and 44px shared-navigation hit areas.

- [ ] **Step 1: Write the failing CSS contract test**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const globals = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')
const refinement = readFileSync(resolve(process.cwd(), 'app/refinement.css'), 'utf8')
const studio = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')

describe('design system foundation', () => {
  it('defines semantic tokens and retains legacy compatibility variables', () => {
    expect(globals).toContain('--color-primary:')
    expect(globals).toContain('--color-background:')
    expect(globals).toContain('--color-surface:')
    expect(globals).toContain('--color-text-primary:')
    expect(globals).toContain('--color-text-secondary:')
    expect(globals).toContain('--color-text-muted:')
    expect(globals).toContain('--space-1: 4px')
    expect(globals).toContain('--space-16: 64px')
    expect(globals).toContain('--radius-pill: 999px')
    expect(globals).toContain('--container-readable: 680px')
    expect(globals).toContain('--container-wide: 1080px')
    expect(globals).toContain('--paper:')
    expect(globals).toContain('--ink:')
    expect(globals).toContain('--seal:')
    expect(globals).toContain('--rule:')
  })

  it('assigns the shared component rules to refinement.css only', () => {
    expect(refinement).toMatch(/\.article-nav > \.article-nav-home,[\s\S]*min-height:\s*44px/)
    expect(refinement).toMatch(/\.page-intro\s*\{[\s\S]*var\(--container-default\)/)
    expect(studio.match(/(^|\n)\.article-nav\s*\{/g) ?? []).toHaveLength(0)
    expect(studio.match(/(^|\n)\.page-intro\s*\{/g) ?? []).toHaveLength(0)
  })

  it('keeps the migrated shared rules free of new important declarations', () => {
    expect(refinement).not.toContain('!important')
  })
})
```

- [ ] **Step 2: Run the CSS contract test and confirm it fails for missing tokens/ownership**

Run: `npm test -- tests/design-system-contract.test.ts`

Expected: FAIL because the semantic token layer is not present and the shared rules still live in `studio.css`.

- [ ] **Step 3: Write the failing `PageIntro` variant test**

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageIntro from '@/components/PageIntro'

afterEach(cleanup)

const props = {
  index: '一',
  eyebrow: 'COLLECTED NOTES',
  title: '文章',
  seal: '文',
  description: '记录阅读与思考。',
}

describe('PageIntro variants', () => {
  it('uses standard as the default variant', () => {
    render(<PageIntro {...props} />)
    expect(screen.getByRole('heading', { name: '文章' }).parentElement?.parentElement).toHaveClass(
      'page-intro',
      'page-intro--standard',
    )
  })

  it.each(['display', 'compact'] as const)('exposes the %s variant class', (variant) => {
    render(<PageIntro {...props} variant={variant} />)
    expect(screen.getByRole('heading', { name: '文章' }).parentElement?.parentElement).toHaveClass(
      'page-intro',
      `page-intro--${variant}`,
    )
  })
})
```

- [ ] **Step 4: Run the variant test and confirm it fails because `variant` is not implemented**

Run: `npm test -- tests/page-intro.test.tsx`

Expected: FAIL with a TypeScript/render assertion showing that `PageIntro` has no variant class or prop.

- [ ] **Step 5: Extend the existing ArticleNav test with a hit-area contract**

Add this assertion to the existing accessible-navigation test after locating `navigation`:

```ts
expect(navigation).toHaveAttribute('data-hit-area', '44px')
```

- [ ] **Step 6: Run the focused ArticleNav test and confirm the new marker fails**

Run: `npm test -- tests/article-nav.test.tsx`

Expected: FAIL only on the new `data-hit-area` assertion; the existing navigation assertions remain green.

### Task 2: Add semantic tokens and compatibility mapping

**Files:**
- Modify: `app/globals.css:1-145`
- Modify: `tests/design-system-contract.test.ts`

**Interfaces:**
- Consumes: existing `--paper`, `--paper-2`, `--ink`, `--ink-soft`, `--ink-faint`, `--rule`, `--rule-strong`, `--seal`, `--seal-deep`, `--font-cn`, `--font-kai`, `--font-mono`, and current dark-theme variables.
- Produces: documented `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--container-*`, and responsive gutter tokens available to all later phases.

- [ ] **Step 1: Add the light-theme semantic token block**

Place the new tokens in the existing `:root` block before the legacy aliases, using the design document values:

```css
  --color-primary: #b23a2b;
  --color-primary-strong: #8f2b1f;
  --color-secondary: #58738b;
  --color-background: #f2edde;
  --color-surface: rgba(248, 242, 227, 0.92);
  --color-surface-soft: rgba(248, 242, 227, 0.72);
  --color-border: rgba(73, 62, 42, 0.22);
  --color-text-primary: #2c2a24;
  --color-text-secondary: #6f685a;
  --color-text-muted: #817968;
  --color-success: #4e6655;
  --color-warning: #92714d;
  --color-error: #8f2b1f;
  --font-body: var(--font-cn);
  --font-heading: var(--font-kai);
  --font-display: "Zhi Mang Xing", "STXingkai", var(--font-kai);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow-sm: 0 4px 14px rgba(42, 30, 12, 0.12);
  --shadow-md: 0 16px 38px -35px rgba(39, 27, 12, 0.72);
  --shadow-lg: 0 24px 72px rgba(24, 17, 8, 0.28);
  --container-readable: 680px;
  --container-article: 780px;
  --container-default: 900px;
  --container-wide: 1080px;
  --gutter-wide: 56px;
  --gutter-compact: 40px;
  --gutter-tablet: 32px;
  --gutter-mobile: 22px;
```

- [ ] **Step 2: Add dark-theme semantic values**

Add the matching semantic overrides to `:root[data-theme='dark']`, including the exact documented colors, dark-appropriate shadows, and the same dimensional tokens:

```css
  --color-primary: #c64b31;
  --color-primary-strong: #d96b4a;
  --color-secondary: #8fa6b8;
  --color-background: #241c10;
  --color-surface: rgba(52, 41, 25, 0.92);
  --color-surface-soft: rgba(52, 41, 25, 0.72);
  --color-border: rgba(225, 207, 166, 0.22);
  --color-text-primary: #ecdfc0;
  --color-text-secondary: #b6a67d;
  --color-text-muted: #91815b;
  --color-success: #9bb29a;
  --color-warning: #c4a071;
  --color-error: #d96b4a;
  --shadow-sm: 0 4px 14px rgba(12, 8, 2, 0.28);
  --shadow-md: 0 16px 38px -35px rgba(12, 8, 2, 0.86);
  --shadow-lg: 0 24px 72px rgba(12, 8, 2, 0.48);
```

Keep the existing `--paper`, `--ink`, and other legacy values as aliases to the corresponding semantic tokens only where this preserves current computed styles; retain the existing artwork-specific variables unchanged. The documented muted-text value is the one intentional contrast improvement in this phase.

- [ ] **Step 3: Add the responsive gutter declarations near the existing media-token section**

Use the four documented intervals without changing page markup:

```css
@media (min-width: 1200px) {
  :root { --gutter-current: var(--gutter-wide); }
}

@media (min-width: 900px) and (max-width: 1199px) {
  :root { --gutter-current: var(--gutter-compact); }
}

@media (min-width: 640px) and (max-width: 899px) {
  :root { --gutter-current: var(--gutter-tablet); }
}

@media (max-width: 639px) {
  :root { --gutter-current: var(--gutter-mobile); }
}
```

- [ ] **Step 4: Run the focused CSS test and update assertions for both themes**

Run: `npm test -- tests/design-system-contract.test.ts`

Expected: PASS for token presence and compatibility variables; ownership assertions remain red until Task 3.

### Task 3: Make `PageIntro` variants explicit

**Files:**
- Modify: `components/PageIntro.tsx`
- Modify: `tests/page-intro.test.tsx`
- Modify: `app/refinement.css`

**Interfaces:**
- Consumes: existing `PageIntro` call sites with no variant prop.
- Produces: `PageIntroProps.variant?: 'standard' | 'display' | 'compact'`, default `'standard'`, and classes `.page-intro--standard`, `.page-intro--display`, `.page-intro--compact`.

- [ ] **Step 1: Implement the smallest prop/class change**

Change the component types and root element as follows while leaving all child content intact:

```tsx
type PageIntroProps = {
  index: string
  eyebrow: string
  title: string
  seal: string
  description: string
  variant?: 'standard' | 'display' | 'compact'
}

export default function PageIntro({
  index,
  eyebrow,
  title,
  seal,
  description,
  variant = 'standard',
}: PageIntroProps) {
  return (
    <header className={`page-intro page-intro--${variant}`}>
      <div className="page-intro-copy">
        <div className="page-intro-meta">
          <span className="page-intro-index" aria-hidden="true">卷 {index}</span>
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <h1>
          {title}
          <span className="article-seal" aria-hidden="true">
            {seal}
          </span>
        </h1>
        <p className="page-intro-description">{description}</p>
      </div>
      <span className="page-intro-mark" aria-hidden="true">
        <i />
        COLLECTED NOTES
      </span>
    </header>
  )
}
```

- [ ] **Step 2: Run the focused variant test**

Run: `npm test -- tests/page-intro.test.tsx`

Expected: PASS for standard, display, and compact classes.

- [ ] **Step 3: Add only token-backed variant rules**

In the shared style owner, keep `standard` at the current default appearance and define controlled differences for the two opt-in variants:

```css
.page-intro--standard { max-width: var(--container-default); }
.page-intro--display h1 { font-size: clamp(40px, 5vw, 56px); line-height: 1.1; }
.page-intro--compact { min-height: 0; padding-block: var(--space-6); }
```

Do not change existing page call sites to opt into a new variant in this phase; future page-template work will choose variants with page-level evidence.

- [ ] **Step 4: Re-run all PageIntro-related tests**

Run: `npm test -- tests/page-intro.test.tsx tests/about-page.test.tsx`

Expected: PASS with existing About navigation, typography, colophon, and accessibility contracts unchanged.

### Task 4: Consolidate `ArticleNav` and shared `PageIntro` CSS ownership

**Files:**
- Modify: `app/refinement.css`
- Modify: `app/studio.css`
- Modify: `components/ArticleNav.tsx`
- Modify: `tests/article-nav.test.tsx`
- Modify: `tests/design-system-contract.test.ts`

**Interfaces:**
- Consumes: the existing `ArticleNav` DOM structure and current final visual treatment, including the dark-theme `text-shadow: none` rule.
- Produces: one final general `.article-nav` owner in `refinement.css`, one final general `.page-intro` owner in `refinement.css`, and a `data-hit-area="44px"` marker documenting the shared hit-area contract.

- [ ] **Step 1: Add the explicit hit-area marker to `ArticleNav`**

Change only the `<nav>` opening tag:

```tsx
<nav className="article-nav" aria-label={ariaLabel} data-hit-area="44px">
```

- [ ] **Step 2: Move the current final shared ArticleNav rules to `refinement.css`**

Copy the adopted text-only treatment from the final `studio.css` block into the shared stylesheet, replacing fixed minimums with tokens where equivalent:

```css
.article-nav {
  min-height: var(--space-12);
  margin: var(--space-1) auto var(--space-4);
  padding: var(--space-2) var(--space-1);
  color: var(--color-text-primary);
  text-shadow: none;
}

.article-nav > .article-nav-home,
.article-nav > .article-nav-back,
.article-nav > .article-nav-current {
  min-height: 44px;
}

:root[data-theme='dark'] .article-nav {
  text-shadow: none;
}
```

Retain the existing label wash, current-page diamond, hover, focus, and mobile rules in the same shared block, replacing only values that have an exact semantic token equivalent.

- [ ] **Step 3: Move the current general PageIntro rules to the same shared owner**

Keep the current open paper treatment and page-specific selectors working. The shared base must use `var(--container-default)` for the general width and `var(--space-*)` for new spacing values. About, collection, and timeline overrides remain page recipes in `studio.css` and must be selector-scoped rather than re-defining the generic `.page-intro` block.

- [ ] **Step 4: Remove duplicate generic blocks from `studio.css`**

Delete only standalone generic `.article-nav` and `.page-intro` blocks that have been copied into `refinement.css`. Keep selectors such as `.about-scroll .page-intro`, `.collection-scroll > .page-intro`, `.timeline-page > .page-intro`, and their theme/mobile overrides because they are page-specific recipes. Do not delete any About, timeline, admin, or guestbook-specific rule.

- [ ] **Step 5: Run focused shared-component tests and inspect the diff**

Run: `npm test -- tests/article-nav.test.tsx tests/page-intro.test.tsx tests/design-system-contract.test.ts`

Expected: PASS with one generic owner per component, no new `!important`, and unchanged accessible navigation behavior.

### Task 5: Migrate selected existing feedback and button styling to semantic tokens

**Files:**
- Modify: `app/refinement.css`
- Modify: `app/studio.css`
- Modify: `tests/design-system-contract.test.ts`

**Interfaces:**
- Consumes: existing `.admin-notice-*`, `.admin-dialog-card`, `.admin-upload-actions button`, `.admin-upload-toolbar button`, and existing global `:focus-visible` behavior.
- Produces: token-backed visual states without creating new UI primitives or changing submit/delete/auth behavior.

- [ ] **Step 1: Add CSS assertions for the selected state rules**

Extend `tests/design-system-contract.test.ts` with:

```ts
it('uses semantic state tokens for the selected feedback and control styles', () => {
  expect(studio).toContain('background: var(--color-success)')
  expect(studio).toContain('background: var(--color-error)')
  expect(refinement).toContain('outline: 2px solid var(--color-primary)')
})
```

- [ ] **Step 2: Run the new assertion and confirm the expected failure**

Run: `npm test -- tests/design-system-contract.test.ts`

Expected: FAIL because the selected rules still use literal status colors and legacy focus tokens.

- [ ] **Step 3: Replace only the selected visual literals**

Use the semantic tokens for success/error notices and shared focus outlines while keeping layout, timing, and behavior unchanged:

```css
.admin-notice-success::before { background: var(--color-success); }
.admin-notice-error::before { background: var(--color-error); }
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
```

Keep info as `var(--color-secondary)`, retain the existing admin dialog radius until the later primitive phase, and do not change `.admin-notice` positioning or z-index.

- [ ] **Step 4: Run the relevant behavior tests**

Run: `npm test -- tests/admin-feedback.test.tsx tests/admin-confirm-dialog.test.tsx tests/public-forms.test.tsx tests/article-nav.test.tsx`

Expected: PASS with existing feedback rendering, dialog behavior, form behavior, and navigation behavior unchanged.

### Task 6: Record the foundation mapping and run phase verification

**Files:**
- Create: `docs/qa/2026-09-14-site-design-system-foundation.md`
- Modify: `tests/design-system-contract.test.ts` only if the recorded ownership checks require a precise selector assertion.

**Interfaces:**
- Consumes: the completed token layer, shared CSS ownership, component contracts, and current repository verification output.
- Produces: an auditable Phase 1 mapping and verification record for later phases.

- [ ] **Step 1: Document the token mapping and CSS layer ownership**

Create the QA record with these concrete sections:

```markdown
# Design System Foundation QA

## Scope

Phase 1 only: semantic tokens, shared CSS ownership, PageIntro variants, ArticleNav hit-area contract, and selected feedback/button token migration.

## Token mapping

| Legacy variable | Semantic variable | Migration status |
| --- | --- | --- |
| `--paper` | `--color-background` | compatibility retained |
| `--ink` | `--color-text-primary` | compatibility retained |
| `--ink-soft` | `--color-text-secondary` | compatibility retained |
| `--ink-faint` | `--color-text-muted` | contrast-adjusted semantic target |
| `--seal` | `--color-primary` | compatibility retained |
| `--seal-deep` | `--color-primary-strong` / `--color-error` | compatibility retained |
| `--rule` | `--color-border` | compatibility retained |

## CSS ownership

- `globals.css`: tokens, reset, environment/artwork variables, global primitives.
- `refinement.css`: shared ArticleNav, PageIntro, focus, and selected control-state contracts.
- `studio.css`: page-specific recipes and admin styles.

## Visual invariants

- `public/bg/qianli-bridge.jpg` remains the public background.
- No opening scroll or full-screen entrance overlay is restored.
- Existing routes, navigation labels, About colophon, timeline structure, and form behavior remain unchanged.

## Verification

Record the command, exit code, and summary for `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`, plus browser checks for light/dark at 1440, 1024, 768, 375, 390, and 360px.
```

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: exit code 0 with all tests passing and no unhandled errors.

- [ ] **Step 3: Run strict type checking**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit code 0. Record any environment-only Supabase fetch warning separately from the build result.

- [ ] **Step 5: Check whitespace and staged scope without staging**

Run: `git diff --check`

Expected: exit code 0 and no whitespace errors. Confirm `git status --short` contains only the files listed in this plan plus any pre-existing unrelated user changes.

- [ ] **Step 6: Perform browser visual and computed-style QA**

Use the local app in a browser and inspect the real rendered pages in both themes at 1440, 1024, 768, 375, 390, and 360px. Check `/`, `/posts`, `/about`, `/timeline`, and `/guestbook` for preserved construction, visible focus, `ArticleNav` minimum hit area, `PageIntro` variant/default styling, and:

```js
document.body.scrollWidth <= window.innerWidth &&
document.documentElement.scrollWidth <= window.innerWidth
```

Record failures as concrete follow-up changes; do not claim Phase 1 complete until every automated command and required visual check has fresh evidence.

## Self-Review Checklist

- [ ] Every Phase 1 delivery item in Section 13.1 of the design spec is covered by a task.
- [ ] No Phase 2 AppStore/layout data-boundary work is mixed into this plan.
- [ ] No generic `Card` primitive or large dependency is introduced.
- [ ] The only intentional visible change is the documented light-theme muted-text contrast adjustment.
- [ ] Every plan step contains a concrete action and a specific validation command where validation is required.
