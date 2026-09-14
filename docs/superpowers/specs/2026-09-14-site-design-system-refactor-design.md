# 似水流年：全站设计系统与渐进式重构方案

日期：2026-09-14

状态：待用户评审的项目设计规格；本文件只定义后续重构边界，不实施页面代码。

适用仓库：`https://github.com/chaoy1/personal-blog.git`

## 1. 方案目标

在不改变网站核心功能、不删除既有功能、不更换中国风视觉身份的前提下，建立一套可持续维护的轻量级设计系统，并渐进整理公共布局、组件边界、页面层级、响应式规则、交互状态和客户端数据职责。

本方案解决的核心问题不是“重新设计一个博客”，而是把迭代过程中逐渐形成的优秀视觉语言整理为稳定规则，让后续改动可以预测、验证和回滚。

成功标准：

- 用户仍能第一眼认出当前“似水流年”博客，满幅山水、中轴书法、题签、朱印和昼夜氛围保持不变。
- 页面容器、标题层级、正文、辅助信息、间距、圆角、阴影和交互状态有明确规则。
- CSS 不再依赖持续追加的“最终覆盖”解决问题。
- 公共端、账户端和后台端共享基础规则，但保留不同的信息密度与视觉职责。
- 客户端只加载当前页面真正需要的数据，不因根级 Provider 请求全部业务数据。
- 1440、1024、768、375px 及明暗主题下均可稳定使用，无根节点横向溢出。
- 每个重构阶段都能独立验证、独立提交、独立回滚，并在验证后推送 GitHub。

## 2. 已确认的不可变约束

以下约束优先于本方案中的任何优化建议：

- 保留 `public/bg/qianli-bridge.jpg` 满幅山水背景及现有昼夜氛围。
- 保留首页居中书法站名、朱印、两侧纵向题签、统计入口、每日一句和向下浏览入口。
- 保留楷体标题、宋体正文、Fraunces 英文装饰字的现有职责。
- 保留文章、闲语、光影、时间线、留言簿、关于、账户和后台的核心功能及路由。
- 不恢复已经移除的开场卷轴，不新增全屏入场遮罩。
- 不新增按时段切换、四季主题、路由离场动画、背景多层视差、数字滚动或自动隐藏导航。
- 不修改 Supabase 数据结构、RLS、认证协议、上传接口、草稿恢复和冲突保护。
- 不为了“代码整洁”一次性重写稳定业务逻辑。
- 不引入大型 UI 框架或新的全局状态库作为重构前提。
- 视觉差异必须有页面职责依据，不能把所有内容强制变成同一种卡片。

本文件补充 `docs/superpowers/specs/2026-09-07-original-design-polish.md`。若两者涉及视觉方向，继续以“保留原设计、局部精修”为最高原则；本文件主要补足设计系统、组件架构和数据边界。

## 3. 当前项目架构

### 3.1 技术栈

- Next.js 15 App Router
- React 19
- TypeScript strict
- Supabase
- Vercel 自动部署
- Vitest + Testing Library
- React Markdown / GFM
- OpenCC
- LXGW WenKai、Zhi Mang Xing、Fraunces
- 全局 CSS；未使用 Tailwind、CSS Module 或 styled-components

### 3.2 页面与布局

```text
RootLayout
├── AppStoreProvider
├── BackgroundStage
├── Grain / Vignette
├── SiteNav / SearchPalette
├── Public
│   ├── /                 首页
│   ├── /posts            文章列表
│   ├── /posts/[slug]     文章详情
│   ├── /moments          闲语
│   ├── /album            光影
│   ├── /timeline         时间线
│   ├── /guestbook        留言簿
│   └── /about            关于
├── Auth
│   ├── /login
│   └── /account
└── Admin
    ├── /admin
    ├── /admin/editor
    ├── /admin/moments
    ├── /admin/photos
    ├── /admin/profile
    └── /admin/preview
```

搜索通过全局 SearchPalette 和 `/api/search` 完成。当前没有分类、标签、归档或独立搜索结果路由，本方案不新增这些路由。

