# Site Global Layout and Data Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将根布局拆成 Public、Auth、Admin shell，并把留言、闲语、相册和文章评论的数据请求限制在各自路由范围内，同时保留现有 URL、业务动作和 `useAppStore` 兼容导出。

**Architecture:** 根布局只挂载认证上下文和按 pathname 选择的全局壳层。`SiteNav`、账户页和后台共享 `AuthProvider`；`MomentsProvider`、`AlbumsProvider`、`GuestbookProvider` 和带 slug 的 `CommentsProvider` 分别由对应 route layout 挂载。旧的 `AppStoreProvider` 与 `useAppStore` 保留为兼容层，但不再由根布局使用，也不再成为新页面的默认数据入口。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Supabase browser client, Vitest, Testing Library, global CSS.

**Spec:** `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`（Phase 2：Global Layout 与数据边界）

## Global Constraints

- 保留 `public/bg/qianli-bridge.jpg` 满幅山水背景及现有昼夜氛围。
- URL 和业务接口保持不变，不修改 Supabase 数据结构、RLS、认证协议和上传接口。
- 客户端只加载当前页面真正需要的数据，不因根级 Provider 请求全部业务数据。
- Auth Shell 和 Admin Shell 不继承公共山水内容布局与页面数据请求。
- 迁移过程中保留现有公开方法兼容层，不一次性重写稳定业务逻辑。
- 每批改动独立测试、提交、推送，Vercel 部署状态单独确认。

---

### Task 1: Establish the auth context and shell boundary

**Files:**
- Create: `lib/store-types.ts`
- Create: `lib/auth-context.tsx`
- Create: `components/AppShell.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/app-shell.test.tsx`
- Test: `tests/auth-context-contract.test.ts`

**Interfaces:**
- `AuthProvider({ children }: { children: ReactNode }): JSX.Element`
- `useAuth(): AuthContextValue`, exposing `ready`, `error`, `user`, `profile`, `isOwner`, `signOut`, and `updateProfile`.
- `AppShell({ children }: { children: ReactNode }): JSX.Element`.
- `getShellKind(pathname: string): 'public' | 'auth' | 'admin'`.

- [x] **Step 1: Write failing shell and auth contract tests**

  Assert that `getShellKind` classifies `/`, `/posts`, `/login`, `/account`, and `/admin/editor` correctly; render the real `AppShell` with mocked visual children and assert admin/auth shells do not mount public background layers. Assert `app/layout.tsx` imports `AuthProvider` and `AppShell`, not `AppStoreProvider`.

- [x] **Step 2: Run the focused tests and confirm they fail for the missing boundary**

  Run: `npm test -- --run tests/app-shell.test.tsx tests/auth-context-contract.test.ts`

  Expected: FAIL because `AppShell`, `getShellKind`, and `AuthProvider` do not exist and the root layout still mounts `AppStoreProvider`.

- [x] **Step 3: Implement the auth context and pathname shell**

  Move only authentication/profile state and actions into `lib/auth-context.tsx`; keep initialization, `onAuthStateChange`, profile loading, sign-out, and profile update behavior unchanged. In `AppShell`, use `usePathname()` and render `BackgroundStage`, `vignette`, `grain`, `ScrollTop`, `SiteNav`, and `Lightbox` only for the public shell; keep `SiteNav` available for auth pages but omit public ambient layers for auth/admin; render children unchanged for all modes.

- [x] **Step 4: Replace the root provider with the auth provider and shell**

  In `app/layout.tsx`, replace:

  ```tsx
  <AppStoreProvider>
    <BackgroundStage />
    <div className="vignette" aria-hidden="true" />
    <div className="grain" aria-hidden="true" />
    <ScrollTop />
    <SiteNav />
    {children}
    <Lightbox />
  </AppStoreProvider>
  ```

  with:

  ```tsx
  <AuthProvider>
    <AppShell>{children}</AppShell>
  </AuthProvider>
  ```

- [x] **Step 5: Run the focused tests and existing shell tests**

  Run: `npm test -- --run tests/app-shell.test.tsx tests/auth-context-contract.test.ts tests/site-nav.test.tsx tests/background-stage.test.tsx`

  Expected: PASS, with no change to SiteNav navigation behavior.

