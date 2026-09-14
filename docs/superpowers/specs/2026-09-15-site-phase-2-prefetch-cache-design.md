# 似水流年：Phase 2 数据预加载与会话缓存修订设计

日期：2026-09-15

状态：待用户评审的 Phase 2 修订规格；本文件只重设数据加载架构，不实施代码。

关联规格：`docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`

历史实现：`676aa4f`、`8279cfd`、`1fd3124`、`fde025e`

## 1. 修订原因

原 Phase 2 正确完成了两项拆分：

- 根布局只保留认证，公共、认证和后台 Shell 不再共享全部视觉与业务状态。
- 闲语、相册、留言和文章评论由各自路由 Provider 管理，不再在每个页面请求全部资源。

但原设计把两个不同概念绑定在了一起：

```text
数据消费边界 = 路由级
数据缓存生命周期 = 路由级
```

路由 Provider 在离开页面时卸载；再次进入时从 `ready=false` 和空数组重新开始，再由客户端 `useEffect` 请求 Supabase。页面因此先显示“正在加载”，随后突然扩展为完整列表，形成明显的内容跳跃。

Next Link 当前只能预取路由代码和服务端组件数据。闲语、相册、留言和评论的数据请求发生在客户端 Provider 的挂载 Effect 内，因此现有 Link 预取无法提前准备这些数据。

## 2. 修订目标

Phase 2 修订后采用三个独立边界：

```text
消费边界：路由级 Provider
缓存边界：浏览器标签页会话级
预加载边界：服务端路由快照 + 明确导航意图
```

必须达到：

- 第一次直接打开闲语、相册、留言或文章详情时，首帧已有服务端初始数据。
- 从导航进入这些页面时，Next 在点击前预取对应路由与初始数据。
- 离开再返回时，客户端会话缓存立即提供已有数据，不重新显示整页 Loading。
- 缓存过期后保留旧内容并在后台刷新，不先清空页面。
- 相同资源的并发请求复用同一个 Promise。
- Mutation 成功后立即更新会话缓存，不通过清空页面表达刷新。
- Auth 和 Admin 不主动预加载公共内容。
- 不恢复旧的根级巨型 AppStore，不引入 Redux、SWR 或 TanStack Query。

## 3. 非目标

- 不修改 Supabase 表、RLS、认证、上传和后台管理接口。
- 不改变页面 URL、Metadata、SEO、ISR 和现有表单能力。
- 不把认证信息、私有后台数据或 Token 写入公共缓存。
- 不使用 `localStorage` 或 IndexedDB 持久化内容缓存。
- 不在本阶段重做相册分页、留言树分页或评论数据模型。
- 不修改任何视觉设计系统、Dialog 或 Phase 3 基础组件工作。
- 不承诺用户未完成路由预取时完全没有网络等待；目标是等待发生在导航前或保留当前页面，而不是进入空页面后跳变。

## 4. 方案选择

### 4.1 放弃：恢复根级全量 AppStore

恢复根级 Provider 可以让数据不卸载，但会重新产生无关请求、错误状态串扰和公共/后台耦合，并抵消原 Phase 2 的主要收益。

### 4.2 放弃：只增加客户端模块缓存

客户端缓存能解决“返回页面”的问题，但首次直接打开或首次快速进入仍然需要等待客户端 Effect，不能完整解决首屏跳跃。

### 4.3 采用：服务端初始快照 + 会话缓存 + stale-while-revalidate

推荐方案同时解决首次进入和再次进入：

1. 路由 layout 在服务端获取可公开的数据快照。
2. Next Link 在生产环境预取路由时把快照一并预取。
3. 路由 Provider 用快照同步初始化，不以空数组开始。
4. Provider 将数据写入根级但惰性的会话缓存。
5. 离开页面后 Provider 可以卸载，缓存仍保留。
6. 再次进入时优先使用更新的客户端缓存。
7. 数据过期后静默 revalidate，不移除旧内容。

## 5. 目标架构

```text
RootLayout
├── AuthProvider
├── PublicResourceCacheProvider     只保存缓存，不自动请求
└── AppShell
    ├── SiteNav                     预取完整公共路由
    └── Route Layout
        ├── server snapshot loader
        └── Route Resource Provider
            ├── seed(initialSnapshot)
            ├── read session cache
            ├── background revalidate
            └── mutations update cache
```

数据流：

```text
SiteNav Link prefetch
        ↓
Next RSC route prefetch
        ↓
server snapshot loader
        ↓
initialSnapshot
        ↓
route Provider ───────→ PublicResourceCache
        ↑                         │
        └──── cached snapshot ────┘
                                  │
Supabase browser revalidate ──────┘
```