### 3.3 样式结构

根布局依次加载：

```text
app/globals.css
  ↓
app/refinement.css
  ↓
app/studio.css
```

静态盘点基线：

| 文件 | 规模 | 主要问题 |
|---|---:|---|
| `app/globals.css` | 约 8197 行 | 基础样式、历史页面样式和后期规则混合 |
| `app/refinement.css` | 约 740 行 | 精修规则与原定义重叠 |
| `app/studio.css` | 约 3415 行 | 名称偏后台，实际包含大量公共页面最终规则 |
| `app/guestbook/guestbook.css` | 约 2731 行 | 多轮留言簿方案和最终覆盖并存 |

高风险选择器包括 `.article-nav`、`.page-intro`、`.site-nav`、`.mobile-nav-panel`、`.admin-shell` 和留言簿页面核心选择器。同一选择器跨文件、多处定义，使实际效果依赖加载顺序和 specificity。

当前样式值约有 92 种字号、280 种 padding 组合、85 种 margin、17 种圆角、108 种阴影写法、35 种最大宽度以及大量零散断点。现有 `paper`、`ink`、`seal`、`rule` 变量是可复用基础，但尚未形成完整设计系统。

### 3.4 状态与数据

`lib/app-store.tsx` 的根级 Provider 同时承担认证、个人资料、闲语、评论、点赞、相册、照片、留言和文章评论。根布局挂载后会请求多个与当前路由无关的数据集；部分 Server Component 已经获取相同数据，浏览器端又重复请求。

主要后果：

- 首屏网络请求超出当前页面需要。
- Server 与 Client 形成两套数据加载路径。
- 单一错误状态可能影响无关模块。
- Loading、Empty、Error 的来源和反馈不一致。

## 4. 总体设计策略

采用“语义 token + 明确页面模板 + 小型基础组件 + 路由级数据”的渐进方案。

不采用以下两种极端路线：

1. **一次性全站重写**：视觉和业务回归面过大，不适合自动部署到 Vercel 的现状。
2. **继续局部追加覆盖**：短期省事，但会继续放大 CSS 和组件职责债务。

推荐路线分四层推进：

```text
Design Tokens
    ↓
Layout Templates
    ↓
Behavior Primitives + Shared Components
    ↓
Page Recipes
```

底层只提供稳定规则；页面配方负责表达文章、相册、时间线和留言簿的不同气质。

## 5. 轻量级 Design System

### 5.1 颜色

优先给现有变量增加语义别名。迁移期保留旧变量，避免第一阶段产生无意视觉变化。

| 语义 Token | 浅色 | 暗色 | 用途 |
|---|---:|---:|---|
| `--color-primary` | `#B23A2B` | `#C64B31` | 朱砂、主要操作、选中状态 |
| `--color-primary-strong` | `#8F2B1F` | `#D96B4A` | 强调和危险操作 |
| `--color-secondary` | `#58738B` | `#8FA6B8` | 山青、安静的次强调 |
| `--color-background` | `#F2EDDE` | `#241C10` | 页面纸色基底 |
| `--color-surface` | `rgba(248,242,227,.92)` | `rgba(52,41,25,.92)` | 阅读面、弹层、表单纸面 |
| `--color-surface-soft` | `rgba(248,242,227,.72)` | `rgba(52,41,25,.72)` | 非关键护字层 |
| `--color-border` | `rgba(73,62,42,.22)` | `rgba(225,207,166,.22)` | 纸边与分隔线 |
| `--color-text-primary` | `#2C2A24` | `#ECDFC0` | 标题和正文 |
| `--color-text-secondary` | `#6F685A` | `#B6A67D` | 描述和 Metadata |
| `--color-text-muted` | `#817968` | `#91815B` | 非关键辅助信息 |
| `--color-success` | `#4E6655` | `#9BB29A` | 成功反馈 |
| `--color-warning` | `#92714D` | `#C4A071` | 警告反馈 |
| `--color-error` | `#8F2B1F` | `#D96B4A` | 错误和危险反馈 |

