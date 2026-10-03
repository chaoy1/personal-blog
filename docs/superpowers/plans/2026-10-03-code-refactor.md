# 保持显示效果的代码整理与重构

> **For agentic workers:** 使用 executing-plans 在当前会话逐项执行。用户已要求在本仓库完成代码修改、提交并 push 到 origin/main。

**Goal:** 消除数据读取、Provider 生命周期和后台接口中的重复实现，保持现有视觉、交互和接口行为。

**Architecture:** 查询层接受 Supabase 客户端作为参数，浏览器入口负责匿名客户端，服务端入口保留 server-only、缓存与快照时间戳。共享 Hook 管理资源播种、可见性加载、刷新和状态推导，业务 Provider 继续拥有各自的写入、乐观更新与回滚逻辑。后台公共设施仅统一已有鉴权和数据库响应，不增加异常转换。

**Tech Stack:** Next.js 15、React 19、TypeScript、Supabase、Vitest、Playwright。

**Spec:** 本次用户要求：整理、重构冗余代码；不要更改项目前端显示效果。

## Global Constraints

- 保持所有 CSS、页面 JSX、视觉资源、文案和交互逻辑原样。
- 保留浏览器与服务端客户端隔离，服务端密钥不得进入共享模块。
- 保留排序、筛选、条数上限、缓存期限、错误文案、状态码和副作用顺序。
- 保留用户已有的 package.json、AGENTS.md、设计草稿和 chrome-cdp.cjs；只暂存本次明确路径。
- 仅按 PID 清理本次启动的服务；浏览器使用 chrome-cdp.cjs 启停及归属校验。
- 提交前执行 tsc --noEmit、vitest run、next build；push 后核验 HEAD 与 origin/main 相等。

## Task 1: 基线与查询去重

**Files:** 新建 lib/public-resource-queries.ts；修改 lib/public-resource-loaders.browser.ts 和 lib/public-resource-loaders.server.ts；新增 tests/public-resource-loaders.test.ts。

**Interfaces:** `readMoments(client): Promise<MomentsSnapshot>`、`readAlbums(client): Promise<AlbumsSnapshot>`、`readGuestbook(client): Promise<GuestbookSnapshot>`、`readComments(client, slug?): Promise<CommentsSnapshot>`。

- [x] 跑基线全量测试；保存 HTTP 页面桌面/移动端、明暗主题截图和样式/资源哈希。
- [x] 为现有浏览器和服务端入口增加查询行为测试，重构前先跑通。
- [x] 将浏览器查询原样移入无环境依赖的共享模块，客户端由调用方注入。
- [x] 浏览器入口调用共享查询；服务端入口继续通过 unstable_cache 包装并生成时间戳。
- [x] 运行查询与资源边界测试，核验隔离、空结果、错误传播和评论 slug 过滤。

## Task 2: Provider 共用生命周期

**Files:** 新建 lib/use-public-resource.ts、lib/resource-error.ts；修改 lib/{albums,comments,guestbook,moments,auth}-context.tsx。

**Interfaces:** `usePublicResource<T>({key, loader, emptySnapshot, initialSnapshot, initialError})` 返回 cache、data、refresh、ready、hasData、isInitialLoading、isRefreshing、error；`resourceError(prefix, reason)` 保持现有中文冒号格式。

- [x] 抽出四个 Provider 完全重复的播种、加载、可见性事件、刷新和状态推导代码。
- [x] 评论 loader 使用 useCallback 并依赖 slug，保留切换文章时的缓存键与筛选。
- [x] Provider 的写入、删除、点赞回滚、旧数据库 parent_id 兼容逻辑原样保留。
- [x] 运行资源缓存、路由边界、公共表单、AppStore 兼容和认证测试。

## Task 3: 后台接口与服务端加载错误处理

**Files:** 新建 lib/admin-route.ts；修改 app/api/admin 下内容/资料/总览/上传接口；修改四个资源 layout；在 lib/public-resource-loaders.server.ts 增加安全读取函数；新增 tests/admin-route-contract.test.ts。

**Interfaces:** `withAdmin(handler)` 在调用 handler 前验证 isAdminRequest；`databaseResponse(data, error, status=200)` 保留数据库 error.message；`deleteAdminResource(table)` 保留三种资源的删除语义；`readInitialSnapshot(loader, fallback)` 返回初始快照及错误。

- [x] 以原接口先验证未登录时不读取 body、不访问数据库；验证成功、错误和删除响应。
- [x] 用公共函数替换重复的登录判断和数据库响应；文章冲突、账号创建、上传及资料错误处理保持原样。
- [x] 将 layout 重复的 try/catch 合并为服务端安全读取函数，保持各页兜底文案。
- [x] 运行后台 API、资料、冲突与总览测试。

## Task 4: 完整核验与交付

**Files:** 新增 docs/qa/2026-10-03-code-refactor.md；过程截图和比较数据保存在 .design/code-refactor/，不提交生成的浏览器配置。

- [x] 运行 npm run typecheck、npm test、npm run build 并记录真实退出码。
- [x] 对比相同 URL、视口、主题下的截图、主要 DOM/布局；核验 CSS/资源哈希一致。
- [x] 审查 diff：接口响应、缓存 TTL、数据顺序、事件清理和客户端边界没有变化。
- 交付操作： 更新本计划和 QA 记录；暂存明确文件，检查 staged diff 和凭据模式。
- 交付操作： fetch origin 并核验 ahead/behind；创建新提交并 push origin main。
- 交付操作： fetch 后验证本地与远端 SHA 和 ahead/behind，按归属清理本次服务。