- [x] **Step 6: Commit and push the shell slice**

  ```powershell
  git add lib/store-types.ts lib/auth-context.tsx components/AppShell.tsx app/layout.tsx tests/app-shell.test.tsx tests/auth-context-contract.test.ts
  git diff --cached --check
  git commit -m "refactor: 分离全局认证与页面壳层"
  git push origin main
  ```

### Task 2: Add route-scoped resource providers

**Files:**
- Create: `lib/moments-context.tsx`
- Create: `lib/albums-context.tsx`
- Create: `lib/guestbook-context.tsx`
- Create: `lib/comments-context.tsx`
- Modify: `app/moments/layout.tsx`
- Modify: `app/album/layout.tsx`
- Modify: `app/guestbook/layout.tsx`
- Create: `app/posts/[slug]/layout.tsx`
- Test: `tests/route-resource-boundaries.test.tsx`

**Interfaces:**
- `MomentsProvider` and `useMoments()` own moments, moment comments, moment likes, and their existing actions.
- `AlbumsProvider` and `useAlbums()` own albums, photos, and their existing album/photo actions.
- `GuestbookProvider` and `useGuestbook()` own guestbook rows and guestbook actions.
- `CommentsProvider({ slug, children })` and `useComments()` own only comments for the supplied `slug`.

- [x] **Step 1: Write failing provider boundary tests**

  Mount each provider with a deterministic Supabase mock and assert that the moments provider queries `moments` plus its dependent comment/like tables, the albums provider queries `albums` and `photos`, the guestbook provider queries `guestbook`, and the comments provider adds `.eq('post_slug', slug)`. Assert that provider initialization does not query unrelated tables.

- [x] **Step 2: Run the focused tests and confirm they fail**

  Run: `npm test -- --run tests/route-resource-boundaries.test.tsx`

  Expected: FAIL because the route providers and route layout mounts do not exist.

- [x] **Step 3: Extract each resource loader and action without behavior changes**

  Preserve the existing Supabase select strings, ordering, limits, error prefixes, optimistic like/comment updates, and action return values. Each provider owns a `ready`, `error`, resource state, `refresh`, and cleanup-safe initialization effect. `CommentsProvider` must query the current post only:

  ```ts
  sb.from('comments')
    .select('id, post_slug, user_id, parent_id, content, created_at, profiles!comments_user_id_fkey(nickname, avatar_url)')
    .eq('post_slug', slug)
    .order('created_at', { ascending: true })
    .limit(3000)
  ```

- [x] **Step 4: Mount providers in route layouts**

  Wrap the existing page children only in their relevant layout. The dynamic post layout passes its route `slug` to `CommentsProvider`; it must not change the `/posts/[slug]` URL or metadata behavior.

- [x] **Step 5: Run boundary and affected page tests**

  Run: `npm test -- --run tests/route-resource-boundaries.test.tsx tests/public-forms.test.tsx tests/about-page.test.tsx tests/reading-ui.test.tsx`

  Expected: PASS; public page behavior remains unchanged while unrelated resource queries disappear from route initialization.

- [x] **Step 6: Commit and push the resource slice**

  ```powershell
  git add lib/moments-context.tsx lib/albums-context.tsx lib/guestbook-context.tsx lib/comments-context.tsx app/moments/layout.tsx app/album/layout.tsx app/guestbook/layout.tsx app/posts/[slug]/layout.tsx tests/route-resource-boundaries.test.tsx
  git diff --cached --check
  git commit -m "refactor: 按路由隔离内容数据请求"
  git push origin main
  ```

### Task 3: Migrate consumers and preserve the compatibility facade

**Files:**
- Modify: `components/SiteNav.tsx`
- Modify: `app/account/page.tsx`
- Modify: `app/moments/page.tsx`
- Modify: `app/album/page.tsx`
- Modify: `app/guestbook/page.tsx`
- Modify: `components/Comments.tsx`
- Modify: `lib/app-store.tsx`
- Modify: `tests/site-nav.test.tsx`
- Modify: `tests/public-forms.test.tsx`
- Create: `tests/app-store-compatibility.test.ts`