颜色验收必须在真实山水和纸纹背景上进行。纯色背景上的对比度结果不能代替页面实测。

### 5.2 Typography

| 层级 | 桌面 | 移动端 | 字体职责 |
|---|---|---|---|
| Display | `56px / 1.10` | `40px / 1.15` | 首页、时间线等少量艺术标题 |
| H1 | `44px / 1.25` | `36px / 1.30` | 标准页面主标题 |
| H2 | `32px / 1.35` | `28px / 1.40` | 页面 Section 标题 |
| H3 | `24px / 1.45` | `22px / 1.45` | 内容子标题 |
| Body | `17px / 1.90` | `17px / 1.90` | 普通正文 |
| Small | `14px / 1.70` | `14px / 1.70` | Metadata、辅助说明 |
| Caption | `12px / 1.50` | `12px / 1.50` | 非关键题注和英文索引 |

长文章桌面正文可保持 `18px / 1.95`。Display 是受控变体，不允许页面自行引入 60–80px 的新一级标题。

字体职责：

- Zhi Mang Xing：书法标题、落款、印章附近的少量文字。
- LXGW WenKai：页面标题、Section 标题、强调短句。
- 宋体栈：正文和长篇阅读。
- Fraunces：英文索引、年份、数字和装饰性 Metadata。

### 5.3 Spacing

```text
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
--space-12: 48px
--space-16: 64px
```

页面和公共组件只使用上述阶梯。书法题签、印章和背景元素的艺术定位可以例外，但例外必须封闭在组件内部。

### 5.4 Radius

```text
--radius-xs: 2px
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-pill: 999px
```

宣纸、书目和题签以 `2–4px` 为主；`8–12px` 只用于输入区和弹层。避免把全站改成高圆角卡片。

### 5.5 Shadow

```text
--shadow-sm   轻触发和按钮悬浮
--shadow-md   纸张、搜索面板、普通浮层
--shadow-lg   Dialog、Lightbox
```

阴影数量限制为三个等级。纸张层级优先依靠纸边、纹理、透明度和留白，不用多层重阴影表达。

### 5.6 Container 与 Section

| Token | 宽度 | 适用场景 |
|---|---:|---|
| `--container-readable` | `680px` | 正文实际行宽 |
| `--container-article` | `780px` | 文章纸张主体 |
| `--container-default` | `900px` | 普通列表、关于、闲语 |
| `--container-wide` | `1080px` | 留言簿、复杂图库 |

统一 gutter：

- `>= 1200px`：56px
- `900–1199px`：40px
- `640–899px`：32px
- `< 640px`：20–22px

Section 默认纵向间距：桌面 64px、平板 48px、移动端 40px。

## 6. 页面框架

公共页面不使用一个万能布局，而是使用五个明确模板：

### 6.1 Immersive

- 适用：主页。
- 职责：展示满幅山水、中轴题字、题签、统计、每日一句和向下入口。
- 规则：不增加大面积不透明遮罩；只在必要文字后增加局部护字层。

### 6.2 Open Collection

- 适用：文章列表、时间线的开放区域。
- 职责：让内容与背景保持联系，减少多余外框。
- 规则：使用 Default 容器；标题、说明和列表起始位置统一。

### 6.3 Paper Collection

- 适用：闲语、相册等需要连续纸面的列表。
- 职责：将题头和内容组织为一张连续宣纸。
- 规则：纸面内部依靠间距和细线分层，不嵌套多层卡片。

### 6.4 Wide Paper

- 适用：留言簿、需要双栏或复杂关系的页面。
- 职责：提供 1080px 宽纸面和独立移动端降级规则。
- 规则：只给确实需要宽度的内容使用，不扩散为全站默认。

### 6.5 Reading

- 适用：文章详情。
- 职责：680px 阅读行宽、780px 纸面、外侧 Reading Companion。
- 规则：窄桌面和移动端隐藏或折叠辅助轨道，不挤压正文。

账户页使用独立 Auth Shell；后台使用独立 Admin Shell。二者共享 token、表单、按钮、反馈和弹层行为，但不继承公共山水内容布局与页面数据请求。

