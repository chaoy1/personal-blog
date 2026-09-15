# Phase 4：页面实施基线与验收协议

日期：2026-09-15
范围：`2026-09-14-site-design-system-refactor-design.md` 的 Phase 4
上位页面索引：`docs/superpowers/specs/pages/2026-09-15-page-design-index.md`

## 1. 范围与边界

本阶段建立 P01–P08、A01–A02、M01–M07 的逐页面实施顺序、统一证据字段和验收记录格式。页面规格已按真实路由拆分，基线矩阵由 `tests/fixtures/page-design-baseline.ts` 维护，并由 `tests/page-design-baseline.test.ts` 校验。

本阶段不等于逐页面视觉完成。Phase 4 不批量修改页面视觉，不调整页面业务流程、Supabase schema、RLS、认证协议、上传流程、Markdown 输出或 Phase 2 数据缓存生命周期；后续每个页面必须独立完成实现、截图、状态和回归验证后才能提交。

公共页面继续保留山水、书法、宣纸、朱印和昼夜氛围；页面只共享 Design Token、Container、Section、PageIntro、Button、Feedback 和 Dialog 行为，不建立万能 Card。`/login`、`/account` 和 `/admin/login` 当前的公共背景/导航例外属于 Shell 回归修正，不在本基线阶段扩展为其他页面的视觉改造。

## 2. 页面执行清单

页面顺序遵循依赖关系：先公共页面，再账户页面，最后后台页面。每个页面通过自身验收后才能进入下一个页面；不得以“Phase 4 已建立基线”代替后续页面完成证据。

| ID | 路由 | 规格 | 模板 | 区域 |
| --- | --- | --- | --- | --- |
| P01 | `/` | `home-page-design.md` | Immersive + 分段式内容长卷 | public |
| P02 | `/posts` | `posts-index-page-design.md` | Open Collection | public |
| P03 | `/posts/[slug]` | `article-detail-page-design.md` | Reading | public |
| P04 | `/moments` | `moments-page-design.md` | Paper Collection | public |
| P05 | `/album` | `album-page-design.md` | Paper Collection / Gallery Detail | public |
| P06 | `/timeline` | `timeline-page-design.md` | Chronicle | public |
| P07 | `/guestbook` | `guestbook-page-design.md` | Wide Correspondence Paper | public |
| P08 | `/about` | `about-page-design.md` | Readable Profile Scroll | public |
| A01 | `/login` | `login-page-design.md` | Focused Auth | auth |
| A02 | `/account` | `account-page-design.md` | Account Settings | auth |
| M01 | `/admin/login` | `admin-login-page-design.md` | Focused Admin Auth | admin |
| M02 | `/admin` | `admin-dashboard-page-design.md` | Admin Collection | admin |
| M03 | `/admin/editor` | `admin-editor-page-design.md` | Writing Workspace | admin |
| M04 | `/admin/moments` | `admin-moments-page-design.md` | Composer + Admin Collection | admin |
| M05 | `/admin/photos` | `admin-photos-page-design.md` | Asset Workspace | admin |
| M06 | `/admin/profile` | `admin-profile-page-design.md` | Owner Profile Settings | admin |
| M07 | `/admin/preview/[id]` | `admin-preview-page-design.md` | Public-Fidelity Preview | admin |

## 3. 视口矩阵

所有页面至少记录以下七组同尺寸数据。`1440×900`、`1024×768`、`768×1024` 和 `375×812` 是主要目标；`390×844`、`360×800` 和 `1280×720` 是持续回归尺寸。

| 类型 | 视口 |
| --- | --- |
| wide desktop | `1440×900` |
| compact desktop | `1024×768` |
| tablet | `768×1024` |
| mobile reference | `390×844` |
| mobile target | `375×812` |
| mobile small | `360×800` |
| desktop reference | `1280×720` |

记录时必须使用实际 viewport，而不是只缩放浏览器窗口截图。重点检查：标题是否溢出、容器是否越过安全边距、按钮是否可触达、图片和代码块是否只在自身容器内横向滚动、双栏是否按页面规格降级。

## 4. 主题、动效与状态矩阵

### 4.1 主题和动效

- 主题：`light`、`dark`。
- 动效：默认 motion 与 `prefers-reduced-motion`。
- 公共页面在真实山水背景上检查文字保护层，不以纯色背景上的对比度结果替代实测。
- 保留 `useAmbientMotion(): boolean | null`、Save-Data 和页面可见性策略。
- 首屏关键内容在动画未完成前也必须可读、可操作。

### 4.2 状态

每个页面按其规格记录 `normal`、`loading`、`empty`、`error`、`success`；存在权限判断的账户/后台页面额外记录 `permission`。

| 状态 | 记录要求 |
| --- | --- |
| `normal` | 有代表性的真实或确定性 mock 内容，记录主要层级和容器宽度 |
| `loading` | 请求进行中，不渲染“空数据”结论，不让内容区无故跳变 |
| `empty` | 请求成功且结果为空，使用一处清晰的 EmptyState 和可选下一步 |
| `error` | 绑定所属资源，说明影响范围并提供重试；不覆盖无关资源 |
| `success` | 说明操作已完成，必要时说明更新了哪个分区或资源 |
| `permission` | 仅在适用页面记录未登录、无权限、管理员会话和安全返回路径 |

