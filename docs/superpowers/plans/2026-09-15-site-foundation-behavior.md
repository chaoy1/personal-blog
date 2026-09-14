# Site Foundation Components and Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Phase 3 的基础组件与交互行为边界，在不改变现有书卷视觉和业务流程的前提下，统一容器、表单状态、弹层焦点和分页契约。

**Architecture:** 新组件只提供尺寸、语义和行为，不接管页面数据获取或页面艺术定位。`DialogBehavior` 作为无视觉偏好的行为 hook，被搜索、灯箱、后台确认和公共删除确认复用；`ConfirmDialog` 只负责确认语义与现有 token 样式。页面按小批次迁移，旧 class 与调用方式在迁移期保留。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, Testing Library, 现有 CSS custom properties。

**Spec:** `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`（Phase 3、§7 基础组件、§9 交互与无障碍、§10 响应式规则）

## Global Constraints

- 统一响应式区间：`mobile < 640px`、`tablet 640–899px`、`compact desktop 900–1199px`、`wide desktop >= 1200px`。
- 所有必要交互的实际 hit area 最小为 `44×44px`。
- `Loading` 不显示空数据结论；`Empty` 只表示请求成功但结果为空；`Error` 绑定所属资源并提供重试；`Success` 说明操作完成。
- Dialog 打开后焦点进入第一个合理控件；Tab/Shift+Tab 保持在弹层内；Escape 关闭；关闭后焦点返回触发按钮；关闭时恢复 body 滚动状态。
- 公共端不再使用 `window.confirm` 完成删除确认。
- 保留 `useAmbientMotion(): boolean | null`、reduced-motion、Save-Data 和页面可见性策略。
- 不建立万能 `Card`；不将容器组件承担背景、阴影或页面主题。
- 保持现有 URL、Supabase 数据结构、Markdown 输出、文章锚点、留言树和业务错误文案契约。
- 每个阶段独立验证、独立提交、独立回滚；只暂存本阶段明确文件，不使用 `git add -A`。

---

### Task 1: Establish layout primitives without visual takeover

**Files:**
- Create: `components/Container.tsx`
- Create: `components/Section.tsx`
- Create: `tests/foundation-components.test.tsx`

**Interfaces:**
- `Container({ as?: ElementType, size?: 'default' | 'wide' | 'reading' | 'full', className?: string, children })` renders one semantic wrapper with `data-container-size`.
- `Section({ as?: ElementType, space?: 'tight' | 'default' | 'loose', className?: string, children })` renders one semantic section wrapper with `data-section-space`.

- [x] **Step 1: Write the failing primitive contract tests**

  Assert semantic `as` rendering, size/spacing data attributes, class-name composition, and the absence of background/box-shadow responsibilities in the component source.

- [x] **Step 2: Run the focused tests and confirm they fail**

  Run: `npm test -- --run tests/foundation-components.test.tsx`

  Expected: FAIL because `Container` and `Section` do not exist.

- [x] **Step 3: Implement the minimal primitives**

  Use `React.createElement`-compatible polymorphic props, keep defaults `div` and `default`, and never add inline visual styles. Map only semantic data attributes and class names.

- [x] **Step 4: Run focused tests and typecheck**

  Run: `npm test -- --run tests/foundation-components.test.tsx` and `npm run typecheck`.

  Expected: PASS.

- [x] **Step 5: Commit the primitive slice**

  ```powershell
  git add components/Container.tsx components/Section.tsx tests/foundation-components.test.tsx
  git diff --cached --check
  git commit -m "feat: 建立页面容器基础组件"
  git push origin main
  ```

### Task 2: Add shared button, form, feedback, and empty-state contracts

**Files:**
- Create: `components/Button.tsx`
- Create: `components/FormField.tsx`
- Create: `components/InlineFeedback.tsx`
- Create: `components/EmptyState.tsx`
- Modify: `app/refinement.css`
- Modify: `components/PostList.tsx`
- Create: `tests/foundation-feedback.test.tsx`

**Interfaces:**
- `Button({ variant?: 'primary' | 'ghost' | 'danger', size?: 'sm' | 'md', loading?: boolean, loadingLabel?: string, ...buttonProps })` preserves native button props, sets `aria-busy`, and disables while loading.
- `FormField({ label, htmlFor, description?, error?, children })` renders label/description/error associations without owning form submission.
- `InlineFeedback({ tone: 'success' | 'warning' | 'error' | 'info', message, onRetry? })` uses `role="status"` for non-error tones and `role="alert"` for errors; retry is optional.
- `EmptyState({ title, description?, action? })` renders only successful-empty semantics and exposes an optional action.
- `PostList` uses the shared control behavior for existing pager controls while preserving labels and page behavior; `BackLink` remains unchanged because its ArticleNav-specific visual semantics should not be rewritten by a generic button class.

