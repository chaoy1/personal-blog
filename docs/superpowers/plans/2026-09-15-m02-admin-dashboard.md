# M02 Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将 `/admin` 完成​​为稳定、可扫描、可恢复筛选上下文的文章管理总览，同时保留现有管理员 API、权限和删除确认行为。

**Architecture:** 继续使用现有 `AdminPageHead`、`useAdminConfirm`、`useAdminFeedback` 和 `runAdminAction`。页面状态分为首次加载、已有快照刷新、空集合、筛选无结果和错误；已有快照刷新只更新行内容，不清空列表。列表保持文章标题、状态、时间和主操作的明确层级，危险操作在窄屏收进可访问的更多菜单。

**Tech Stack:** Next.js App Router、React client component、TypeScript、Vitest、Testing Library、现有 admin shell/studio CSS。

**Spec:** `docs/superpowers/specs/pages/admin-dashboard-page-design.md`

## Global Constraints

- 保留后台全局壳层、导航、主题切换、查看博客入口、管理员权限保护和现有 API 行为。
- 不新增统计看板、访问分析、批量发布、复杂权限或完整编辑器。
- 状态不能只依赖颜色；所有必要操作 hit area 不小于 44×44px。
- 后台刷新有旧数据时不能清空列表、筛选词或当前视图；错误需保留旧数据。
- 提交只包含 M02 实现、回归测试和本计划文件；已有 P02 本地修改不得暂存。

### Task 1: Establish the M02 regression contract

**Files:**
- Create: `tests/admin-dashboard-page.test.tsx`
- Create: `docs/superpowers/plans/2026-09-15-m02-admin-dashboard.md`

- [x] Write tests for stable filter controls during first loading, semantic page state after data load, visible status text, query filtering without a new request, and preserving the existing row during a refresh request.
- [x] Run `npm test -- --run tests/admin-dashboard-page.test.tsx` and confirm the current implementation fails because it lacks the page state contract, status badge contract, and snapshot-preserving refresh behavior.

### Task 2: Implement snapshot-safe dashboard behavior

**Files:**
- Modify: `app/admin/page.tsx`

- [x] Keep the existing API endpoints and action helpers unchanged.
- [x] Track the first load separately from a same-view refresh; retain the last successful rows while a refresh is pending or fails.
- [x] Keep search and status filters local to the page, debounce search application, and restore `view`, `query`, and `status` from the URL without resetting them during refresh.
- [x] Expose `data-page-state`, stable filter labels, list semantics, explicit published/draft/deleted text, and accessible primary title/edit/preview actions.
- [x] Keep deletion confirmation and row-local action behavior intact, moving destructive actions into a keyboard-accessible more menu on narrow layouts.
- [x] Run `npm test -- --run tests/admin-dashboard-page.test.tsx` and confirm it passes.

### Task 3: Refine the Admin Collection layout

**Files:**
- Modify: `app/studio.css`

- [x] Style the page as a dense open collection rather than large content cards.
- [x] Keep title/status as the first scan, preserve stable operation width, and give loading rows the same approximate height as real rows.
- [x] Add responsive rules for 1024px, 768px, and 375px, including a narrow-screen more menu and 44px operation targets.
- [x] Verify light/dark variables, keyboard focus, and reduced-motion behavior through the existing shared styles.

### Task 4: Verify and deliver M02

**Files:**
- Test: `tests/admin-dashboard-page.test.tsx`
- Test: `tests/app-shell.test.tsx`
- Modify: only the M02 files listed above if a regression is discovered.

- [x] Run the M02 target tests, then `npm run typecheck`, `npm test -- --run`, and `npm run build`.
- [x] Run `git diff --cached --check` and a credential scan after staging only M02 files.
- [ ] Commit with `feat: 完成 M02 后台文章管理页` and push `origin/main`.
- [ ] Verify local SHA equals `origin/main` and `behind_ahead=0 0`; report the three pre-existing P02 failures separately if unchanged.