## 7. 组件体系

### 7.1 保留并强化

- `SiteNav`：继续承担公共导航、主题和简繁入口。
- `ArticleNav`：保留当前文字宣纸痕迹方向，统一最小点击区域和状态。
- `PageIntro`：改为 `standard | display | compact` 三种明确变体。
- `Avatar`：保留现有公共头像能力。
- `PostList`：继续负责文章书目结构。
- `MarkdownView`：继续作为正文和后台预览的共同渲染入口。
- `ReadingCompanion`：只服务 Reading 模板。
- `BackgroundStage`、`QianliAmbient`、`StarryNight`、`MapleLeaves`：保留现有环境表现与低动态策略。

### 7.2 建议新增的基础单元

| 单元 | 职责 | 不承担的职责 |
|---|---|---|
| `Container` | 宽度、gutter、对齐 | 背景、阴影、页面主题 |
| `Section` | 统一纵向节奏 | 任意艺术定位 |
| `Button` | 尺寸、状态、Loading、焦点、危险语义 | 页面布局 |
| `FormField` | Label、说明、控件和错误关联 | 数据提交 |
| `InlineFeedback` | Success、Warning、Error、Info | 页面级错误恢复逻辑 |
| `EmptyState` | 空数据语义和可选操作 | Loading 或请求失败 |
| `DialogBehavior` | 焦点陷阱、Escape、滚动锁、焦点返回 | 统一所有 Dialog 的视觉外观 |
| `Pagination` | 页码、前后翻页、禁用态 | 数据获取 |

不建立万能 `Card`。文章书目、闲语、照片、时间线和留言的形态不同，应共享 token 和行为规则，而不是共享同一个视觉容器。

Badge、Tabs、Tooltip、Dropdown 只在出现至少两个稳定复用场景后建立。

### 7.3 需要拆分的职责

`lib/app-store.tsx`：

```text
AuthProvider
├── session
├── profile
└── auth actions

Route-scoped resources
├── useMoments
├── useAlbums
├── useGuestbook
└── useComments(resourceType, resourceId)
```

迁移过程中保留现有公开方法兼容层。每迁移一个页面后删除该页面对旧全局数据的依赖，不在单个提交中一次性替换全部消费者。

`app/guestbook/page.tsx`：

```text
GuestbookPage
├── useGuestbookComposer
├── GuestbookThread
├── GuestbookComposer
└── GuestbookPagination
```

拆分只改变职责边界，不改变留言树、回复、编辑、删除和分页行为。

## 8. 页面级方案

| 页面 | 模板 | 主要改进 | 保留内容 |
|---|---|---|---|
| 首页 | Immersive | 文字护层、垂直节奏、点击区 | 中轴山水和原入口顺序 |
| 文章列表 | Open Collection | 题头层级、列表间距、空状态 | 书目式文章列表 |
| 文章详情 | Reading | 行宽、Metadata、目录和评论反馈 | Markdown 与阅读轨道 |
| 闲语 | Paper Collection | 状态反馈、删除确认、密度 | 现有动态列表 |
| 光影 | Paper Collection / Wide | 图片间距、题注、筛选反馈 | 相册结构与 Lightbox |
| 时间线 | Open Collection | Display 标题收敛、节点层级 | 交错时间轴和续卷交互 |
| 留言簿 | Wide Paper | CSS 整理、表单与线程职责拆分 | 双栏宣纸和留言关系 |
| 关于 | Open Collection | 标题、正文层级、移动端行宽 | 题跋式长卷 |
| 登录/账户 | Auth Shell | 表单、反馈、焦点状态 | 认证流程 |
| 后台 | Admin Shell | 基础控件统一、与公共运行环境解耦 | 高密度管理能力 |

## 9. 交互、无障碍和状态

### 9.1 点击区域

所有必要交互的实际 hit area 最小为 44×44px。图形本身可以维持当前视觉尺寸，通过伪元素或外层按钮扩大透明点击区域。