- [x] **Step 1: Write failing behavior and accessibility tests**

  Cover loading/disabled state, 44px minimum hit-area class contract, field error association, feedback roles, empty action rendering, and unchanged PostList pager labels.

- [x] **Step 2: Run focused tests and confirm they fail**

  Run: `npm test -- --run tests/foundation-feedback.test.tsx`

  Expected: FAIL because the shared components and migrated pager contract do not exist.

- [x] **Step 3: Implement components using existing design tokens**

  Reuse `.btn`, `.btn-sm`, `.btn-ghost`, `.btn-danger`, `.error-text`, `.notice-text`, and `.empty-state` styles. Add only narrowly scoped classes/data attributes required to express loading, tone, and hit-area semantics; do not introduce a new visual card.

- [x] **Step 4: Migrate the low-risk pager and verify affected behavior**

  Replace only PostList pager buttons with `Button`; keep `PAGE_SIZE`, slicing, labels, and disabled rules unchanged. Use `EmptyState` only where the current page already renders a successful empty result, never in loading/error branches.

- [x] **Step 5: Run focused tests, existing list tests, and typecheck**

  Run: `npm test -- --run tests/foundation-feedback.test.tsx tests/article-preview.test.tsx tests/public-forms.test.tsx` and `npm run typecheck`.

  Expected: PASS.

- [x] **Step 6: Commit the shared feedback slice**

  ```powershell
  git add components/Button.tsx components/FormField.tsx components/InlineFeedback.tsx components/EmptyState.tsx app/refinement.css components/PostList.tsx tests/foundation-feedback.test.tsx
  git diff --cached --check
  git commit -m "feat: 统一表单反馈与空状态组件"
  git push origin main
  ```

### Task 3: Extract reusable dialog behavior and remove public confirm dialogs

**Files:**
- Create: `components/DialogBehavior.tsx`
- Create: `components/ConfirmDialog.tsx`
- Modify: `components/Lightbox.tsx`
- Modify: `components/SearchPalette.tsx`
- Modify: `components/admin/AdminConfirmDialog.tsx`
- Modify: `app/moments/page.tsx`
- Modify: `app/guestbook/page.tsx`
- Create: `tests/dialog-behavior.test.tsx`

**Interfaces:**
- `useDialogBehavior({ open, onClose, initialFocusRef? })` returns `{ dialogRef, onKeyDown }`; it traps Tab/Shift+Tab, calls `onClose` on Escape, focuses the first supplied control (or first focusable control), locks body scroll, and restores the opener focus on close.
- `ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, danger? })` renders `role="alertdialog"`, `aria-modal="true"`, labelled title/description, and existing `.admin-dialog-*`/`.btn` visual hooks.
- `useConfirmDialog()` returns `{ confirm(options): Promise<boolean>, dialog }` so moments and guestbook can replace `window.confirm` without moving deletion logic into the dialog component.

- [x] **Step 1: Write failing dialog behavior tests**

  Assert focus entry, Tab wrapping in both directions, Escape cancellation, body overflow restoration, focus return, and promise resolution for confirm/cancel. Add regression assertions that moments and guestbook contain no `window.confirm`.

- [x] **Step 2: Run focused tests and confirm they fail**

  Run: `npm test -- --run tests/dialog-behavior.test.tsx`

  Expected: FAIL because the shared hook/dialog is missing and public pages still use `window.confirm`.

- [x] **Step 3: Implement DialogBehavior and ConfirmDialog**

  Keep all visuals opt-in through existing classes; the hook owns only focus, keyboard, scroll-lock, and opener restoration. Make cleanup idempotent so route changes and unmounts restore the previous body overflow value.

- [x] **Step 4: Migrate existing dialog consumers**

  Refactor Lightbox, SearchPalette, and AdminConfirmDialog to call the shared hook while preserving their current labels, portals, navigation, and focus behavior. Replace public moments/guestbook delete confirmation with `useConfirmDialog`, retaining the existing delete handlers and Chinese copy.

- [x] **Step 5: Run dialog, form, navigation, and reading regressions**

  Run: `npm test -- --run tests/dialog-behavior.test.tsx tests/search-palette.test.tsx tests/reading-ui.test.tsx tests/public-forms.test.tsx tests/site-nav.test.tsx` and `npm run typecheck`.

  Expected: PASS.

