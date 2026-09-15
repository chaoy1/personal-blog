# Site Page Implementation Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Phase 4 的逐页面实施基线，让 P01–P08、A01–A02 和 M01–M07 都有可追踪的规格、状态、视口、主题、可访问性和证据记录。

**Architecture:** 本阶段只新增测试夹具和 QA 文档，不改页面视觉、业务流程、数据加载或路由。一个类型安全的页面矩阵作为单一事实源，契约测试验证它与页面规格索引、实际源码路径和每份页面规格的必备章节一致；QA 文档定义之后每个页面必须复用的截图命名、状态样例、computed style 和响应式检查格式。

**Tech Stack:** TypeScript, Vitest, Node `fs`, Markdown documentation, existing Next.js 15 App Router repository.

**Spec:** `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`（Phase 4、§10、§12）；`docs/superpowers/specs/pages/2026-09-15-page-design-index.md`。

## Global Constraints

- 公共页面保留山水、书法、宣纸、朱印和昼夜氛围，不改成白底卡片站。
- 页面只复用 Design Token、Container、Section、PageIntro、Button、Feedback、Dialog 行为，不共享万能 Card。
- 页面标题只使用 `display`、`standard`、`compact` 三个受控变体。
- Readable、Article、Default、Wide 四级容器继续使用总规格定义。
- 所有必要操作 hit area 不小于 `44×44px`。
- `Loading`、`Empty`、`Error`、`Success` 互不混用；后台刷新不清空已有内容。
- 所有页面必须同时验证 light/dark、键盘焦点、reduced-motion 和移动端横向溢出。
- 数据加载遵循 Phase 2 修订规格；页面设计不自行创建第二套缓存或请求生命周期。
- 目标宽度使用 `1440`、`1024`、`768`、`375px`，补充回归使用 `390px`、`360px` 和 `1280px`。
- 本阶段只允许改动 `tests/fixtures/**`、`tests/page-design-baseline.test.ts`、`docs/qa/**`、页面规格索引、上位设计规格和本计划；不得把页面实现改动混入 Phase 4。

---

## File Map

- Create `tests/fixtures/page-design-baseline.ts`: P01–P08、A01–A02、M01–M07 的路由、规格、源码、模板、区域和统一视口/主题/状态矩阵。
- Create `tests/page-design-baseline.test.ts`: 验证页面矩阵、规格索引、源码路径、必备章节和 QA 文档契约。
- Create `docs/qa/2026-09-15-site-page-implementation-baseline.md`: 记录 Phase 4 的证据规则、截图命名、状态样例、computed style、响应式和可访问性检查表，并明确本阶段与后续逐页完成之间的边界。
- Modify `docs/superpowers/specs/pages/2026-09-15-page-design-index.md`: 将页面规格索引标为 Phase 4 已确认的实施基线，并链接 QA 证据规则。
- Modify `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`: 只更新 Phase 4 状态和实际基线证据，不改既有页面设计决策。
- Modify `docs/superpowers/plans/2026-09-15-site-page-implementation-baseline.md`: 完成后勾选步骤并记录实际验证结果与 commit SHA。

### Task 1: Freeze the typed route and evidence matrix

**Files:**
- Create: `tests/fixtures/page-design-baseline.ts`
- Create: `tests/page-design-baseline.test.ts`

**Interfaces:**
- `BASELINE_VIEWPORTS`: readonly entries `{ id, width, height }` for `1440×900`, `1024×768`, `768×1024`, `390×844`, `375×812`, `360×800`, and `1280×720`.
- `BASELINE_THEMES`: readonly tuple `['light', 'dark']`.
- `BASELINE_STATES`: readonly tuple `['normal', 'loading', 'empty', 'error', 'success', 'permission']`.
- `PAGE_DESIGN_ENTRIES`: readonly entries `{ id, route, specFile, sourceFile, area, template }` for all 17 indexed routes.
- `PAGE_SPEC_SECTIONS`: readonly required headings `页面任务`, `必须保留`, `信息层级`, `版式设计`, `组件边界`, `状态`, `响应式`, `不在本页处理`, `验收`.

