# M03 Admin Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将 `/admin/editor` 收束为以正文写作为中心、保存状态始终可见、加载和冲突状态明确的 Writing Workspace。

**Architecture:** 保留现有 `useArticleDraftSync`、Markdown textarea、预览、草稿恢复 Dialog、冲突状态和保存/发布 API。页面只增加编排状态与可访问语义：编辑文章先完成远端加载再开放输入；新建文章直接进入 ready；快捷键和顶栏操作调用现有 flush，不复制保存逻辑。

**Tech Stack:** Next.js App Router、React client component、TypeScript、Vitest、Testing Library、现有 admin studio CSS。

**Spec:** `docs/superpowers/specs/pages/admin-editor-page-design.md`

## Global Constraints

- 必须保留新建/编辑、Markdown、预览、保存草稿、发布、本地恢复、离开保护和冲突处理。
- 不更换 Markdown 编辑器内核，不修改文章 schema、发布流程或资源存储策略。
- 保存状态与发布状态分离；发布不能由普通保存意外触发。
- 加载、错误、冲突、发布中/成功/失败不能静默混为普通空表单。
- 375px 必须能完成标题、正文和保存，不能产生横向溢出。
- 提交只包含 M03 实现、回归测试和本计划文件；已有 P02 本地修改不得暂存。

### Task 1: Establish the editor regression contract

**Files:**
- Create: `tests/admin-editor-page.test.tsx`
- Create: `docs/superpowers/plans/2026-09-15-m03-admin-editor.md`

- [x] Write tests for ready new-document semantics, non-editable edit loading, draft save/publish state feedback, and Ctrl/Cmd+S invoking the existing draft flush.
- [x] Run `npm test -- --run tests/admin-editor-page.test.tsx` and confirm the current implementation fails because it lacks page state, loading gate, top-level save state, and shortcut behavior.

### Task 2: Implement editor state orchestration

**Files:**
- Modify: `app/admin/editor/page.tsx`

- [x] Add explicit ready/loading/error page states without changing the existing post request or draft-sync contract.
- [x] Keep the edit form locked behind the initial fetch, preserve entered content on save/publish failures, and offer a retry for load failures.
- [x] Add accessible labels, visible save status, separate publish status, and Ctrl/Cmd+S handling that prevents the browser save dialog.
- [x] Keep preview, local draft recovery, conflict decisions, unauthorized redirect, and leave protection connected to their existing implementations.
- [x] Run `npm test -- --run tests/admin-editor-page.test.tsx` and confirm it passes.

### Task 3: Refine the Writing Workspace layout

**Files:**
- Modify: `app/studio.css`

- [x] Keep the writing canvas dominant and make metadata a restrained foldable section.
- [x] Keep topbar save state and core actions reachable at desktop and mobile widths.
- [x] Add loading skeleton, error surface, focus-visible states, and 375px rules without changing the established paper/night editor tones.
- [x] Verify reduced-motion behavior through shared motion rules.

### Task 4: Verify and deliver M03

**Files:**
- Test: `tests/admin-editor-page.test.tsx`
- Modify: only the M03 files listed above if a regression is discovered.

- [x] Run target tests, then `npm run typecheck`, `npm test -- --run`, and `npm run build`.
- [x] Run staged diff check and credential scan with only M03 files staged.
- [ ] Commit with `feat: 完成 M03 文章编辑器` and push `origin/main`.
- [ ] Verify local SHA equals `origin/main` and `behind_ahead=0 0`; report unchanged P02 failures separately.
