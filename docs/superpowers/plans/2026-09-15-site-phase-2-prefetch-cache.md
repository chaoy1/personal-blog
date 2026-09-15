# Phase 2 数据预取与会话缓存实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or **superpowers:executing-plans** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持现有 Public/Auth/Admin Shell、路由和视觉系统不变的前提下，为闲语、相册、留言簿和文章评论建立服务端首屏快照、标签页会话缓存、请求去重、意图预取和 stale-while-revalidate 生命周期，消除返回页面时的空列表与内容跳变。

**Architecture:** 根布局只挂载一个不主动请求的 `PublicResourceCacheProvider`；四个资源 route layout 在服务端读取可序列化快照并注入各自 Provider。Provider 保留现有领域 hook 和 mutation API，但将数据视图改为共享缓存的 `read/subscribe/seed/preload/revalidate/setData/invalidate`，浏览器 loader 负责后台读取，导航组件负责按网络条件触发路由和单文章评论预取。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Supabase JS、Vitest、Testing Library、现有 `InlineFeedback`/`EmptyState`/`Pagination`/`ConfirmDialog` 基础组件。

**Spec:** `docs/superpowers/specs/2026-09-15-site-phase-2-prefetch-cache-design.md`

## Global Constraints

- 服务端快照文件使用 `server-only`，只传递可序列化数据，不能包含 Supabase Client、Error 实例、函数或 Promise。
- 不恢复旧的根级全量 AppStore；`AuthProvider` 继续独立管理认证状态。
- 不引入 Redux、SWR、TanStack Query、`localStorage` 或 IndexedDB。
- 不修改 Supabase schema、RLS、认证、上传、后台接口、页面 URL、Metadata、SEO、ISR 语义和视觉设计系统。
- 服务端沿用当前 Supabase select、字段、排序和 limit；浏览器 loader 与现有 Provider 请求保持相同数据形状。
- 缓存只存在于当前浏览器标签页的 React 生命周期中；每个资源只允许一个并发 Promise。
- 缓存过期时先保留旧数据再后台刷新；刷新不能清空数组、重置页码、关闭表单或重置相册内部视图。
- Auth/Admin 页面不主动加载或预取公共资源。
- 每个独立批次都先写失败测试，再写最小实现，再运行针对性测试；每批完成后单独提交。
- 推送前只暂存本阶段明确列出的文件，不使用 `git add -A`，并执行 `npm test`、`npm run typecheck`、`npm run build`、`git diff --check`。

## 文件边界

创建以下文件：

- `lib/public-resource-types.ts`：共享的 `ServerSnapshot`、资源快照和资源 key 类型，不导入 server-only 模块。
- `lib/public-resource-cache.tsx`：单标签页缓存 store、订阅、去重、TTL、LRU 和根级惰性 Provider。
- `lib/public-resource-loaders.server.ts`：四个服务端快照读取器以及服务端错误的可序列化处理。
- `lib/public-resource-loaders.browser.ts`：四个浏览器 revalidate 读取器。
- `components/ResourcePrefetchLink.tsx`：Next 路由预取和 hover/focus/pointerdown 意图预取封装。
- `tests/public-resource-cache.test.tsx`：缓存生命周期、Provider 快照和 mutation 行为。
- `tests/public-route-prefetch.test.tsx`：导航、网络条件和文章 slug 预取契约。

修改以下文件：

- `lib/store-types.ts`：加入四个可序列化资源快照类型。
- `app/layout.tsx`：在认证 Provider 内挂载不发请求的缓存 Provider。
- `lib/moments-context.tsx`、`lib/albums-context.tsx`、`lib/guestbook-context.tsx`、`lib/comments-context.tsx`：从 route-local state 迁移到共享缓存视图与动作。
- `app/moments/layout.tsx`、`app/album/layout.tsx`、`app/guestbook/layout.tsx`、`app/posts/[slug]/layout.tsx`：增加异步服务端快照注入，错误时仍渲染 Provider。
- `components/SiteNav.tsx`、`components/PostList.tsx`、`app/page.tsx`、`app/posts/[slug]/page.tsx`：接入固定公共入口和文章评论意图预取。
- `app/moments/page.tsx`、`app/album/page.tsx`、`app/guestbook/page.tsx`、`components/Comments.tsx`：按首次加载、后台刷新、阻塞错误和 EmptyState 区分渲染。
- `lib/app-store.tsx`：仅为兼容 facade 增加缓存 Provider 包装，不增加请求和资源 state。
- `tests/route-resource-boundaries.test.tsx`：断言缓存边界、服务端快照边界和 route provider 结构。

