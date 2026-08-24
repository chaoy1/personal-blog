# Article Draft Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make article writing recoverable across browser closes and devices with local backup, debounced server drafts, conflict handling, preview, and clear save status.

**Architecture:** Keep local backup logic pure and storage-backed, isolate synchronization in a hook, and reuse the existing unpublished `posts` records for server drafts. The editor remains the UI owner while API routes remain persistence owners.

**Tech Stack:** Next.js 15, React 19, TypeScript, localStorage, Supabase, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-complete-site-refinement-design.md`

## Global Constraints

- Requires the admin-foundation plan.
- Local backup happens immediately; server sync starts 1.5 seconds after input becomes idle.
- Never silently overwrite a newer local or server version.
- Saving a draft keeps the user in the editor.

---

### Task 1: Local article backup model

**Files:**
- Create: `lib/article-draft.ts`
- Test: `tests/article-draft.test.ts`

**Interfaces:**
- Produces: `ArticleDraftSnapshot`
- Produces: `draftKey(id: string | null, clientId: string): string`
- Produces: `readDraft`, `writeDraft`, `removeDraft`, `compareDrafts`

- [ ] **Step 1: Write failing model tests**

```ts
type ArticleDraftSnapshot = {
  version: 2; clientId: string; postId: string|null; title: string; slug: string;
  excerpt: string; content: string; published: boolean; updatedAt: string
}
```

Test valid round-trip, corrupt JSON removal, schema-version rejection, and comparison results `'local-newer'|'server-newer'|'same'`.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/article-draft.test.ts`
Expected: FAIL because `lib/article-draft.ts` does not exist.

- [ ] **Step 3: Implement storage helpers**

Use prefix `admin-article-draft-v2:`. Parse defensively, require every field, compare ISO timestamps, and never throw when storage is unavailable.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/article-draft.test.ts`
Expected: PASS.

```bash
git add lib/article-draft.ts tests/article-draft.test.ts
git commit -m "feat: add local article draft backups"
```

### Task 2: Debounced server synchronization

**Files:**
- Create: `components/admin/useArticleDraftSync.ts`
- Test: `tests/article-draft-sync.test.tsx`

**Interfaces:**
- Produces: `useArticleDraftSync(input): { status, lastSavedAt, flush, discardLocal, restoreLocal }`
- Status: `'idle'|'local-saved'|'server-saving'|'server-saved'|'error'|'conflict'`
- Input: `{ snapshot:ArticleDraftSnapshot; onPostId(id:string):void; onUnauthorized():void }`
- `flush(published?:boolean): Promise<{ postId:string; updatedAt:string }>`
- `discardLocal():void`; `restoreLocal():ArticleDraftSnapshot|null`

- [ ] **Step 1: Write failing hook tests**

With fake timers, assert local write occurs immediately, no server request occurs before 1500ms, a titled new draft POSTs once, subsequent changes PUT the returned ID, manual `flush()` saves immediately, and 401 keeps the local snapshot.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/article-draft-sync.test.tsx`
Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

POST `/api/admin/posts` with `published:false` once `title.trim()` is non-empty; PUT `/api/admin/posts/{id}` thereafter. Abort stale requests, serialize saves, and keep the newest queued snapshot. Expose conflict state when server `updated_at` is newer than the loaded local snapshot.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/article-draft-sync.test.tsx`
Expected: PASS.

```bash
git add components/admin/useArticleDraftSync.ts tests/article-draft-sync.test.tsx
git commit -m "feat: sync article drafts safely"
```

### Task 3: Editor integration and unsaved-change protection

**Files:**
- Modify: `app/admin/editor/page.tsx`
- Create: `components/admin/DraftRecoveryDialog.tsx`
- Test: `tests/editor-draft-flow.test.tsx`

**Interfaces:**
- Consumes: `useArticleDraftSync`, `useAdminFeedback`, `useAdminConfirm`
- Produces: visible save timestamp and recovery choices.

- [ ] **Step 1: Write failing editor tests**

Test recovery dialog for newer local content, `恢复本地版本`, `使用服务器版本`, visible `已保存于 HH:mm`, draft save staying on the editor route, and a before-unload warning only while unsaved.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/editor-draft-flow.test.tsx`
Expected: FAIL because the editor redirects after every save and lacks recovery UI.

- [ ] **Step 3: Integrate synchronization**

Replace the editor's direct save state with the hook. `保存草稿` calls `flush(false)` and stays; `发布文章` calls `flush(true)`, removes local backup after success, and exposes `查看文章` plus `继续编辑`. Keep the existing Markdown toolbar, tones, and immersive mode.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/editor-draft-flow.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/admin/editor/page.tsx components/admin/DraftRecoveryDialog.tsx tests/editor-draft-flow.test.tsx
git commit -m "feat: integrate recoverable article editing"
```

### Task 4: Protected draft preview

**Files:**
- Create: `app/admin/preview/[id]/page.tsx`
- Create: `components/admin/ArticlePreview.tsx`
- Modify: `app/admin/editor/page.tsx`
- Test: `tests/article-preview.test.tsx`

**Interfaces:**
- Produces: authenticated `/admin/preview/{id}` rendering unpublished content.

- [ ] **Step 1: Write failing preview tests**

Mock `getPostById`; assert title, excerpt, Markdown body, draft banner, and return-to-editor link render. Assert a missing post uses `notFound()`.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/article-preview.test.tsx`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement preview and editor action**

Require the existing admin session in the route, render through `MarkdownView`, and open only after `flush(false)` returns a post ID.

- [ ] **Step 4: Final verification and commit**

Run: `npm test -- tests/article-draft.test.ts tests/article-draft-sync.test.tsx tests/editor-draft-flow.test.tsx tests/article-preview.test.tsx`
Run: `npm run typecheck`
Run: `npm run build`
Expected: all commands exit 0.

Browser-check close/reopen recovery, server resume, conflict selection, offline failure, preview, draft save, and publish.

```bash
git add app/admin/preview components/admin/ArticlePreview.tsx app/admin/editor/page.tsx tests/article-preview.test.tsx
git commit -m "feat: add protected article draft preview"
```
