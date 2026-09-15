# 似水流年：逐页面设计规格索引

日期：2026-09-15

状态：已确认；Phase 4 页面实施基线已建立。

上位规格：`docs/superpowers/specs/2026-09-14-site-design-system-refactor-design.md`

Phase 4 QA 协议：`docs/qa/2026-09-15-site-page-implementation-baseline.md`

## 1. 拆分原则

原路线图以 Phase 4–6 打包多个页面，无法说明每个页面独立的任务、视觉重点、组件边界和验收条件。本目录改为“一条真实路由，一份设计规格”。

每份页面规格必须回答：

- 页面为谁服务，用户进入后最先要理解或完成什么。
- 哪些现有构图和功能必须保留。
- 页面标题、主内容、辅助信息和操作如何形成层级。
- 使用哪一种页面模板和容器。
- 哪些组件复用，哪些只属于该页面。
- Loading、Empty、Error、Success 和权限状态如何呈现。
- 1440、1024、768、375px 如何变化。
- 哪些内容不能在本页面重构中顺手修改。
- 什么证据可以证明页面设计已经完成。

## 2. 页面目录

### 公共页面

| ID | 路由 | 设计规格 | 核心任务 |
|---|---|---|---|
| P01 | `/` | `home-page-design.md` | 沉浸式入口与内容导览 |
| P02 | `/posts` | `posts-index-page-design.md` | 文章书目与检索浏览 |
| P03 | `/posts/[slug]` | `article-detail-page-design.md` | 长文阅读与讨论 |
| P04 | `/moments` | `moments-page-design.md` | 轻量生活记录与互动 |
| P05 | `/album` | `album-page-design.md` | 相册浏览与图片观看 |
| P06 | `/timeline` | `timeline-page-design.md` | 跨内容类型的时间叙事 |
| P07 | `/guestbook` | `guestbook-page-design.md` | 来访留言与往来关系 |
| P08 | `/about` | `about-page-design.md` | 博主介绍与落款 |

### 账户页面

| ID | 路由 | 设计规格 | 核心任务 |
|---|---|---|---|
| A01 | `/login` | `login-page-design.md` | 登录与注册 |
| A02 | `/account` | `account-page-design.md` | 资料、头像与密码管理 |

### 后台页面

| ID | 路由 | 设计规格 | 核心任务 |
|---|---|---|---|
| M01 | `/admin/login` | `admin-login-page-design.md` | 管理员身份验证 |
| M02 | `/admin` | `admin-dashboard-page-design.md` | 文章管理总览 |
| M03 | `/admin/editor` | `admin-editor-page-design.md` | 文章创建、编辑和发布 |
| M04 | `/admin/moments` | `admin-moments-page-design.md` | 闲语发布与管理 |
| M05 | `/admin/photos` | `admin-photos-page-design.md` | 相册、上传与照片管理 |
| M06 | `/admin/profile` | `admin-profile-page-design.md` | 博主资料管理 |
| M07 | `/admin/preview/[id]` | `admin-preview-page-design.md` | 发布前文章校对 |

## 3. 跨页统一规则

- 公共页面保留山水、书法、宣纸、朱印和昼夜氛围，不改成白底卡片站。
- 页面只复用 Design Token、Container、Section、PageIntro、Button、Feedback、Dialog 行为，不共享万能 Card。
- 页面标题只使用 `display`、`standard`、`compact` 三个受控变体。
- Readable、Article、Default、Wide 四级容器继续使用总规格定义。
- 所有必要操作 hit area 不小于 44×44px。
- Loading、Empty、Error、Success 互不混用；后台刷新不清空已有内容。
- 所有页面必须同时验证 light/dark、键盘焦点、reduced-motion 和移动端横向溢出。
- 数据加载遵循 Phase 2 修订规格；页面设计不自行创建第二套缓存或请求生命周期。
- Phase 4 只建立页面实施基线，不批量修改页面视觉。

## 4. 执行顺序

页面规格彼此独立提交，但按以下依赖顺序实施：

```text
Design System / Shell / Cache
        ↓
P01 首页
        ↓
P02 文章列表 → P03 文章详情
        ↓
P04 闲语 / P05 相册 / P06 时间线
        ↓
P07 留言簿 / P08 关于
        ↓
A01 登录 → A02 账户
        ↓
M01 后台登录 → M02 后台首页
        ↓
M03 编辑器 / M04 闲语管理 / M05 照片管理 / M06 资料管理
        ↓
M07 文章预览
```

同一页面通过验收后才能进入下一个页面；不把多个页面的视觉改动打包为一个无法单独回滚的提交。

## 5. 页面完成定义

每个页面至少提交：

- 修改前后同尺寸、同主题截图。
- 关键 computed style 和容器宽度记录。
- Loading、Empty、Error、Success 和正常内容状态证据。
- 桌面、平板、移动端交互检查。
- 相关聚焦测试、完整测试、typecheck、build 和 diff-check。
- 精确 staged 文件列表、GitHub SHA；Vercel 状态单独确认。