不修改 `components/AppShell.tsx` 的业务职责；不把当前工作区中与本阶段无关的未跟踪或未提交文件加入任何提交。

---

### Task 1: 建立共享快照类型与会话缓存 Store

**Files:**
- Create: `lib/public-resource-types.ts`
- Create: `lib/public-resource-cache.tsx`
- Modify: `lib/store-types.ts`
- Test: `tests/public-resource-cache.test.tsx`

**Interfaces:**
- `ServerSnapshot<T> = { data: T; generatedAt: number; error?: string }`。
- `PublicResourceKey = 'moments' | 'albums' | 'guestbook' | \`comments:${string}\``。
- `ResourceEntry<T> = { data: T | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string; updatedAt: number; promise: Promise<T> | null }`。
- `createPublicResourceStore(options?: { now?: () => number; maxCommentEntries?: number }): PublicResourceStore`。
- `PublicResourceStore.read<T>(key)`, `.subscribe(key, listener)`, `.seed(key, snapshot)`, `.preload(key, loader)`, `.revalidate(key, loader)`, `.setData(key, updater)`, `.invalidate(key)`。
- `PublicResourceCacheProvider({ children }: { children: ReactNode })` 使用模块级 singleton，不在初始化时调用 loader。
- `useResourceEntry<T>(key)` 使用 `useSyncExternalStore` 订阅指定 key；`usePublicResourceCache()` 返回同一 store。

- [ ] **Step 1: 写失败测试，锁定 cache API 和资源快照形状**

  在 `tests/public-resource-cache.test.tsx` 中先导入尚不存在的 cache API，写出以下测试行为：

  ```tsx
  it('deduplicates concurrent preload calls and keeps the same promise', async () => {
    const store = createPublicResourceStore({ now: () => 1000 })
    let calls = 0
    let resolve!: (value: string[]) => void
    const loader = () => {
      calls += 1
      return new Promise<string[]>((done) => { resolve = done })
    }
    const first = store.preload('moments', loader)
    const second = store.preload('moments', loader)
    expect(first).toBe(second)
    expect(calls).toBe(1)
    resolve(['first'])
    await expect(first).resolves.toEqual(['first'])
  })

  it('seeds only a newer server snapshot and preserves stale data after refresh failure', async () => {
    let now = 10_000
    const store = createPublicResourceStore({ now: () => now })
    store.seed('guestbook', { data: ['new'] as unknown as string[], generatedAt: 9000 })
    store.seed('guestbook', { data: ['old'] as unknown as string[], generatedAt: 8000 })
    expect(store.read<string[]>('guestbook').data).toEqual(['new'])
    now += 31_000
    await expect(store.revalidate('guestbook', async () => { throw new Error('offline') })).rejects.toThrow('offline')
    expect(store.read<string[]>('guestbook')).toMatchObject({ data: ['new'], status: 'error', error: 'offline' })
  })

  it('keeps comments isolated by slug and evicts the least recently used slug after twenty entries', () => {
    const store = createPublicResourceStore({ now: () => 1000, maxCommentEntries: 20 })
    for (let i = 0; i < 20; i += 1) store.setData(`comments:post-${i}`, [])
    store.read('comments:post-0')
    store.setData('comments:post-20', [])
    expect(store.read('comments:post-0').data).toEqual([])
    expect(store.read('comments:post-1').data).toBeNull()
  })
  ```

- [ ] **Step 2: 运行新增测试，确认它们因 API 尚不存在而失败**

  Run: `npm test -- tests/public-resource-cache.test.tsx`

  Expected: FAIL with unresolved module/export errors from `lib/public-resource-cache`.