## 6. 服务端初始快照

新增 `lib/public-resource-loaders.server.ts`，只导出可安全传给公共页面的数据读取函数：

```ts
export type ServerSnapshot<T> = {
  data: T
  generatedAt: number
}

export async function loadMomentsSnapshot(): Promise<ServerSnapshot<MomentsSnapshot>>
export async function loadAlbumsSnapshot(): Promise<ServerSnapshot<AlbumsSnapshot>>
export async function loadGuestbookSnapshot(): Promise<ServerSnapshot<GuestbookSnapshot>>
export async function loadCommentsSnapshot(slug: string): Promise<ServerSnapshot<CommentsSnapshot>>
```

约束：

- 文件使用 `server-only`，客户端组件不能导入。
- 沿用当前 Supabase select、排序和 limit，不改变返回内容。
- 只选择页面已经公开使用的字段。
- 服务端错误转换为快照级错误，由页面保留现有错误语义。
- 快照必须可序列化，不能包含 Supabase Client、Error 实例、函数或 Promise。
- `generatedAt` 代表实际完成数据库读取的时间，不是每次序列化时间。

缓存策略：

| 资源 | 服务端缓存 | 原因 |
|---|---:|---|
| 闲语、评论、点赞 | 60 秒 | 与现有公共内容更新频率一致 |
| 留言簿 | 30 秒 | 交互更频繁 |
| 相册与照片 | 300 秒 | 数据量更大、更新较少 |
| 文章评论 | 30 秒 | 需要较快看到新回复 |

服务端缓存继续服从现有 ISR 语义。本阶段不新增客户端 Mutation 到 Next revalidation tag 的接口；当前用户的客户端缓存立即更新，其他会话最迟在 TTL 后读取新快照。

## 7. 路由 Layout

以下 layout 改为异步 Server Component：

- `app/moments/layout.tsx`
- `app/album/layout.tsx`
- `app/guestbook/layout.tsx`
- `app/posts/[slug]/layout.tsx`

结构示例：

```tsx
export default async function MomentsLayout({ children }: LayoutProps) {
  const initialSnapshot = await loadMomentsSnapshot()
  return (
    <MomentsProvider initialSnapshot={initialSnapshot}>
      {children}
    </MomentsProvider>
  )
}
```

如果服务端读取失败，layout 仍然渲染 Provider。Provider 接收错误快照后可以在客户端重试，不让数据故障升级成整条路由 500。

首页、文章列表、时间线和关于页继续保持现有 Server Component 数据流，不迁入公共资源缓存。

## 8. 会话级公共资源缓存

新增 `lib/public-resource-cache.tsx`：

```ts
type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

type ResourceEntry<T> = {
  data: T | null
  status: ResourceStatus
  error: string
  updatedAt: number
  promise: Promise<T> | null
}

type PublicResourceKey =
  | 'moments'
  | 'albums'
  | 'guestbook'
  | `comments:${string}`
```

缓存接口：

```ts
read<T>(key: PublicResourceKey): ResourceEntry<T>
subscribe(key: PublicResourceKey, listener: () => void): () => void
seed<T>(key: PublicResourceKey, snapshot: ServerSnapshot<T>): void
preload<T>(key: PublicResourceKey, loader: () => Promise<T>): Promise<T>
revalidate<T>(key: PublicResourceKey, loader: () => Promise<T>): Promise<T>
setData<T>(key: PublicResourceKey, updater: T | ((current: T) => T)): void
invalidate(key: PublicResourceKey): void
```

实现约束：

- Provider 在根布局中保持挂载，但创建时不发出网络请求。
- 缓存只存在于当前标签页的 React 生命周期中。
- 每个资源只有一个 `inFlightPromise`，预取和页面请求必须去重。
- 使用可订阅 Store 或 `useSyncExternalStore`，避免多个 Context 各复制一份缓存状态。
- `seed` 只在服务端快照比现有缓存更新时覆盖数据。
- 文章评论缓存最多保留最近 20 个 slug；超出后淘汰最久未使用条目。
- Auth 状态继续由 `AuthProvider` 独立管理。

## 9. Route Resource Provider

保留以下公共接口，不要求页面组件改写：

- `useMoments()`
- `useAlbums()`
- `useGuestbook()`
- `useComments()`

Provider 的职责从“拥有独立数据副本”改为“提供领域动作和缓存视图”。

状态语义调整为：

```ts
type ResourceView<T> = {
  data: T
  hasData: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  error: string
}
```

为兼容现有消费者，迁移期间保留 `ready`：