**Interfaces:**
- Public consumers use `useAuth`, `useMoments`, `useAlbums`, `useGuestbook`, or `useComments` directly.
- `lib/app-store.tsx` re-exports types and providers and keeps `AppStoreProvider`/`useAppStore` for legacy consumers; the compatibility provider may compose the resource providers, but the root layout must not use it.

- [x] **Step 1: Write failing consumer and compatibility tests**

  Assert the consumer imports point to their narrow context, the compatibility exports remain available, and a legacy consumer can still read the combined shape when wrapped in the compatibility provider.

- [x] **Step 2: Run the focused tests and confirm they fail**

  Run: `npm test -- --run tests/app-store-compatibility.test.ts tests/site-nav.test.tsx tests/public-forms.test.tsx`

  Expected: FAIL because consumers still import `useAppStore` and the compatibility facade has not been extracted.

- [x] **Step 3: Migrate consumers to narrow hooks**

  Replace only the store destructuring in each consumer; keep markup, form state, action handlers, and existing error messages unchanged. `SiteNav` and account use `useAuth`; moments, album, guestbook, and comments use their matching resource context plus `useAuth` where user identity is needed.

- [x] **Step 4: Implement the compatibility facade**

  Re-export the extracted types/providers and compose the old combined return shape from the narrow contexts. Use optional context reads for legacy chrome consumers that do not mount a content provider, while resource pages receive their actual provider state. Do not add a second fetch path.

- [x] **Step 5: Run all consumer and behavior tests**

  Run: `npm test -- --run tests/app-store-compatibility.test.ts tests/site-nav.test.tsx tests/public-forms.test.tsx tests/about-page.test.tsx tests/reading-ui.test.tsx`

  Expected: PASS with existing auth, form, comment, like, delete, and navigation behavior intact.

- [x] **Step 6: Commit and push the consumer slice**

  ```powershell
  git add components/SiteNav.tsx app/account/page.tsx app/moments/page.tsx app/album/page.tsx app/guestbook/page.tsx components/Comments.tsx lib/app-store.tsx tests/site-nav.test.tsx tests/public-forms.test.tsx tests/app-store-compatibility.test.ts
  git diff --cached --check
  git commit -m "refactor: 迁移页面到窄数据上下文"
  git push origin main
  ```

### Task 4: Validate shell/data boundaries and publish the phase checkpoint

**Files:**
- Modify: `tests/app-shell.test.tsx`
- Modify: `tests/route-resource-boundaries.test.tsx`
- Modify: `docs/superpowers/plans/2026-09-15-site-global-layout-data-boundary.md`

- [x] **Step 1: Add the full route matrix assertions**

  Cover public `/`, `/posts`, `/moments`, `/album`, `/timeline`, `/guestbook`, `/about`; auth `/login`, `/account`; admin `/admin`, `/admin/editor`; and dynamic `/posts/[slug]`. Assert the root layout has no `AppStoreProvider`, route layouts own their resource providers, and all compatibility exports remain present.

- [x] **Step 2: Run the complete verification suite**

  Run:

  ```powershell
  npm test
  npm run typecheck
  npm run build
  git diff --check
  ```

  Expected: all tests and type checks pass; build exits 0. Existing offline Supabase `fetch failed / EACCES` warnings may appear during static generation but must not change the exit code.

- [x] **Step 3: Browser smoke test the target matrix**

  Use the local browser at 1440, 1024, 768, 390, 375, and 360px in both themes. Check public ambient layers, auth/admin shell separation, route content, `document.body.scrollWidth`, `document.documentElement.scrollWidth`, and the post comment flow. Then inspect the public deployment after Vercel finishes.

- [x] **Step 4: Commit and push the Phase 2 checkpoint**

  ```powershell
  git add tests/app-shell.test.tsx tests/route-resource-boundaries.test.tsx docs/superpowers/plans/2026-09-15-site-global-layout-data-boundary.md
  git diff --cached --check
  git commit -m "docs: 固化 Phase 2 布局与数据边界验收"
  git push origin main
  git rev-parse HEAD
  git rev-parse origin/main
  git rev-list --left-right --count origin/main...HEAD
  ```

## Verification Notes

- Do not use `git add -A`; stage only the task files listed above.
- Preserve unrelated untracked files and user worktree changes.
- GitHub push success is separate from Vercel deployment success.