- [ ] **Step 3: 增加共享快照类型和纯 store 的最小实现**

  在 `lib/store-types.ts` 增加：

  ```ts
  export type MomentsSnapshot = { moments: MomentItem[]; momentComments: MomentCommentItem[]; momentLikes: MomentLikeItem[] }
  export type AlbumsSnapshot = { albums: AlbumItem[]; photos: PhotoItem[] }
  export type GuestbookSnapshot = { guestbook: GuestbookItem[] }
  export type CommentsSnapshot = { comments: CommentItem[] }
  ```

  在 `lib/public-resource-types.ts` 导出上述资源快照、`ServerSnapshot<T>`、`PublicResourceKey`、`ResourceStatus`、`ResourceEntry<T>`。在 `lib/public-resource-cache.tsx` 实现以下确定性规则：

  - `read` 对未知 key 返回稳定的 idle entry；读取会更新 comments 的 LRU 顺序。
  - `seed` 仅当 `snapshot.generatedAt > entry.updatedAt` 或 entry 没有数据时写入；带 `snapshot.error` 时以 error 状态通知订阅者，但不丢弃既有数据。
  - `preload` 在有未完成 Promise 时原样返回；在新鲜数据存在时返回 `Promise.resolve(data)`；其余情况设置 loading 并启动 loader。
  - `revalidate` 保留旧 data，显式设置 loading 但由 hook 依据 `hasData` 显示 refreshing；完成时把 `updatedAt` 设为 `now()`，失败时保留 data 并设置 error。
  - `setData` 支持值和 updater；数据写入后状态为 ready、错误清空、时间戳更新并通知订阅者。
  - `invalidate` 清除数据、时间戳和错误，但不清除正在执行的 Promise；下一次读取消新鲜判断。
  - moments/guestbook/albums/comments 分别使用 60/30/300/30 秒 TTL；comments 只保留最近 20 个 slug，淘汰最久未读且没有 in-flight Promise 的 entry。

- [ ] **Step 4: 增加 React Provider 和订阅 hook**

  `PublicResourceCacheProvider` 只提供 singleton context，不在 `useEffect` 或 render 中执行网络请求；`useResourceEntry` 的 `getServerSnapshot` 返回当前 entry，确保测试和 SSR 可确定。Provider 卸载不销毁 module-level store，重新挂载后可读到原数据。

- [ ] **Step 5: 运行 cache 测试并提交独立批次**

  Run: `npm test -- tests/public-resource-cache.test.tsx`

  Expected: all cache dedupe, seed freshness, stale failure, subscription, remount and LRU tests PASS.

  Commit only `lib/public-resource-types.ts`, `lib/public-resource-cache.tsx`, `lib/store-types.ts`, `tests/public-resource-cache.test.tsx` with message `feat: add public resource session cache`.

### Task 2: 添加服务端快照和浏览器 loader

**Files:**
- Create: `lib/public-resource-loaders.server.ts`
- Create: `lib/public-resource-loaders.browser.ts`
- Test: `tests/public-resource-cache.test.tsx`
- Test: `tests/route-resource-boundaries.test.tsx`

**Interfaces:**
- Server exports: `loadMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>>`, `loadAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>>`, `loadGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>>`, `loadCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>>`。
- Browser exports: `loadMoments(): Promise<MomentsSnapshot>`, `loadAlbums(): Promise<AlbumsSnapshot>`, `loadGuestbook(): Promise<GuestbookSnapshot>`, `loadComments(slug: string): Promise<CommentsSnapshot>`。

- [ ] **Step 1: 写 loader 契约失败测试**

  在 `tests/route-resource-boundaries.test.tsx` 增加静态断言：server loader 含 `server-only`、四个 `load...Snapshot` 导出、browser loader 不含 `server-only`；在 cache 测试中 mock `supabaseAdmin`/`supabaseBrowser`，验证服务端 `generatedAt` 在最后一个查询完成后生成，浏览器 loader 按当前字段、排序、limit 读取四种资源。

- [ ] **Step 2: 运行针对性测试，确认 loader 文件和契约尚不存在**

  Run: `npm test -- tests/route-resource-boundaries.test.tsx tests/public-resource-cache.test.tsx`

  Expected: FAIL on missing loader modules or missing static contract markers.

- [ ] **Step 3: 实现服务端 loader**

  在 `lib/public-resource-loaders.server.ts` 首行使用 `import 'server-only'`，复用 `supabaseAdmin` 和 `isSupabaseConfigured`。每个 loader 在同一次调用中完成现有的 select/order/limit：moments 同时读取 moments、moment_comments、moment_likes；albums 读取 albums 和 photos；guestbook 读取带 profile 的 guestbook；comments 读取指定 slug 的 comments。所有返回值只保留现有公开字段并转换为普通数组，三个公共 loader 的 TTL 使用 `unstable_cache` 或现有 ISR 方式表达为 60/300/30 秒，comments 为 30 秒。

  读取失败时抛出只含字符串 message 的普通 `Error`，由 layout 的安全包装转换为 `initialSnapshot: null` 和 `initialError`；不得把 Error 实例放进快照。未配置 Supabase 时返回空的可序列化快照，避免本地 build 因公共数据读取失败而路由 500。