```ts
ready = hasData || (!isInitialLoading && !error)
```

最终页面显示规则：

- `isInitialLoading && !hasData`：显示首次加载状态。
- `hasData && isRefreshing`：继续显示原内容，不替换为 Loading。
- `hasData && error`：保留内容，显示非阻塞同步提示。
- `!hasData && error`：显示正式错误和重试入口。
- `hasData && data.length === 0`：显示 EmptyState。

## 10. 路由预取策略

### 10.1 顶部与移动导航

`SiteNav` 中以下固定公共入口使用显式 `prefetch={true}`：

- `/moments`
- `/album`
- `/guestbook`

这样 Next 15 App Router 会在生产环境预取完整路由及服务端数据，而不是只依赖静态/动态自动判断。

首页、文章、时间线和关于保持默认 Next 预取，因为它们已由 Server Component 管理数据。

### 10.2 文章评论

不为文章列表中的所有文章强制完整预取评论。文章链接只在以下意图事件预取当前 slug：

- `pointerenter`
- `focus`
- `pointerdown`

每次只预取用户当前指向的一篇文章，避免列表页同时请求多篇评论。

### 10.3 网络约束

当浏览器启用 Save-Data 或报告 `slow-2g`、`2g` 时：

- 固定导航不强制完整数据预取，退回 Next 默认预取。
- 用户明确 Hover、Focus 或 PointerDown 后才提升为完整预取。
- 当前页面自身的数据请求不受影响。

页面进入后台时不启动新的客户端 revalidate；恢复可见后，仅刷新已经过期且当前页面正在使用的资源。

## 11. stale-while-revalidate

客户端新鲜时间与服务端 TTL 保持一致：

| 资源 | 客户端新鲜时间 |
|---|---:|
| moments | 60 秒 |
| guestbook | 30 秒 |
| albums | 300 秒 |
| comments:slug | 30 秒 |

进入页面时：

1. 有新鲜缓存：直接显示，不请求。
2. 有过期缓存：直接显示，同时后台刷新。
3. 无缓存但有服务端快照：同步 seed 并显示。
4. 无缓存且无有效快照：才进入首次加载状态。

后台刷新成功后一次性替换领域快照。刷新期间不清空数组、不重置页码、不关闭用户正在填写的表单。

## 12. Mutation 与一致性

### 闲语

- 发布成功后将新记录插入 moments 缓存顶部。
- 删除成功后同时移除闲语、其评论和点赞。
- 评论成功后追加对应评论。
- 点赞采用当前已有的乐观更新，并写入共享缓存。

### 留言簿

- 发布成功后按当前排序规则插入缓存。
- 回复保持 `parent_id` 关系。
- 删除成功后按现有数据库行为更新对应节点，不改变线程语义。

### 相册

- 创建、修改、删除相册后更新 albums 快照。
- 删除照片后同时更新 photos 和封面推导结果。

### 文章评论

- 只更新 `comments:<slug>`。
- 不失效其他文章评论缓存。

所有 Mutation 在数据库确认成功后更新缓存。需要乐观更新的点赞保留回滚能力。Mutation 后可以后台 revalidate，但不能先清空数据。

## 13. Loading、Error 与布局稳定

即使所有预取都尚未完成，首次 Loading 也必须保持内容区稳定：

- 保留 PageIntro 和纸面容器。
- Loading 区使用与首批内容接近的最小高度。
- 不先渲染 EmptyState，再改成真实列表。
- Loading、Empty、Error 三种状态互斥。
- 后台刷新只使用小型状态提示，不替换内容主体。

本设计解决的核心 CLS 来源是“缓存数据被路由卸载清空”。Skeleton 只作为网络异常或用户跳过预取时的安全回退，不是主要体验方案。

## 14. 文件边界

### 新增

- `lib/public-resource-cache.tsx`：会话缓存、订阅、去重和 LRU。
- `lib/public-resource-loaders.server.ts`：公共服务端快照读取。
- `lib/public-resource-loaders.browser.ts`：客户端 revalidate 读取。
- `components/ResourcePrefetchLink.tsx`：按网络条件和意图控制路由预取。
- `tests/public-resource-cache.test.tsx`：缓存生命周期和去重。
- `tests/public-route-prefetch.test.tsx`：导航和快照预取契约。

### 修改