重点对象：搜索、简繁切换、主题开关、移动菜单、回到顶部、每日一句切换、图标按钮和分页按钮。

### 9.2 状态规则

```text
Loading  请求仍在进行，不显示空数据结论
Empty    请求成功但结果为空，可提供下一步操作
Error    请求失败，说明影响范围并提供重试
Success  操作完成，必要时说明结果
```

错误状态必须绑定所属资源，留言加载失败不能覆盖相册或闲语页面状态。

### 9.3 焦点与弹层

- 键盘焦点始终可见。
- Hover、Focus、Active 的视觉含义一致，但不要求三者完全同形。
- Dialog 打开后焦点进入第一个合理控件。
- Tab 和 Shift+Tab 保持在弹层内。
- Escape 关闭后焦点返回触发按钮。
- 关闭时恢复 body 滚动状态。
- 公共端不再使用 `window.confirm` 完成删除确认。

### 9.4 动效

- 保留 `useAmbientMotion(): boolean | null` 契约。
- 保留 reduced-motion、Save-Data 和页面可见性策略。
- 内容浮现 450–650ms；分组错落最多约 210ms。
- Hover 位移 2–3px，反馈 180–240ms，仅 fine pointer 启用。
- 首屏关键内容不依赖动画结束后才可见或可操作。

## 10. 响应式规则

统一响应式区间：

```text
mobile              < 640px
tablet              640–899px
compact desktop     900–1199px
wide desktop        >= 1200px
```

组件可保留少量专用断点，例如 Reading Companion 的安全显示宽度和图库列数，但必须在规则附近说明原因。

目标视口：

| 宽度 | 必验内容 |
|---:|---|
| 1440 | 首页完整构图、文章正文与阅读轨道、Wide Paper |
| 1024 | 折叠导航、Default/Wide 容器、双栏降级 |
| 768 | tablet gutter、标题尺度、列表和表单 |
| 375 | 移动导航、点击区域、单列布局、文字对比和溢出 |

补充回归尺寸继续沿用 390×844、360×800 和 1280×720。

每个目标页面必须满足：

```javascript
document.body.scrollWidth <= window.innerWidth &&
document.documentElement.scrollWidth <= window.innerWidth
```

代码块、表格和必要的横向媒体只允许在自身容器滚动。

## 11. 优先级问题清单

### P0：重构前必须建立控制

| 问题 | 位置 | 原因 | 解决方式 |
|---|---|---|---|
| 全局 CSS 重复覆盖 | `globals.css`、`refinement.css`、`studio.css` | 修改结果不可预测 | 建 token 与分层迁移规则，停止追加最终覆盖 |
| 浅色主题文字保护不足 | 首页、文章列表、留言簿等 | 山水细节降低正文和辅助文字可读性 | 局部纸面或渐变护字层，实景对比度验收 |
| 根级 Store 请求全部数据 | `lib/app-store.tsx`、根布局 | 重复请求、状态耦合、错误污染 | 拆 Auth 与路由资源，逐页面迁移 |

### P1：明显影响一致性和体验

| 问题 | 解决方式 |
|---|---|
| 页面模板、容器、gutter 未命名 | 建五类模板和四级容器 |
| 字号、间距、圆角、阴影种类过多 | 使用 Design Token，并保留少量艺术例外 |
| 断点分散 | 收敛四个响应式区间 |
| 点击区域偏小 | 扩展到 44×44px |
| Loading、Empty、Error 混用 | 建立明确状态组件和 ARIA 语义 |
| 弹层行为重复 | 提取 DialogBehavior |
| `window.confirm` 与自定义确认框并存 | 统一确认行为 |
| AppStore 和留言簿页面职责过重 | 分批拆 Hook 与展示组件 |

### P2：随相关页面逐步处理

- 零散 inline style 和一次性 magic number。
- 缺少复用场景的单次颜色、阴影和圆角变体。
- 历史 CSS 注释、未引用规则和旧实验资产。
- 不影响维护和体验的稳定业务代码保持原状。

## 12. 分阶段 Roadmap