- [ ] **Step 4: 实现浏览器 loader 并保持客户端查询形状一致**

  `lib/public-resource-loaders.browser.ts` 只能导入 `supabaseBrowser`、共享类型和错误格式化 helper。按原 Provider 查询实现四个 loader；comments 必须按 slug eq 过滤，所有 loader 将 Supabase error 转为 `Error('读取闲语失败：...')`、`Error('读取相册失败：...')`、`Error('读取留言失败：...')` 或 `Error('读取评论失败：...')`，成功只返回对应 snapshot 的 data 对象。

- [ ] **Step 5: 运行 loader 和边界测试并提交**

  Run: `npm test -- tests/route-resource-boundaries.test.tsx tests/public-resource-cache.test.tsx`

  Expected: PASS with no client import path reaching the server-only module and with all mocked query contracts verified.

  Commit only the two loader files and the tests touched for their contracts with message `feat: add public resource snapshot loaders`.

### Task 3: 根级惰性缓存与 moments 垂直切片

**Files:**
- Modify: `app/layout.tsx`
- Modify: `lib/moments-context.tsx`
- Modify: `app/moments/layout.tsx`
- Modify: `app/moments/page.tsx`
- Test: `tests/public-resource-cache.test.tsx`
- Test: `tests/route-resource-boundaries.test.tsx`

**Interfaces:**
- `MomentsProvider({ children, initialSnapshot, initialError }: { children: ReactNode; initialSnapshot?: ServerSnapshot<MomentsSnapshot> | null; initialError?: string })`。
- `useMoments()` 保留当前 `moments`, `momentComments`, `momentLikes`, `ready`, `error`, `refreshMoments` 和 mutation 名称，并新增 `hasData`, `isInitialLoading`, `isRefreshing`。

- [ ] **Step 1: 写根 Provider、首帧和 SWR 失败测试**

  渲染一个使用 `useResourceEntry` 的 probe：根 `PublicResourceCacheProvider` 初始化时 loader 调用次数为 0；Provider 卸载再挂载仍读到已写入数据；传入新鲜 `initialSnapshot` 的 moments 页面首帧有列表；无快照时为 loading 而非 Empty；过期数据触发一次 revalidate 时旧列表仍在 DOM 中；revalidate 失败后旧列表和非阻塞错误同时存在。

- [ ] **Step 2: 运行测试，确认 moments 尚未接入 cache**

  Run: `npm test -- tests/public-resource-cache.test.tsx tests/route-resource-boundaries.test.tsx`

  Expected: new moments/provider assertions FAIL while existing tests remain the baseline.

- [ ] **Step 3: 在 root layout 挂载惰性 cache Provider**

  将 root 结构改为：

  ```tsx
  <AuthProvider>
    <PublicResourceCacheProvider>
      <AppShell>{children}</AppShell>
    </PublicResourceCacheProvider>
  </AuthProvider>
  ```

  不在 `app/layout.tsx` 导入任何公共 loader，不改 `AppShell` 的 shell 分类逻辑。

- [ ] **Step 4: 将 moments layout 改为安全的 async snapshot layout**

  调用 `loadMomentsSnapshot()` 并把成功快照传给 `MomentsProvider`；使用 `try/catch` 将读取失败变为 `initialSnapshot={null}` 和可序列化的 `initialError`，无论成功还是失败都渲染 Provider 及原有 children/metadata。

- [ ] **Step 5: 将 moments context 迁移到共享 cache view**

  删除 moments 的独立数组 state 和首次 Effect 请求，改为：进入 Provider 时 seed 服务端快照；通过 `useResourceEntry('moments')` 得到 snapshot；无数据时调用 `preload('moments', loadMoments)`，有数据且 `Date.now() - updatedAt >= 60_000` 时在可见页面后台 `revalidate`。使用 `useSyncExternalStore` 的 entry 更新不会复制 store。

  对外把 `data.moments`、`data.momentComments`、`data.momentLikes` 映射为旧字段，并按 `hasData = entry.data !== null`、`isInitialLoading = entry.status === 'loading' && !hasData`、`isRefreshing = entry.status === 'loading' && hasData`、`ready = hasData || (!isInitialLoading && !error)` 暴露状态。页面刷新必须调用 `revalidate` 而非先清空数据。

  mutation 成功后用 `setData` 更新共享 snapshot：发布插入顶部，删除同时移除关联 comments/likes，评论追加返回项，点赞保留现有乐观更新和失败回滚；数据库确认失败只返回当前错误文本并保留原快照。

- [ ] **Step 6: 更新 moments 页面状态互斥规则**

  保留 `PageIntro`、纸面容器、分页/表单和现有 className；将主体条件改成：无数据初次 loading 显示加载状态，无数据 error 显示 `InlineFeedback` retry，已有数据刷新仅显示小型同步提示且继续显示列表，已有空数组才显示 `EmptyState`。不得在请求开始时把数组设为空。

