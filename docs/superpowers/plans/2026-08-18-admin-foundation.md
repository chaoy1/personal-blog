# Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared visual and interaction foundation for a reliable, airy “mountain desk” admin experience.

**Architecture:** Introduce focused admin primitives for feedback, confirmation, and async state, then restyle the existing shell without changing route ownership. All content workflows consume these primitives.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-complete-site-refinement-design.md`

## Global Constraints

- Requires the test foundation from the public-site plan.
- Keep the existing `ThemeToggle` component and its day/night behavior.
- Desktop top actions remain directly visible; no ellipsis menu for core actions.
- Replace browser-native confirmations with an accessible in-site dialog.

---

### Task 1: Feedback provider and async action model

**Files:**
- Create: `components/admin/AdminFeedback.tsx`
- Create: `lib/admin-action.ts`
- Modify: `app/admin/layout.tsx`
- Test: `tests/admin-feedback.test.tsx`
- Test: `tests/admin-action.test.ts`

**Interfaces:**
- Produces: `AdminFeedbackProvider`, `useAdminFeedback()`
- Produces: `runAdminAction<T>(request, options): Promise<T>`

- [ ] **Step 1: Write failing tests**

Assert `runAdminAction` parses JSON errors, throws `AdminActionError(status,message)`, and calls an unauthorized callback for 401. Render the provider, call `notify({kind:'success', message:'已保存'})`, and assert an `aria-live="polite"` notice appears.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/admin-action.test.ts tests/admin-feedback.test.tsx`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement primitives**

```ts
type Notice = { id: string; kind: 'success'|'error'|'info'; message: string; action?: { label:string; run:()=>void } }
type RunOptions = { onUnauthorized?: () => void }
async function runAdminAction<T>(request: Promise<Response>, options?: RunOptions): Promise<T>
```

Auto-dismiss success/info notices after 5 seconds; keep errors until dismissed. Mount the provider around the admin shell.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/admin-action.test.ts tests/admin-feedback.test.tsx`
Expected: PASS.

```bash
git add components/admin/AdminFeedback.tsx lib/admin-action.ts app/admin/layout.tsx tests/admin-feedback.test.tsx tests/admin-action.test.ts
git commit -m "feat: add shared admin feedback"
```

### Task 2: Accessible confirmation and delayed undo

**Files:**
- Create: `components/admin/AdminConfirmDialog.tsx`
- Create: `lib/deferred-action.ts`
- Test: `tests/admin-confirm-dialog.test.tsx`
- Test: `tests/deferred-action.test.ts`

**Interfaces:**
- Produces: `useAdminConfirm(): { confirm(options): Promise<boolean>; dialog: ReactNode }`
- Produces: `scheduleDeferredAction(run, delayMs): { cancel(): void; flush(): Promise<void> }`

- [ ] **Step 1: Write failing tests**

Test dialog focus moves to Cancel, Tab stays inside, Escape resolves false, Confirm resolves true, and focus returns to the trigger. With fake timers, test cancel prevents the deferred request and flush runs it once.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/admin-confirm-dialog.test.tsx tests/deferred-action.test.ts`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement and verify**

Use `role="alertdialog"`, `aria-modal="true"`, labelled title/description, a destructive confirmation button, and focus restoration.

Run: `npm test -- tests/admin-confirm-dialog.test.tsx tests/deferred-action.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminConfirmDialog.tsx lib/deferred-action.ts tests/admin-confirm-dialog.test.tsx tests/deferred-action.test.ts
git commit -m "feat: add safe admin confirmations"
```

### Task 3: Confirmed V6 admin shell

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `components/AdminNav.tsx`
- Modify: `components/AdminHeader.tsx`
- Modify: `app/studio.css`
- Test: `tests/admin-shell.test.tsx`

**Interfaces:**
- Consumes: existing `ThemeToggle`
- Produces: directly visible top links for blog, profile/account, logout, and theme.

- [ ] **Step 1: Write failing shell tests**

Assert the admin shell renders direct links named `查看博客` and `资料`, a `退出登录` button, and the theme switch; assert there is no generic ellipsis menu.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/admin-shell.test.tsx`
Expected: FAIL because the current shell uses a fixed sidebar layout and lacks the confirmed action arrangement.

- [ ] **Step 3: Implement the mountain-desk shell**

Keep the route list and component responsibilities. Use low-contrast `qianli-bridge.jpg`, paper mist, responsive tabs, staggered paper rows, subtle filters/status, and page-footer statistics. On desktop, lay out all top actions in one row; on mobile, wrap them into the visible mobile admin navigation.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/admin-shell.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

Browser-check `/admin`, `/admin/moments`, `/admin/photos`, `/admin/profile` at desktop and 390px in both themes.

```bash
git add app/admin/layout.tsx components/AdminNav.tsx components/AdminHeader.tsx app/studio.css tests/admin-shell.test.tsx
git commit -m "style: refine admin mountain desk shell"
```

### Task 4: Shared upload queue

**Files:**
- Create: `lib/upload-queue.ts`
- Create: `components/admin/UploadQueue.tsx`
- Test: `tests/upload-queue.test.ts`
- Test: `tests/upload-queue-component.test.tsx`

**Interfaces:**
- Produces: `UploadItem = { id,file,status:'pending'|'uploading'|'done'|'error',progress,url?,error? }`
- Produces: `useUploadQueue({ bucket, concurrency }): UploadQueueController`
- `UploadQueueController = { items:UploadItem[]; busy:boolean; enqueue(files:File[]):void; remove(id:string):void; retry(id:string):void; start():Promise<UploadItem[]>; clearCompleted():void }`

- [ ] **Step 1: Write failing queue tests**

Test enqueue order, maximum concurrency of two, per-item success/error, remove-before-upload, and retry of only failed items.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/upload-queue.test.ts tests/upload-queue-component.test.tsx`
Expected: FAIL because the queue does not exist.

- [ ] **Step 3: Implement queue and preview UI**

Upload to `/api/admin/upload` with `bucket` and `file`. Expose `enqueue`, `remove`, `retry`, `start`, `clearCompleted`, and aggregate busy state. The component announces progress with `aria-live` and preserves failed items.

- [ ] **Step 4: Verify, build, and commit**

Run: `npm test -- tests/upload-queue.test.ts tests/upload-queue-component.test.tsx`
Run: `npm run typecheck`
Expected: PASS.

```bash
git add lib/upload-queue.ts components/admin/UploadQueue.tsx tests/upload-queue.test.ts tests/upload-queue-component.test.tsx
git commit -m "feat: add resilient admin upload queue"
```