- [x] **Step 6: Commit the dialog behavior slice**

  ```powershell
  git add components/DialogBehavior.tsx components/ConfirmDialog.tsx components/Lightbox.tsx components/SearchPalette.tsx components/admin/AdminConfirmDialog.tsx app/moments/page.tsx app/guestbook/page.tsx tests/dialog-behavior.test.tsx
  git diff --cached --check
  git commit -m "refactor: 统一弹层焦点与确认行为"
  git push origin main
  ```

### Task 4: Introduce shared Pagination and migrate collection pagination

**Files:**
- Create: `components/Pagination.tsx`
- Modify: `components/PostList.tsx`
- Modify: `app/guestbook/page.tsx`
- Create: `tests/pagination.test.tsx`

**Interfaces:**
- `Pagination({ page, totalPages, totalItems, onPageChange, previousLabel?, nextLabel?, summary? })` renders disabled previous/next buttons, a stable summary, and no control when `totalPages <= 1`.
- `onPageChange` receives a clamped page in `[1, totalPages]`; buttons expose at least the existing `.pager` hit area and preserve Chinese labels.

- [x] **Step 1: Write failing pagination tests**

  Cover hidden single-page state, first/last disabled states, callback page values, summary text, and keyboard activation through native buttons.

- [x] **Step 2: Run focused tests and confirm they fail**

  Run: `npm test -- --run tests/pagination.test.tsx`

  Expected: FAIL because `Pagination` does not exist.

- [x] **Step 3: Implement Pagination as a controlled component**

  Clamp only emitted pages, keep rendering free of data fetching, and use existing `.pager`, `.pager-info`, and `.pager button:disabled` selectors so the current book-list and guestbook composition remains visually stable.

- [x] **Step 4: Migrate PostList and GuestbookPage**

  Remove only duplicated previous/next markup and local page-button calculations. Preserve `PAGE_SIZE`, `safePage`, scroll restoration, row measurement, guestbook thread ordering, and all labels/error paths.

- [x] **Step 5: Run pagination, layout, and public-form tests**

  Run: `npm test -- --run tests/pagination.test.tsx tests/guestbook-layout-styles.test.ts tests/public-forms.test.tsx tests/article-preview.test.tsx` and `npm run typecheck`.

  Expected: PASS.

- [x] **Step 6: Commit the pagination slice**

  ```powershell
  git add components/Pagination.tsx components/PostList.tsx app/guestbook/page.tsx tests/pagination.test.tsx
  git diff --cached --check
  git commit -m "feat: 统一列表分页组件"
  git push origin main
  ```

### Task 5: Phase 3 verification and checkpoint

**Files:**
- Modify: `tests/foundation-components.test.tsx`
- Modify: `tests/foundation-feedback.test.tsx`
- Modify: `tests/dialog-behavior.test.tsx`
- Modify: `tests/pagination.test.tsx`
- Modify: `docs/superpowers/plans/2026-09-15-site-foundation-behavior.md`

- [x] **Step 1: Add the cross-component contract matrix**

  Assert every exported component/hook remains importable, public delete flows contain no `window.confirm`, dialogs expose modal semantics, feedback roles match tone, and the existing root shell/resource boundaries remain unchanged.

- [x] **Step 2: Run complete verification**

  Run:

  ```powershell
  npm test
  npm run typecheck
  npm run build
  git diff --check
  ```

  Expected: all tests/type checks pass and build exits 0. Existing offline Supabase `fetch failed / EACCES` warnings may appear during static generation but must not change the exit code.

- [x] **Step 3: Browser smoke test behavior and responsive boundaries**

  Use local browser checks at 1440, 1024, 768, 390, 375, and 360px in both themes. Verify search/lightbox/confirm focus and Escape behavior, pagination at first/last page, no public `window.confirm`, and `document.body.scrollWidth` plus `document.documentElement.scrollWidth` do not exceed `window.innerWidth`.

- [x] **Step 4: Commit and automatically push the Phase 3 checkpoint**

  ```powershell
  git add tests/foundation-components.test.tsx tests/foundation-feedback.test.tsx tests/dialog-behavior.test.tsx tests/pagination.test.tsx docs/superpowers/plans/2026-09-15-site-foundation-behavior.md
  git diff --cached --check
  git commit -m "docs: 固化 Phase 3 基础组件验收"
  git push origin main
  git rev-parse HEAD
  git rev-parse origin/main
  git rev-list --left-right --count origin/main...HEAD
  ```