- [ ] **Step 7: 运行 moments 聚焦测试并提交**

  Run: `npm test -- tests/public-resource-cache.test.tsx tests/public-forms.test.tsx tests/route-resource-boundaries.test.tsx`

  Expected: PASS, including existing moments mutation and form regressions.

  Commit only root layout, moments context/layout/page and directly updated tests with message `feat: seed moments from server snapshots`.

### Task 4: 迁移 guestbook 与 albums Provider

**Files:**
- Modify: `lib/guestbook-context.tsx`
- Modify: `lib/albums-context.tsx`
- Modify: `app/guestbook/layout.tsx`
- Modify: `app/album/layout.tsx`
- Modify: `app/guestbook/page.tsx`
- Modify: `app/album/page.tsx`
- Test: `tests/public-resource-cache.test.tsx`

**Interfaces:**
- `GuestbookProvider` 接受 `initialSnapshot?: ServerSnapshot<GuestbookSnapshot> | null` 和 `initialError?: string`，新增 `hasData/isInitialLoading/isRefreshing` 并保留已有 guestbook action API。
- `AlbumsProvider` 接受 `initialSnapshot?: ServerSnapshot<AlbumsSnapshot> | null` 和 `initialError?: string`，新增同样的 view flags 并保留 albums/photos/action API。

- [ ] **Step 1: 写失败测试覆盖两个 Provider 的快照、过期刷新和 mutation 保留内容**

  使用 fake timers/注入 now：传入 guestbook/albums snapshot 后首帧直接显示内容；设置过期后调用 refresh，原有内容仍可见且只产生一个 loader；刷新失败显示非阻塞错误；新增/编辑/删除成功后 cache snapshot 变化；失败时数组引用内容不变。分别确认 guestbook 的 `parent_id` 和 albums 的 photos/cover 派生字段未被清空。

- [ ] **Step 2: 运行新增测试确认迁移前失败**

  Run: `npm test -- tests/public-resource-cache.test.tsx`

  Expected: FAIL on the new Provider props/view assertions.

- [ ] **Step 3: 将 guestbook context 接入 cache 和浏览器 loader**

  seed `guestbook` snapshot，复用 30 秒 TTL；用 `setData` 在数据库确认后按 created_at 降序插入新条目，回复按 parent relation 保留，删除按现有数据库行为从树中移除目标节点并保持其余线程；`refreshGuestbook` 只调用 `revalidate`。

- [ ] **Step 4: 将 albums context 接入 cache 和浏览器 loader**

  seed `albums` snapshot，复用 300 秒 TTL；创建/修改/删除相册用确认后的返回值更新 albums，删除照片同步移除 photos 并重新推导受影响 album 的 cover_url；`refreshAlbums` 只调用 `revalidate`，任何 action 都不清空当前网格。

- [ ] **Step 5: 将两个 route layout 改成 async snapshot layout**

  `app/guestbook/layout.tsx` 调用 `loadGuestbookSnapshot()`；`app/album/layout.tsx` 调用 `loadAlbumsSnapshot()`。两者均在 catch 分支传 `initialSnapshot={null}` 与 `initialError`，仍输出原 metadata 和 Provider。

- [ ] **Step 6: 更新 guestbook/album 页面 loading/error 语义**

  保留留言页当前表单、页码、确认弹层与相册内部视图；`isRefreshing` 时不重置 `page`、compose 状态或当前相册；仅 `!hasData && !isInitialLoading && error` 显示阻塞错误；仅 `hasData && data.length === 0` 显示 EmptyState；已有数据刷新时在页面标题/列表旁显示小型同步状态。

- [ ] **Step 7: 运行聚焦测试并提交**

  Run: `npm test -- tests/public-resource-cache.test.tsx tests/public-forms.test.tsx tests/route-resource-boundaries.test.tsx`

  Expected: PASS with existing form, dialog, pagination and album view tests.

  Commit only guestbook/albums contexts, layouts, pages and directly updated tests with message `feat: cache guestbook and album resources`.

### Task 5: 迁移 slug 级文章评论并接入 LRU

**Files:**
- Modify: `lib/comments-context.tsx`
- Modify: `app/posts/[slug]/layout.tsx`
- Modify: `components/Comments.tsx`
- Test: `tests/public-resource-cache.test.tsx`
- Test: `tests/route-resource-boundaries.test.tsx`