### Phase 1：Design System Foundation

- 目标：建立 token、样式分层约定和可复用验收基线。
- 涉及：`app/globals.css`、`app/refinement.css`、`app/studio.css`、`PageIntro`、`ArticleNav`、反馈样式及相关测试。
- 破坏性：低；旧变量保留兼容映射。
- 依赖：无，是全部后续阶段的前置条件。

### Phase 2：Global Layout 与数据边界

- 状态：原 Shell 与路由级消费边界已经完成；数据生命周期设计于 2026-09-15 修订。
- 修订规格：`docs/superpowers/specs/2026-09-15-site-phase-2-prefetch-cache-design.md`。
- 目标：保留 Public、Auth、Admin shell 和路由级领域 Hook；新增服务端初始快照、会话级惰性缓存、请求去重、路由预取及 stale-while-revalidate，消除跨页面导航时的数据清空与内容跳跃。
- 涉及：`app/layout.tsx`、资源 route layout、`SiteNav`、四个资源 context、公共资源缓存与服务端/浏览器 loader。
- 破坏性：中；URL、业务接口、Supabase 结构和现有视觉不变。
- 依赖：Phase 1；修订实现完成后再继续依赖数据生命周期的后续页面重构。

### Phase 3：基础组件与行为

- 目标：建立 Container、Section、Button、FormField、InlineFeedback、EmptyState、DialogBehavior。
- 涉及：公共 components、表单、搜索、灯箱、确认框、分页。
- 破坏性：低至中；先提供兼容调用，再逐个迁移。
- 依赖：Phase 1–2。

### Phase 4：页面实施基线

- 目标：冻结公共页面、账户页面和后台页面的逐页设计边界，建立同尺寸截图、状态样例、响应式和可访问性验收模板。
- 页面索引：`docs/superpowers/specs/pages/2026-09-15-page-design-index.md`。
- 涉及：页面测试夹具、截图约定、公共 Mock/状态数据；不批量修改页面视觉。
- 破坏性：低；本阶段只准备证据和实施顺序。
- 依赖：Phase 1–3。

### Phase 5：公共页面逐页实施

Phase 5 不再作为一次全站页面改造执行。以下八个页面分别设计、实现、验证、提交和回滚：

| 子阶段 | 路由 | 设计重点 | 主要文件 | 风险 | 依赖 |
|---|---|---|---|---|---|
| P01 | `/` | 沉浸式首屏、内容导览、Section 节奏 | `app/page.tsx`、首页区块组件 | 中 | Phase 4 |
| P02 | `/posts` | 书目式文章索引、筛选与空态 | `app/posts/page.tsx`、`PostList` | 中 | P01 的公共题头规则 |
| P03 | `/posts/[slug]` | 阅读宽度、Markdown、阅读伴侣与评论 | `app/posts/[slug]/page.tsx`、文章阅读组件 | 中至高 | P02、评论基础行为 |
| P04 | `/moments` | 连续札记、图片、点赞和回复层级 | `app/moments/page.tsx`、`CommentThread` | 中 | Phase 4 |
| P05 | `/album` | 相册索引、册内网格与灯箱 | `app/album/page.tsx`、`Lightbox` | 中 | Dialog/媒体基础行为 |
| P06 | `/timeline` | 混合内容时间叙事与渐进加载 | `app/timeline/page.tsx`、`TimelineReveal` | 中 | P02、P04、P05 的内容语言 |
| P07 | `/guestbook` | 宽宣纸、留言树、书写面板与分页 | `app/guestbook/page.tsx`、评论/分页组件 | 高 | 评论、Dialog、分页基础行为 |
| P08 | `/about` | 自序正文、专属书法题头与落款 | `app/about/page.tsx`、`PageIntro` | 低至中 | 公共 Typography |

完整设计分别见页面索引。P01–P08 可以按依赖顺序推进，但每个页面必须通过自身状态与视口验收后再提交；不得以“Phase 5 完成”为由合并未经验证的跨页视觉改动。

### Phase 6：认证与后台页面逐页实施

