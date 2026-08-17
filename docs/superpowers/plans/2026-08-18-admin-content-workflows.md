# Admin Content Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the moments, photos, albums, profile, and login workflows using the shared admin foundation.

**Architecture:** Extend existing REST routes with narrowly scoped update operations, add a minimal photo ordering migration, and keep page components responsible only for composition. Shared feedback, confirmation, deferred deletion, and upload queue handle interaction state.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-complete-site-refinement-design.md`

## Global Constraints

- Requires the admin-foundation and article-workflow plans.
- Failed requests preserve all user input and successfully uploaded items.
- Destructive operations name the affected record and offer undo when deletion has not been sent.
- Database changes must be additive and compatible with existing rows.

---

### Task 1: Editable moments with safe deletion

**Files:**
- Modify: `app/api/admin/moments/[id]/route.ts`
- Modify: `app/admin/moments/page.tsx`
- Test: `tests/moments-api.test.ts`
- Test: `tests/admin-moments.test.tsx`

**Interfaces:**
- Produces: `PUT /api/admin/moments/{id}` accepting `{ content:string, images:string[] }`.

- [ ] **Step 1: Write failing API and page tests**

Assert PUT trims content, rejects empty content plus no images, returns the updated row, and requires admin auth. Assert the page can enter edit mode, preserve upload failures, cancel edits, save changes, and undo deletion before the 5-second deferred action fires.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/moments-api.test.ts tests/admin-moments.test.tsx`
Expected: FAIL because PUT and edit mode do not exist.

- [ ] **Step 3: Implement the route and workflow**

Reuse the current validation from POST. Replace direct fetch/error branches with `runAdminAction`, use `UploadQueue` for images, and use `scheduleDeferredAction` plus a feedback action labelled `撤销` before issuing DELETE.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/moments-api.test.ts tests/admin-moments.test.tsx`
Expected: PASS.

```bash
git add app/api/admin/moments/[id]/route.ts app/admin/moments/page.tsx tests/moments-api.test.ts tests/admin-moments.test.tsx
git commit -m "feat: improve admin moments workflow"
```

### Task 2: Photo metadata and ordering API

**Files:**
- Create: `supabase/schema-v9.sql`
- Modify: `app/api/admin/photos/route.ts`
- Modify: `app/api/admin/photos/[id]/route.ts`
- Test: `tests/photos-api.test.ts`

**Interfaces:**
- Produces: `photos.sort_order integer not null default 0`
- Produces: `PATCH /api/admin/photos/{id}` accepting `{ caption?, album_id?, sort_order? }`.

- [ ] **Step 1: Write the migration and failing route tests**

```sql
alter table public.photos add column if not exists sort_order integer not null default 0;
create index if not exists photos_album_sort_idx on public.photos(album_id, sort_order, created_at desc);
```

Test PATCH authorization, caption trimming, nullable album ID, integer sort order, and ordered GET results.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/photos-api.test.ts`
Expected: FAIL because PATCH and `sort_order` are absent.

- [ ] **Step 3: Implement API support**

Select and return `sort_order`, order ascending by it then descending by `created_at`, and update only keys present in the PATCH body.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/photos-api.test.ts`
Expected: PASS.

```bash
git add supabase/schema-v9.sql app/api/admin/photos/route.ts app/api/admin/photos/[id]/route.ts tests/photos-api.test.ts
git commit -m "feat: add photo metadata ordering"
```

### Task 3: Batch photo staging and album editing

**Files:**
- Modify: `app/admin/photos/page.tsx`
- Modify: `app/api/admin/albums/[id]/route.ts`
- Create: `components/admin/PhotoStagingGrid.tsx`
- Test: `tests/admin-photos.test.tsx`
- Test: `tests/albums-api.test.ts`

**Interfaces:**
- Produces: `PATCH /api/admin/albums/{id}` accepting `{ title:string, description:string }`.
- Consumes: `UploadQueue`, photo PATCH API, `useAdminConfirm`.

- [ ] **Step 1: Write failing workflow tests**

Assert selected files appear before upload, each item has caption/album controls, failed items remain retryable, successful items save once, photo edits PATCH in place, and album edit validates a non-empty title. Assert deleting an album states that photos remain.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/admin-photos.test.tsx tests/albums-api.test.ts`
Expected: FAIL because staging and album PATCH are absent.

- [ ] **Step 3: Implement staging and editing**

Do not upload on file selection. Start only from `确认上传`; upload at concurrency two, POST each completed URL with its item metadata, retain failed items, and refresh after all requests settle. Add inline photo metadata editing, album edit form, and ordering controls that PATCH `sort_order`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/admin-photos.test.tsx tests/albums-api.test.ts`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/admin/photos/page.tsx app/api/admin/albums/[id]/route.ts components/admin/PhotoStagingGrid.tsx tests/admin-photos.test.tsx tests/albums-api.test.ts
git commit -m "feat: improve photo and album management"
```

### Task 4: Profile dirty state and login return path

**Files:**
- Modify: `app/admin/profile/page.tsx`
- Modify: `app/admin/login/page.tsx`
- Modify: `middleware.ts`
- Test: `tests/admin-profile.test.tsx`
- Test: `tests/admin-login.test.tsx`

**Interfaces:**
- Produces: login query parameter `next` restricted to paths beginning with `/admin`.

- [ ] **Step 1: Write failing tests**

Assert profile shows `有未保存更改`, clears it after success, preserves values on failure, and exposes `查看前台资料`. Assert an unauthorized `/admin/photos` visit becomes `/admin/login?next=%2Fadmin%2Fphotos`, successful login returns there, and an external `next` value falls back to `/admin`.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/admin-profile.test.tsx tests/admin-login.test.tsx`
Expected: FAIL because dirty state and safe return routing are absent.

- [ ] **Step 3: Implement profile/login behavior**

Compare editable fields against the loaded profile snapshot. Route all saves through `runAdminAction`. Sanitize `next` with `next.startsWith('/admin') && !next.startsWith('//')` before `router.replace`.

- [ ] **Step 4: Full verification and commit**

Run: `npm test`
Run: `npm run typecheck`
Run: `npm run build`
Expected: all commands exit 0.

Browser-check moments edit/undo, partial upload retry, photo move/order/edit, album edit/delete message, profile failure recovery, expired-session return, desktop/mobile, and both themes.

```bash
git add app/admin/profile/page.tsx app/admin/login/page.tsx middleware.ts tests/admin-profile.test.tsx tests/admin-login.test.tsx
git commit -m "feat: complete admin content workflows"
```