**Interfaces:**
- `CommentsProvider({ children, slug, initialSnapshot, initialError }: { children: ReactNode; slug?: string; initialSnapshot?: ServerSnapshot<CommentsSnapshot> | null; initialError?: string })`。
- `useComments()` 保留 `comments`, `ready`, `error`, `refreshComments`, `addComment`，并新增 `hasData/isInitialLoading/isRefreshing`。

- [ ] **Step 1: 写 slug 隔离和路由首帧失败测试**

  渲染两个不同 slug 的 Provider，确认 key 分别是 `comments:alpha` 和 `comments:beta`，alpha 的 revalidate 不改变 beta；带 `initialSnapshot` 时评论首帧存在；无数据时不会先出现 EmptyState；超过 20 个 slug 后按最近读取淘汰最旧条目。

- [ ] **Step 2: 运行测试确认 comments 尚未使用 slug cache**

  Run: `npm test -- tests/public-resource-cache.test.tsx tests/route-resource-boundaries.test.tsx`

  Expected: FAIL on slug cache and snapshot layout assertions.

- [ ] **Step 3: 将 comments context 迁移为单 slug cache view**

  对有 slug 的 Provider 使用 `comments:${slug}`，seed `initialSnapshot` 后按 30 秒 TTL 预加载/后台 revalidate；slug 变化时切换 key 而不是把全局 comments 清空。mutation 确认后只更新当前 slug；失败只返回当前错误，保留已有评论。

- [ ] **Step 4: 改造文章 slug layout 为安全 async snapshot layout**

  解码 slug 后调用 `loadCommentsSnapshot(slug)`，成功传入快照，失败传 null/error；保留 `generateMetadata` 相关结构、原 children 和当前 URL。

- [ ] **Step 5: 更新 Comments 组件的非阻塞刷新状态**

  评论列表已有内容时刷新继续显示原评论，只显示小型同步提示；只有无数据且 error 时显示正式错误和 retry；空列表只在已经完成且确实是空数组时显示 EmptyState。保持现有登录门槛、回复关系、表单内容和成功/失败反馈。

- [ ] **Step 6: 运行评论和路由边界测试并提交**

  Run: `npm test -- tests/public-resource-cache.test.tsx tests/public-forms.test.tsx tests/route-resource-boundaries.test.tsx`

  Expected: PASS, including current `CommentsProvider slug` query isolation test.

  Commit only comments context/layout/component and directly updated tests with message `feat: cache article comments by slug`.

### Task 6: 导航路由预取与文章意图预取

**Files:**
- Create: `components/ResourcePrefetchLink.tsx`
- Modify: `components/SiteNav.tsx`
- Modify: `components/PostList.tsx`
- Modify: `components/SearchPalette.tsx`
- Modify: `app/page.tsx`
- Modify: `app/posts/[slug]/page.tsx`
- Test: `tests/public-route-prefetch.test.tsx`
- Test: `tests/site-nav.test.tsx`

**Interfaces:**
- `ResourcePrefetchLinkProps = LinkProps & { resourceKey?: PublicResourceKey; resourceLoader?: () => Promise<unknown>; intentPrefetch?: boolean }`。
- `ResourcePrefetchLink` 默认保留 Next `Link` props；`intentPrefetch` 为 true 时在 `pointerenter`、`focus`、`pointerdown` 任一首次事件调用对应 key 的 `preload`，并与传入用户 handler 串联。
- `isConstrainedNetwork(): boolean` 检查 `navigator.connection.saveData` 以及 `effectiveType` 为 `slow-2g`/`2g`，SSR 返回 false。

- [ ] **Step 1: 写预取契约的失败测试**

  在测试中 mock `next/link`、cache store 和 browser loaders：正常网络下 SiteNav 的 `/moments`、`/album`、`/guestbook` Link 有 `prefetch={true}`；Save-Data/2g 下固定链接退回 `prefetch={false}` 或默认策略，但用户 hover/focus/pointerdown 后仍只 preload 当前目标。文章列表触发一个文章链接事件时只调用对应 `comments:${slug}` loader，其他文章 loader 不调用；重复事件不增加调用次数。

- [ ] **Step 2: 运行预取测试确认组件和策略尚不存在**

  Run: `npm test -- tests/public-route-prefetch.test.tsx`

  Expected: FAIL on missing `ResourcePrefetchLink` and missing fixed/article prefetch behavior.