Phase 6 同样拆为九个独立工作单元。账户页先确定表单语言，后台再复用行为基础，不把公共内容页的沉浸式布局机械搬入管理界面。

| 子阶段 | 路由 | 设计重点 | 主要文件 | 风险 | 依赖 |
|---|---|---|---|---|---|
| A01 | `/login` | 登录/注册模式、表单反馈与安全跳转 | `app/login/page.tsx` | 中 | Phase 3–4 |
| A02 | `/account` | 头像、资料、密码与分区脏状态 | `app/account/page.tsx` | 中 | A01、Form/Dialog 行为 |
| M01 | `/admin/login` | 管理身份识别、权限反馈与返回路径 | `app/admin/login/page.tsx` | 中 | A01 |
| M02 | `/admin` | 文章搜索、筛选、状态和行级操作 | `app/admin/page.tsx`、`app/admin/layout.tsx` | 中 | M01、后台 Shell |
| M03 | `/admin/editor` | 写作主区、元数据、草稿恢复、冲突和发布 | `app/admin/editor/page.tsx`、编辑器子组件 | 高 | M02、Dirty State/Dialog |
| M04 | `/admin/moments` | 发布编辑区与既有闲语管理 | `app/admin/moments/page.tsx` | 中 | M02、上传/确认行为 |
| M05 | `/admin/photos` | 相册、上传队列和照片管理三段工作流 | `app/admin/photos/page.tsx` | 高 | M02、上传/确认行为 |
| M06 | `/admin/profile` | 公开身份、长文介绍与头像保存 | `app/admin/profile/page.tsx` | 中 | A02、P08 的数据契约 |
| M07 | `/admin/preview/[id]` | 公开文章拟真、预览身份和返回编辑 | `app/admin/preview/[id]/page.tsx`、`ArticlePreview` | 中 | P03、M03 |

每个子阶段保留现有权限、API、Supabase schema 和业务流程。M03、M05 属于高风险工作区，必须单独提交，不能与后台 Shell 或其他管理页同时迁移。

### Phase 7：响应式、交互与无障碍

- 目标：完成目标视口、明暗主题、点击区域、Focus、键盘和低动态验收。
- 破坏性：低；只修复前六阶段暴露的问题。
- 依赖：Phase 4–6。

### Phase 8：清理与统一

- 目标：删除确认无引用的历史规则、兼容别名和重复实现，补齐维护文档。
- 破坏性：中；只有在完整视觉回归通过后执行。
- 依赖：Phase 1–7。

## 13. 第一阶段执行设计

第一阶段只建立基础，不开展全站视觉改版。

### 13.1 交付物

- 一份现状 token 到语义 token 的映射表。
- 新的颜色、字体、间距、圆角、阴影、容器变量。
- CSS 分层和“最终声明归属”说明。
- `PageIntro`、`ArticleNav`、按钮/反馈状态的首条迁移样板。
- 目标页面的明暗主题截图和 computed style 基线。
- 根节点横向溢出、主题、焦点和样式契约测试。

### 13.2 迁移顺序

1. 固定当前 Git、测试、截图和真实 CSS 计算值基线。
2. 新增语义 token，让旧变量映射到新 token，保持页面外观不变。
3. 明确基础、布局、组件、页面和工具样式的归属，不立即移动全部旧规则。
4. 迁移 `ArticleNav`，确认跨三个 CSS 文件的重复声明可以安全收口。
5. 迁移 `PageIntro`，建立 `standard | display | compact` 变体。
6. 迁移 Button、Feedback、Empty 状态的视觉 token，不改变业务行为。
7. 为浅色文章列表的必要文字增加局部护字层，作为颜色系统的真实验收切片。
8. 完成自动化与浏览器验证后再删除本批次已失效的旧声明。

### 13.3 第一阶段验收门禁