后台刷新必须保留已有内容、滚动位置和当前工作上下文；错误不能被误写成空状态，空状态不能被误写成加载失败。

## 5. 截图和证据命名

截图统一保存为：

```text
docs/qa/phase4-page-baseline/<page-id>/<theme>/<viewport>/<state>.png
```

例如：

```text
docs/qa/phase4-page-baseline/P01/light/1440x900/normal.png
docs/qa/phase4-page-baseline/A02/dark/375x812/error.png
docs/qa/phase4-page-baseline/M03/light/1024x768/permission.png
```

每一条截图记录必须同时写明：

| 字段 | 内容 |
| --- | --- |
| page | 页面 ID 与真实路由 |
| git SHA | 截图对应的本地提交 |
| viewport | 宽度 × 高度 |
| theme | `light` 或 `dark` |
| state | 状态矩阵中的状态 |
| container | 实际主容器宽度与使用的容器 token |
| overflow | `body.scrollWidth`、`documentElement.scrollWidth`、`window.innerWidth` |
| typography | 页面标题、正文和辅助信息的 computed `font-family`、`font-size`、`line-height` |
| focus | 首个合理焦点、Tab 顺序、Escape/焦点返回结果 |
| motion | 默认 motion 或 reduced-motion 的实际结果 |
| notes | 与该页面规格相关的保留项、降级项和异常说明 |

页面完成定义要求修改前后使用同尺寸、同主题截图；Phase 4 只冻结命名和记录格式，不生成虚假的前后对照图。

## 6. 横向溢出与 computed style

每组视口都执行：

```javascript
document.body.scrollWidth <= window.innerWidth
document.documentElement.scrollWidth <= window.innerWidth
```

记录原始数值，而不仅记录“通过”。如果不通过，进一步定位到具体元素；代码块、表格和必要的横向媒体只能在自身容器滚动，不得让根节点扩大。

至少记录以下 computed style：

- 主容器 `max-width`、`width`、左右 gutter、`padding-inline`。
- 页面标题的字体职责、字号、行高和最大宽度。
- 正文的字体、字号、行高和可读行宽。
- 主要操作的最小宽高、焦点样式和 disabled/loading 样式。
- 纸面、弹层或灯箱的背景/边框/阴影；确认没有因基线工作新增整页不透明遮罩。

## 7. 交互与可访问性检查

每个页面按实际存在的交互记录：

- 必要操作 hit area 不小于 `44×44px`，包括导航、主题、简繁、搜索、分页、回到顶部、每日一句和图标按钮。
- 键盘焦点始终可见，Tab/Shift+Tab 顺序符合页面信息层级。
- 表单字段有 label、合理 autocomplete、错误关联和提交中状态。
- Dialog 打开后焦点进入合理控件，Tab 保持在弹层内，Escape 关闭，关闭后焦点返回触发按钮，body 滚动状态恢复。
- Lightbox 的关闭、前后切换、触摸和 reduced-motion 不破坏焦点或页面滚动。
- 分页首尾按钮禁用状态、摘要文本和键盘激活行为明确。
- 公共删除流程不使用 `window.confirm`。
- 状态反馈使用正确的 `role="status"` 或 `role="alert"`，并绑定到所属资源。

## 8. 数据和实现边界

- 页面数据加载遵循 Phase 2 修订规格提供的服务端快照、会话缓存、预加载和后台刷新。
- 页面规格和 QA 夹具不直接调用 Supabase，不创建第二套缓存，不改变数据结构或权限策略。
- 公共、账户、后台 Shell 继续保持职责边界；页面基线不能通过修改根 Provider 来制造测试数据。
- 每个后续页面只修改自身路由、明确复用组件和对应测试；不顺手重构其他页面。

## 9. 当前证据状态

| 证据 | 状态 |
| --- | --- |
| 17 条真实路由与本地页面规格映射 | 已由 `tests/page-design-baseline.test.ts` 固化 |
| 页面规格必备章节 | 已由基线契约测试校验 |
| 七组视口、两种主题、六类状态命名 | 已建立并由契约测试校验 |
| 截图、computed style、overflow、焦点记录格式 | 本文已建立，后续逐页复用 |
| Phase 1 设计系统自动化证据 | 继承 `docs/qa/2026-09-14-site-design-system-foundation.md` |
| Phase 2 数据边界自动化证据 | 继承 Phase 2 修订规格和已推送提交记录 |
| P01–P08/A01–A02/M01–M07 实际前后截图 | 由各页面实施阶段单独生成；本阶段不虚构 |
| Vercel 部署状态 | 与 GitHub push 分开确认 |

## 10. Phase 4 完成条件

- 页面索引、规格文件和真实源码路径一一对应。
- 统一矩阵由可执行测试维护，而不是只靠手工复制表格。
- 后续页面知道必须记录哪些正常/Loading/Empty/Error/Success/Permission 状态。
- 后续页面知道如何命名截图、记录 computed style、验证根节点溢出和键盘交互。
- 明确 Phase 4 不批量修改页面视觉，P01–P08、A01–A02、M01–M07 仍按顺序独立实施。
- 自动化测试、typecheck、build 和 diff-check 均有实际输出；不可用的浏览器工具或线上数据必须明确标记，不得伪造证据。