- [ ] **Step 3: 实现 ResourcePrefetchLink**

  用 `next/link` 作为底层链接；固定资源模式在正常网络保留显式 `prefetch`，受限网络关闭强制完整预取；意图模式不在 render/effect 发请求，只在首次 intent event 调用 `preload(resourceKey, resourceLoader)`。所有事件通过 ref 去重，loader rejection 使用 `void promise.catch(() => undefined)`，不打断点击和键盘导航。

- [ ] **Step 4: 改造 SiteNav 的两份公共导航链接**

  桌面与移动导航的 `/moments`、`/album`、`/guestbook` 都使用 `ResourcePrefetchLink` 并传 `prefetch={true}`、对应 browser loader；首页、文章、时间线、关于、登录和账号保持普通 Next `Link` 默认预取。保留现有 active aria、移动菜单 focus trap、Escape 和视觉 className。

- [ ] **Step 5: 改造文章链接为当前 slug 意图预取**

  `PostList`、首页文章卡片和文章详情页 related links 使用 `ResourcePrefetchLink`，只为目标 `/posts/${slug}` 传 `resourceKey: comments:${slug}`、`resourceLoader: () => loadComments(slug)`、`intentPrefetch`；不得为整个列表在 mount 时 preload 所有评论。保留当前链接文本、href、className 和 Server Component 可序列化 props 边界。

- [ ] **Step 6: 运行导航测试并提交**

  Run: `npm test -- tests/public-route-prefetch.test.tsx tests/site-nav.test.tsx tests/app-shell.test.tsx`

  Expected: PASS with current mobile menu focus behavior and new network/intent assertions.

  Commit only `ResourcePrefetchLink`, the four navigation/link consumers and prefetch tests with message `feat: prefetch public routes by navigation intent`.

### Task 7: 完成统一状态语义、AppStore facade 和边界回归

**Files:**
- Modify: `lib/app-store.tsx`
- Modify: `app/layout.tsx` if the compatibility wrapper needs shared Provider composition
- Modify: `app/moments/page.tsx`
- Modify: `app/album/page.tsx`
- Modify: `app/guestbook/page.tsx`
- Modify: `components/Comments.tsx`
- Modify: `tests/route-resource-boundaries.test.tsx`
- Test: existing public form, shell, reading and pagination suites

**Interfaces:**
- `AppStoreProvider` remains an opt-in compatibility facade that composes `AuthProvider`, `PublicResourceCacheProvider` and the four focused Providers; it owns no query, cache entry or resource arrays.
- Existing `AppStore` fields and action names remain available; new resource flags are exposed by focused hooks, not required on the legacy facade.

- [ ] **Step 1: 写 boundary regression assertions**

  更新 `tests/route-resource-boundaries.test.tsx` 断言 root layout 包含 `PublicResourceCacheProvider`、不包含 `AppStoreProvider` 和公共 loader 调用；四个 route layout 含对应 `initialSnapshot`/server loader；`lib/app-store.tsx` 仍无 `.from(...)` 和公共 loader import；Auth/Admin shell 静态消费不会导入四个 browser loader。

- [ ] **Step 2: 将 AppStore facade 包入共享 cache Provider**

  在 `AppStoreProvider` 内包一层 `PublicResourceCacheProvider`，给 context providers 传默认的无快照参数；不要把 facade 重新挂回 root layout，也不要为兼容 `useAppStore` 增加额外网络请求。

- [ ] **Step 3: 统一页面状态互斥和稳定高度**

  对四个页面/组件复核条件顺序：`isInitialLoading && !hasData` → loading；`!hasData && error` → blocking error/retry；`hasData && data.length === 0` → EmptyState；其余先渲染数据，再附加 `isRefreshing` 或已有数据 error 的 InlineFeedback。保留 PageIntro、纸面容器和接近首批内容的 `min-height`，不改变视觉 CSS 体系。

- [ ] **Step 4: 运行边界和回归测试**

  Run: `npm test -- tests/route-resource-boundaries.test.tsx tests/app-store-compatibility.test.ts tests/app-shell.test.tsx tests/site-nav.test.tsx tests/public-forms.test.tsx tests/reading-ui.test.tsx tests/pagination.test.tsx`

  Expected: PASS with no public data loader call from Auth/Admin and no existing dialog/form/navigation regression.

- [ ] **Step 5: 提交状态语义和兼容边界批次**

  Commit only the facade, final page state changes and boundary test changes with message `refactor: unify public resource loading states`.

### Task 8: 浏览器链路、全量门禁、提交与自动推送

**Files:**
- Modify: `docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`：仅在实现完成后更新 Phase 2 状态和验收证据。
- Modify: `docs/superpowers/plans/2026-09-15-site-phase-2-prefetch-cache.md`：勾选已执行步骤并记录实际命令结果。
- Test: all repository test/type/build/browser checks