- [x] **Step 1: Write the failing matrix contract tests**

  Add tests that import the matrix constants and assert the exact target sizes, both themes, all six state semantics, the 17 route/spec/source mappings, every local spec file exists, every source file exists, the page index contains every mapping, and every page spec contains all required headings.

  ```tsx
  import { existsSync, readFileSync } from 'node:fs'
  import { resolve } from 'node:path'
  import { describe, expect, it } from 'vitest'
  import {
    BASELINE_STATES,
    BASELINE_THEMES,
    BASELINE_VIEWPORTS,
    PAGE_DESIGN_ENTRIES,
    PAGE_SPEC_SECTIONS,
  } from '@/tests/fixtures/page-design-baseline'

  const root = process.cwd()
  const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

  describe('Phase 4 page design baseline', () => {
    it('freezes the required viewport, theme, and state matrix', () => {
      expect(BASELINE_VIEWPORTS.map(({ width }) => width)).toEqual([1440, 1024, 768, 390, 375, 360, 1280])
      expect(BASELINE_THEMES).toEqual(['light', 'dark'])
      expect(BASELINE_STATES).toEqual(['normal', 'loading', 'empty', 'error', 'success', 'permission'])
    })

    it('maps every indexed route to a local spec and source file', () => {
      const index = read('docs/superpowers/specs/pages/2026-09-15-page-design-index.md')
      for (const entry of PAGE_DESIGN_ENTRIES) {
        expect(index).toContain(`| ${entry.id} | \`${entry.route}\` | \`${entry.specFile}\``)
        expect(existsSync(resolve(root, `docs/superpowers/specs/pages/${entry.specFile}`))).toBe(true)
        expect(existsSync(resolve(root, entry.sourceFile))).toBe(true)
      }
      expect(PAGE_DESIGN_ENTRIES).toHaveLength(17)
    })

    it('requires every page spec to state its task, states, responsive rules, and acceptance', () => {
      for (const entry of PAGE_DESIGN_ENTRIES) {
        const spec = read(`docs/superpowers/specs/pages/${entry.specFile}`)
        for (const section of PAGE_SPEC_SECTIONS) expect(spec).toContain(`## ${section}`)
      }
    })
  })
  ```

- [x] **Step 2: Run the focused tests and confirm the expected missing-fixture failure**

  Run: `npm test -- --run tests/page-design-baseline.test.ts`

  Expected: FAIL during module resolution because `tests/fixtures/page-design-baseline.ts` does not exist yet. If the test fails for a different reason, correct the test before adding the fixture.

- [x] **Step 3: Implement the minimal typed fixture**

  Define the exact constants used by the tests. The route table must include:

  ```ts
  export const PAGE_DESIGN_ENTRIES = [
    { id: 'P01', route: '/', specFile: 'home-page-design.md', sourceFile: 'app/page.tsx', area: 'public', template: 'Immersive' },
    { id: 'P02', route: '/posts', specFile: 'posts-index-page-design.md', sourceFile: 'app/posts/page.tsx', area: 'public', template: 'Open Collection' },
    { id: 'P03', route: '/posts/[slug]', specFile: 'article-detail-page-design.md', sourceFile: 'app/posts/[slug]/page.tsx', area: 'public', template: 'Reading' },
    { id: 'P04', route: '/moments', specFile: 'moments-page-design.md', sourceFile: 'app/moments/page.tsx', area: 'public', template: 'Paper Collection' },
    { id: 'P05', route: '/album', specFile: 'album-page-design.md', sourceFile: 'app/album/page.tsx', area: 'public', template: 'Paper Collection / Gallery Detail' },
    { id: 'P06', route: '/timeline', specFile: 'timeline-page-design.md', sourceFile: 'app/timeline/page.tsx', area: 'public', template: 'Chronicle' },
    { id: 'P07', route: '/guestbook', specFile: 'guestbook-page-design.md', sourceFile: 'app/guestbook/page.tsx', area: 'public', template: 'Wide Correspondence Paper' },
    { id: 'P08', route: '/about', specFile: 'about-page-design.md', sourceFile: 'app/about/page.tsx', area: 'public', template: 'Readable Profile Scroll' },
    { id: 'A01', route: '/login', specFile: 'login-page-design.md', sourceFile: 'app/login/page.tsx', area: 'auth', template: 'Focused Auth' },
    { id: 'A02', route: '/account', specFile: 'account-page-design.md', sourceFile: 'app/account/page.tsx', area: 'auth', template: 'Account Settings' },
    { id: 'M01', route: '/admin/login', specFile: 'admin-login-page-design.md', sourceFile: 'app/admin/login/page.tsx', area: 'admin', template: 'Focused Admin Auth' },
    { id: 'M02', route: '/admin', specFile: 'admin-dashboard-page-design.md', sourceFile: 'app/admin/page.tsx', area: 'admin', template: 'Admin Collection' },
    { id: 'M03', route: '/admin/editor', specFile: 'admin-editor-page-design.md', sourceFile: 'app/admin/editor/page.tsx', area: 'admin', template: 'Writing Workspace' },
    { id: 'M04', route: '/admin/moments', specFile: 'admin-moments-page-design.md', sourceFile: 'app/admin/moments/page.tsx', area: 'admin', template: 'Composer + Admin Collection' },
    { id: 'M05', route: '/admin/photos', specFile: 'admin-photos-page-design.md', sourceFile: 'app/admin/photos/page.tsx', area: 'admin', template: 'Asset Workspace' },
    { id: 'M06', route: '/admin/profile', specFile: 'admin-profile-page-design.md', sourceFile: 'app/admin/profile/page.tsx', area: 'admin', template: 'Owner Profile Settings' },
    { id: 'M07', route: '/admin/preview/[id]', specFile: 'admin-preview-page-design.md', sourceFile: 'app/admin/preview/[id]/page.tsx', area: 'admin', template: 'Public-Fidelity Preview' },
  ] as const
  ```

  Export the viewport, theme, state, entry, and section constants with `as const`; do not import application code or create a second runtime data source.

- [x] **Step 4: Run the matrix tests and typecheck**

  Run: `npm test -- --run tests/page-design-baseline.test.ts` and `npm run typecheck`.

  Expected: PASS with 3 tests and no TypeScript diagnostics.

- [x] **Step 5: Commit the baseline contract slice**

  ```powershell
  git add tests/fixtures/page-design-baseline.ts tests/page-design-baseline.test.ts
  git diff --cached --check
  git commit -m "test: 固化页面实施基线矩阵"
  git push origin main
  ```

### Task 2: Add the reusable QA evidence protocol

**Files:**
- Modify: `tests/page-design-baseline.test.ts`
- Create: `docs/qa/2026-09-15-site-page-implementation-baseline.md`

**Interfaces:**
- The QA document defines the canonical artifact path `docs/qa/phase4-page-baseline/<page-id>/<theme>/<viewport>/<state>.png`.
- Each page record contains route, template, normal content evidence, Loading/Empty/Error/Success evidence, permission evidence when applicable, computed `body.scrollWidth`, `documentElement.scrollWidth`, primary container width, key typography values, focus/keyboard results, and reduced-motion result.
- The test continues to consume the constants from Task 1 and verifies that the QA document contains every required viewport, theme, state, artifact path, root overflow expression, and explicit “Phase 4 baseline is not page visual completion” boundary.

- [x] **Step 1: Extend the contract test before writing the QA document**

  Add this test to `tests/page-design-baseline.test.ts`:

  ```tsx
  it('defines one reusable QA record format without claiming page completion', () => {
    const qa = read('docs/qa/2026-09-15-site-page-implementation-baseline.md')
    for (const viewport of BASELINE_VIEWPORTS) expect(qa).toContain(`${viewport.width}×${viewport.height}`)
    for (const theme of BASELINE_THEMES) expect(qa).toContain(theme)
    for (const state of BASELINE_STATES) expect(qa).toContain(state)
    expect(qa).toContain('document.body.scrollWidth <= window.innerWidth')
    expect(qa).toContain('document.documentElement.scrollWidth <= window.innerWidth')
    expect(qa).toContain('phase4-page-baseline/<page-id>/<theme>/<viewport>/<state>.png')
    expect(qa).toContain('本阶段不等于逐页面视觉完成')
  })
  ```

- [x] **Step 2: Run the focused test and confirm the expected missing-document failure**

  Run: `npm test -- --run tests/page-design-baseline.test.ts`

  Expected: the first three tests pass and the QA protocol test fails because the document has not been created.

- [x] **Step 3: Write the QA protocol with the actual matrix**

  Create the document with these concrete sections and values:

  1. **范围与边界**：Phase 4 only freezes evidence format and page order; no `app/**`, `components/**`, `lib/**`, Supabase schema, auth protocol, upload workflow, or visual page rewrite is included.
  2. **页面清单**：render all 17 entries from the page index in P01–P08, A01–A02, M01–M07 order, including route, template, owner area, and linked design spec.
  3. **视口矩阵**: `1440×900`, `1024×768`, `768×1024`, `390×844`, `375×812`, `360×800`, `1280×720`; the first four are required targets and the last three are regression sizes.
  4. **主题与动效**: `light`, `dark`, normal motion, and `prefers-reduced-motion` verification. State clearly that a page cannot be marked complete from a single theme or a synthetic pure-color background.
  5. **状态样例**: `normal`, `loading`, `empty`, `error`, `success`, and `permission` where the route has permission handling. Loading must not look empty; Error must name its resource; Success must describe the completed action.
  6. **截图命名与记录字段**: use `docs/qa/phase4-page-baseline/<page-id>/<theme>/<viewport>/<state>.png`; every record must list route, git SHA, viewport, theme, state, container width, body/root scroll widths, key computed styles, keyboard/focus result, reduced-motion result, and notes.
  7. **横向溢出检查**: run `document.body.scrollWidth <= window.innerWidth` and `document.documentElement.scrollWidth <= window.innerWidth`; code blocks, tables, and required media may scroll only inside their own container.
  8. **交互检查**: confirm 44×44px hit areas, visible focus, Enter/Escape behavior, dialog focus return, pagination first/last states, and no public `window.confirm`.
  9. **证据状态**: identify the existing Phase 1/Phase 2 automated evidence as inherited context, mark Phase 4's new matrix/protocol as established, and leave actual per-page before/after screenshots and computed-style records for P01–P08/A01–A02/M01–M07 execution.

- [x] **Step 4: Run focused tests and diff-check**

  Run: `npm test -- --run tests/page-design-baseline.test.ts` and `git diff --check`.

  Expected: all 4 baseline tests pass and there are no whitespace errors.

- [x] **Step 5: Commit and push the QA protocol**

  ```powershell
  git add tests/page-design-baseline.test.ts docs/qa/2026-09-15-site-page-implementation-baseline.md
  git diff --cached --check
  git commit -m "docs: 建立 Phase 4 页面验收基线"
  git push origin main
  ```

### Task 3: Record Phase 4 status and execution boundary

**Files:**
- Modify: `docs/qa/2026-09-15-site-page-implementation-baseline.md`
- Modify: `docs/superpowers/specs/pages/2026-09-15-page-design-index.md`
- Modify: `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`
- Modify: `docs/superpowers/plans/2026-09-15-site-page-implementation-baseline.md`
- Modify: `tests/page-design-baseline.test.ts`

**Interfaces:**
- The page index status becomes `已确认；Phase 4 页面实施基线已建立` and links to the QA document without changing any page design choice.
- The upper design spec's Phase 4 entry records the QA path and the fact that no page visual implementation was included.
- The plan records actual test counts, typecheck/build results, diff-check, final SHA, and any unavailable browser evidence without inventing screenshots.

- [x] **Step 1: Add status assertions before updating the documents**

  Add tests that read the two specs and assert the status phrases, the QA document link, the exact Phase 4 boundary phrase `不批量修改页面视觉`, and the page index execution-order phrase `同一页面通过验收后才能进入下一个页面` remain present.

- [x] **Step 2: Run the focused test and confirm the expected status failure**

  Run: `npm test -- --run tests/page-design-baseline.test.ts`

  Expected: the matrix and QA tests pass; the status test fails because the documents still say `待用户评审` and do not yet link the new evidence record.

- [x] **Step 3: Update only the Phase 4 documentation status**

  Change the page index status to the confirmed baseline state and add one sentence linking `docs/qa/2026-09-15-site-page-implementation-baseline.md`. Change the upper spec's Phase 4 entry to record:

  ```text
  状态：已完成（2026-09-15）；已建立逐页面规格、视口/主题/状态矩阵、截图命名和验收字段。P01–P08、A01–A02、M01–M07 的实际页面视觉改动仍按页面顺序单独实施。
  ```

  Do not change the Phase 5/6 route order, page copy, existing visual constraints, or any application source.

- [x] **Step 4: Run the complete Phase 4 verification**

  Run sequentially:

  ```powershell
  npm test
  npm run typecheck
  npm run build
  git diff --check
  ```

  Expected: all repository tests pass, TypeScript exits 0, Next build exits 0, and diff-check reports no whitespace errors. Existing offline Supabase `fetch failed / EACCES` warnings during static generation may appear but do not count as a build failure when the exit code is 0.

- [x] **Step 5: Record the real verification evidence**

  Update this plan and the QA document with the actual test file/test totals, typecheck/build exit codes, the final commit SHA, `HEAD == origin/main`, and ahead/behind `0 0`. State explicitly if no callable browser screenshot tool was available; do not convert a test-only check into a visual claim.

- [x] **Step 6: Commit and automatically push the Phase 4 checkpoint**

  ```powershell
  git add docs/qa/2026-09-15-site-page-implementation-baseline.md docs/superpowers/specs/pages/2026-09-15-page-design-index.md docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md docs/superpowers/plans/2026-09-15-site-page-implementation-baseline.md tests/page-design-baseline.test.ts
  git diff --cached --check
  git commit -m "docs: 固化 Phase 4 页面实施边界"
  git push origin main
  git rev-parse HEAD
  git rev-parse origin/main
  git rev-list --left-right --count origin/main...HEAD
  ```

## Completion Checklist

- [x] The fixture contains exactly 17 route entries matching the page index.
- [x] Every page spec and source path is verified to exist.
- [x] The seven-viewport, two-theme, six-state matrix is encoded in tests and documented.
- [x] Screenshot, computed-style, overflow, keyboard, reduced-motion, and permission evidence fields are documented.
- [x] The Phase 4 boundary explicitly excludes page visual implementation.
- [x] `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check` have fresh passing evidence.
- [x] Only Phase 4 files are staged, committed, and pushed; Vercel deployment is reported separately.

## Execution Evidence

- Task 1 commit and push: `ce11e23` (`test: 固化页面实施基线矩阵`).
- Task 2 commit and push: `1536fb7` (`docs: 建立 Phase 4 页面验收基线`).
- Final full verification before the Phase 4 checkpoint: `npm test` 41/41 files and 206/206 tests; `npm run typecheck` exit 0; `npm run build` 31/31 pages and exit 0; `git diff --check` passed.
- Browser evidence: no callable browser screenshot/DevTools tool was available in this execution, so no real-page screenshot or computed-style result is claimed here.
- The final Phase 4 documentation checkpoint SHA is recorded in the post-push Git receipt and handoff; Vercel deployment remains a separate status.