- `app/layout.tsx`：挂载惰性的 `PublicResourceCacheProvider`。
- `components/AppShell.tsx`：保持 Shell 分类，不添加业务请求。
- `components/SiteNav.tsx`：固定公共路由的预取策略。
- 四个资源 route layout：读取并传入 `initialSnapshot`。
- 四个资源 context：从独立 state 迁移为缓存视图与领域动作。
- `app/moments/page.tsx`、`app/album/page.tsx`、`app/guestbook/page.tsx`：区分首次加载与后台刷新。
- `components/Comments.tsx`：读取 slug 级缓存状态。
- `lib/app-store.tsx`：继续只作为兼容 facade，不重新拥有资源 state。
- `tests/route-resource-boundaries.test.tsx`：更新消费边界与缓存边界断言。

### 不修改

- Supabase schema 和 RLS。
- AuthProvider 的认证生命周期。
- 页面 URL、Metadata、SEO 和视觉布局。
- 当前未提交的 DialogBehavior、ConfirmDialog 和 AdminConfirmDialog 工作。

## 15. 测试设计

### 15.1 缓存单元测试

- 两个消费者同时 preload 同一 Key，只调用一次 loader。
- Provider 卸载再挂载，数据仍然存在。
- 新鲜缓存不重复请求。
- 过期缓存立即可读，并触发一次后台请求。
- 后台请求失败时旧数据仍然存在。
- 较新的客户端缓存不被较旧服务端快照覆盖。
- comments 缓存按 slug 隔离，并在超过 20 项后执行 LRU。

### 15.2 Provider 行为测试

- 首帧接收 `initialSnapshot` 时不出现首次 Loading。
- 无快照时只显示 Loading，不显示 EmptyState。
- revalidate 时保留现有列表。
- Mutation 成功后共享缓存立即变化。
- Mutation 失败时缓存保持原状并返回现有错误文本。

### 15.3 路由与网络测试

- Public Shell 挂载缓存 Provider，但缓存 Provider 初始化不请求数据。
- Auth/Admin 页面不会触发公共资源 loader。
- 固定公共导航在正常网络使用完整预取。
- Save-Data 和慢速网络退回意图预取。
- 文章评论只预取目标 slug。

### 15.4 浏览器验收

按以下路径连续导航：

```text
首页 → 闲语 → 光影 → 留言 → 首页 → 闲语 → 一篇文章 → 返回文章列表
```

检查：

- 首次进入资源页面时不经过空数组页面。
- 返回闲语时原列表立即可见。
- 新鲜期内每项资源最多产生一次实际数据请求。
- 后台刷新期间内容高度不归零。
- 页面表单输入、相册内部视图和留言页码不因后台刷新被重置。
- 1440、1024、768、390、375、360px 明暗主题无新增横向溢出。
- 使用 Layout Shift API 记录切换期间由数据替换造成的 CLS；目标为 `0`，字体和图片自身造成的位移单独记录。

### 15.5 完整门禁

```powershell
npm test
npm run typecheck
npm run build
git diff --check
```

本地 Supabase 网络失败不能被误报为线上故障；需要通过确定性 mock 验证缓存逻辑，并在可访问的 Vercel Preview 上完成真实数据导航验收。

## 16. 分批实施顺序

1. 建立资源快照类型、会话缓存和请求去重测试。
2. 为路由 layout 增加服务端初始快照，Provider 仍保持现有 API。
3. 将 moments 作为第一条垂直切片迁移并完成浏览器验证。
4. 迁移 guestbook 和 albums。
5. 迁移 slug 级 comments，并加入 LRU。
6. 增加 SiteNav 与文章链接的预取策略。
7. 更新 Loading/Error 语义和稳定高度回退。
8. 完成全站测试、构建、视口、网络和 Vercel Preview 验收。

每一批都必须能够独立通过测试和回滚。不得将当前工作区中 Phase 3 的未提交文件纳入本阶段提交。

## 17. 发布与回滚

- 每批只 stage 本阶段列出的文件，不使用 `git add -A`。
- 先检查当前 HEAD 与 `origin/main`，避免覆盖并行 Phase 3 工作。
- GitHub push 与 Vercel 部署分别验证。
- 如果服务端快照造成路由延迟，可单独回滚 snapshot loader，同时保留客户端会话缓存。
- 如果会话缓存产生一致性问题，可让 Provider 临时退回现有 route-local state，不影响 Shell 拆分。
- 不回滚已经验证有效的 Public/Auth/Admin Shell 分离。

## 18. Phase 2 修订后的最终边界

修订后的原则是：

> 页面只消费自己的数据，但已经获取的数据属于当前浏览器会话，不属于某一次路由挂载。

这保留了原 Phase 2 的职责隔离，同时恢复预加载和跨页面稳定显示。后续 Phase 3 及视觉阶段可以建立在这一边界上，不再直接管理数据生命周期。