- [ ] **Step 1: 启动本地生产式页面并完成真实浏览器链路**

  运行 `npm run dev -- --port 3001`，在 1440、1024、768、390、375、360px 的 light/dark 主题验证：首页 → 闲语 → 光影 → 留言 → 首页 → 闲语 → 一篇文章 → 返回文章列表。使用浏览器开发者观察：首帧无“空数组→列表”过渡，返回闲语/相册/留言时缓存数据立即出现，refresh 期间内容高度不归零，表单、页码和相册视图不重置，`document.documentElement.scrollWidth <= document.documentElement.clientWidth`。对 Production/Preview 可访问地址只做只读核验，并单独记录 Supabase 网络不可用与应用逻辑失败。

- [ ] **Step 2: 记录布局稳定性证据**

  用 `PerformanceObserver({ type: 'layout-shift', buffered: true })` 记录资源切换期间的数据替换 CLS；目标是数据替换造成的 CLS 为 `0`，字体和图片自身造成的位移另行记录，不修改本阶段视觉设计来掩盖它们。

- [ ] **Step 3: 执行完整确定性门禁**

  Run each command separately:

  ```powershell
  npm test
  npm run typecheck
  npm run build
  git diff --check
  ```

  Expected: all Vitest tests PASS; typecheck exits 0; build exits 0. 若 build 只出现已知离线 Supabase `TypeError: fetch failed`/`EACCES` warning，记录为环境警告，不把它误报为线上数据故障；任何真正的编译、类型或测试失败都必须修复后再继续。

- [ ] **Step 4: 检查变更范围和敏感信息**

  Run `git status --short`、`git diff --stat`、`git diff --cached --name-only`（暂存前后各一次）和 `rg -n "SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY"`，确认没有 stage 无关 Phase 3/用户文件、没有秘钥、没有意外视觉文件。

- [ ] **Step 5: 只暂存 Phase 2 文件并提交**

  按实际 `git diff` 精确列出本计划涉及的源文件、测试文件和验收文档，执行 `git add <explicit paths>`；再次执行 `git diff --cached --check` 和 staged name-only 检查，再提交：

  ```powershell
  git commit -m "feat: complete phase 2 prefetch and session cache"
  ```

- [ ] **Step 6: 自动推送并核验 GitHub receipt**

  遵循用户已确认的自动推送偏好执行：先 `git -c http.version=HTTP/1.1 fetch --prune origin`，检查 `git rev-list --left-right --count origin/main...HEAD`；确认当前分支仍为 `main` 且待推送内容仅来自本阶段后执行 `git push origin main`。完成后再次读取 `git rev-parse HEAD`、`git rev-parse origin/main` 和 ahead/behind，要求 `HEAD == origin/main`、计数为 `0 0`。把 GitHub push receipt 与 Vercel 部署状态分开报告。

- [ ] **Step 7: 最终更新验收文档并推送文档提交**

  将主设计文档的 Phase 2 状态从待实施改为已实现，并补充实际测试、视口、主题、缓存去重和 push SHA；不要修改原始设计决策。只暂存两份文档，执行 `git diff --check`、commit `docs: record phase 2 cache acceptance`，再次 `git push origin main` 并核验 `HEAD == origin/main`、ahead/behind `0 0`。

## 执行记录

- [x] Task 1：共享快照类型、单标签页 cache、Promise 去重、订阅和评论 LRU。
- [x] Task 2：服务端 `server-only` 快照 loader 与浏览器 revalidate loader。
- [x] Task 3：root 惰性 cache、moments 首帧快照、mutation cache 更新。
- [x] Task 4：guestbook/albums 快照、SWR 和无清空 mutation 更新。
- [x] Task 5：`comments:<slug>` 隔离、文章 layout 快照和评论状态语义。
- [x] Task 6：固定公共导航预取、受限网络降级和文章意图预取。
- [x] Task 7：AppStore 兼容 facade 与公共/Auth/Admin 边界回归。
- [x] Task 8：完整测试、类型检查、生产构建、HTTP 路由烟测和 Git 推送验收。

实际验证记录：`npm test` 通过 40/40 test files、201/201 tests；`npm run typecheck` 通过；`npm run build` 退出 0；本地七条公共路由返回 200；实现提交范围为 `e468488..a2e2d56`。本轮未执行浏览器截图视口验收，因为当前执行环境没有可操作的浏览器控制工具。GitHub push receipt 在最终提交后单独核验，不把部署状态等同于 push 状态。