- 原视觉构图无变化，只有明确批准的对比度修复可以产生可见差异。
- 新增样式不依赖新的 `!important`。
- `ArticleNav` 和 `PageIntro` 的关键属性只有一个最终归属。
- 1440、1024、768、375px 明暗主题无根节点横向溢出。
- 菜单、搜索、主题、简繁和表单焦点行为不回退。
- `npm test`、`npm run typecheck`、`npm run build`、`git diff --check` 全部通过。
- 仅 stage 本阶段明确修改的文件，不使用 `git add -A`。
- 推送 GitHub 后核对远端 SHA；Vercel 部署状态单独确认。

## 14. 推荐优先修改的文件

第一层：

1. `app/globals.css`
2. `app/refinement.css`
3. `app/studio.css`
4. `app/layout.tsx`
5. `lib/app-store.tsx`
6. `components/PageIntro.tsx`
7. `components/ArticleNav.tsx`
8. `components/SiteNav.tsx`

第二层：

9. `app/guestbook/page.tsx`
10. `app/guestbook/guestbook.css`
11. `components/SearchPalette.tsx`
12. `components/Lightbox.tsx`
13. `components/AdminConfirmDialog.tsx`
14. 首页、文章、闲语、相册、时间线和阅读页对应文件
15. 样式契约、交互和响应式测试

## 15. 风险与回滚

| 风险 | 控制方式 |
|---|---|
| 删除重复 CSS 后视觉变化 | 先记录 computed style，再单选择器迁移和截图对比 |
| 页面被过度统一 | 使用页面模板和 recipe，不建立万能 Card |
| 暗色主题遗漏 | 每个视觉批次同时验收 light/dark |
| AppStore 拆分影响实时更新 | 保留兼容层，逐页面迁移，使用行为测试保护 |
| Route Group 影响 metadata 或 middleware | URL 不变，逐路由验证 metadata、认证和重定向 |
| 本地 Supabase 无数据 | 使用确定性测试 fixture 或可访问公开数据，不写生产演示数据 |
| main 推送触发生产部署 | 每批次小提交；优先 Vercel Preview，生产合并后再终验 |

任何阶段出现不可接受回归时，只回滚该阶段的小提交，不回滚此前已经验收的阶段。

## 16. 完整验收矩阵

### 自动化

```powershell
npm test
npm run typecheck
npm run build
git diff --check
```

### 浏览器

- 页面：首页、文章列表、长文、闲语、相册、时间线、留言簿、关于、登录、账户、后台登录和关键后台页面。
- 主题：light、dark。
- 宽度：1440、1280、1024、768、390、375、360。
- 交互：导航、搜索、主题、简繁、灯箱、目录、分页、表单、确认弹层、回到顶部。
- 状态：Loading、Empty、Error、Success、禁用、无权限。
- 动效：正常、reduced-motion、Save-Data、后台标签页恢复。

### 发布

1. 核对本地 HEAD、目标分支和 staged 文件。
2. 检查凭据与无关文件未进入提交。
3. 推送 GitHub 后核对远端 SHA 和 ahead/behind。
4. 单独检查 Vercel 构建状态。
5. 生产域名执行首页、文章和至少一个交互页面的冒烟检查。

GitHub push 成功只代表代码已同步；只有 Vercel 构建成功且生产页面通过冒烟检查，才能报告“已上线”。

## 17. 本方案范围外

- 新增分类、标签、归档或独立搜索页。
- 更换 Supabase 或 Vercel。
- 数据库迁移、RLS 重写或认证系统替换。
- 新增富文本编辑器。
- 恢复开场卷轴或新增大型背景动画系统。
- 更换首页为杂志、仪表盘、极简白底或其他全新构图。
- 一次性删除全部历史 CSS。
- 为了组件目录完整而创建没有复用场景的组件。

## 18. 设计决策摘要

后续实施以以下决策作为审查准绳：

1. 视觉上保留原貌，工程上建立新秩序。
2. 先定义 token，再整理模板和组件，最后清理历史规则。
3. 统一的是基础规则和交互语义，不是所有页面的外观。
4. 数据按路由加载，认证保持全局；不引入新的重型状态库。
5. 所有阶段小批提交、完整验证、推送 GitHub，并单独确认 Vercel。
