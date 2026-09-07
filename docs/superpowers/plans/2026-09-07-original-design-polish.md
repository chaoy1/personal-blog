# 原有设计精修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 默认在当前任务内顺序执行，无须另行询问执行方式。

**Goal:** 在用户原有满幅山水博客上改善文字、纸面、间距和动效细节，保留原构图及审美。

**Architecture:** 沿用 App Router 页面与现有组件，在实际生效的样式声明处做局部精修。保留数据层和交互接口；性能优化依据测量进行，避免额外全局样式覆盖层。

**Tech Stack:** Next.js 15、React 19、TypeScript、CSS、Canvas 2D、Supabase、Vitest。

**Spec:** `docs/superpowers/specs/2026-09-07-original-design-polish.md`。执行者须先读完整方案，尤其原貌约束。

## Global Constraints

- 原设计是唯一视觉基准；三种新风格预览均已被用户否定，不复用其布局。
- 保留满幅山水、居中题字、两侧题签、朱印、枫叶、昼夜氛围和首页分区顺序。
- 不恢复开场卷轴；不新增季节主题、时段主题、路由离场、背景多层视差、数字滚动或自动隐藏导航。
- 不新增运行时依赖、不升级版本或 Node engine、不修改 Supabase 数据结构与权限。
- 保持 `useAmbientMotion(): boolean | null` 契约及 `supportsFinePointer()` 判断。
- CSS 加载顺序 globals → refinement → studio 不变；只合并本次修改选择器的冗余声明。
- 保留已有未跟踪文档；只 stage 本任务明确修改的文件。
- 实现需使用隔离分支/worktree；计划文档本身可在当前 main 提交。
- 用户已授权验证后直接 push。每个完整、通过验证的开发批次同步 GitHub；不把半成品或每次文件保存推到生产。
- 当前 main 自动部署为用户描述；未来发布时确认 Vercel 生产分支配置，不能把仅推功能分支称为已更新生产。

## Task 1：建立原貌基线与检查表

**Files:** Read `app/layout.tsx`, `app/globals.css`, `app/refinement.css`, `app/studio.css`, `package.json`；Create `docs/qa/2026-09-original-design-polish.md`。

**产出：** 后续任务共用的原页面截图索引、环境说明、选择器归属和验证记录。

- [ ] 使用 using-git-worktrees skill，在最新 main 上建立 `codex/original-design-polish` 隔离工作区，先检查分支是否已存在。保留当前未跟踪文件。
- [ ] 核对 Git 基线并运行基础检查，各命令独立执行，失败先记录原因。

```powershell
git status --short --branch
git fetch origin
git log -5 --oneline
npm test
npm run typecheck
npm run build
```

- [ ] 按生产模式启动本地站点；构建与开发服务器不共用同一个运行中的 `.next` 写入过程。

```powershell
npm run start -- --hostname 127.0.0.1 --port 3100
```

- [ ] 拍摄首页首屏/内容区、文章列表、实际长文章、相册、闲语、时间轴、留言、关于、登录和账户页的明暗截图；后台记录登录及现有编辑器纸面作为回归参考。
- [ ] 首轮取 1440×900、1280×720、390×844；记录浏览器、字体、主题、内容来源。数据请求失败时记录限制，补充可访问的公开内容或本地测试数据后再评价内容区。
- [ ] 检查下列选择器在三个 CSS 文件中的定义，并在 QA 记录里标注最终归属，避免只修改被覆盖的早期声明。

```powershell
rg -n 'home-hero|masthead|hero-stats|daily-quote|verse|sigil|page-intro|home-post-card|md-body|reading-companion' app/globals.css app/refinement.css app/studio.css
```

## Task 2：首页中轴、题签与文字清晰度

**Files:** Modify `app/globals.css`, `app/refinement.css`, `app/studio.css` 中 Task 1 确认的相关声明；必要时仅为样式作用域 Modify `app/page.tsx`。

**接口：** 保留 `.home-hero`, `.masthead`, `.verse`, `.sigil`, `.hero-stats`, `.daily-quote`；不变更首页数据读取。

- [ ] 在原有选择器中调整垂直节奏：优先采用 8px 间距阶梯；先保留站名尺寸，校准站名下缘至描述、统计至每日一句的空隙。矮屏下只缩短这些间距。
- [ ] 两侧题签统一内边距、边缘透明度和文字行距；不把题签变成大卡片，不遮盖中央标题或触发横向滚动。
- [ ] 用现有 `--ink-soft`、`--c-ex`、`--c-date` 等 token 校准明暗文字，必要时增强局部护字层；不整页加深遮罩。导航目标 14px、信息性小字目标 12px。
- [ ] 保留统计与每日一句的原有形状；收敛过重阴影、模糊和边框。装饰文字与必要文字区分验收，不为装饰英文强行扩大导航。
- [ ] 对照同尺寸 before/after 首页截图：确认满幅画作、中轴和两侧题签仍为主视觉；1280×720 下向下浏览入口不与每日一句叠压。
- [ ] 用以下命令验证 JS 交互没有受 CSS 波及，再提交这一批。

```powershell
npm test -- tests/site-nav.test.tsx tests/background-stage.test.tsx tests/scroll-fx.test.tsx
npm run typecheck
git diff --check
```

## Task 3：纸面、卡片、照片与各页题头

**Files:** Modify 三个既有 CSS 文件内的相关声明；Read `components/PageIntro.tsx`, `components/PostList.tsx`, `app/album/page.tsx`, `components/TimelineReveal.tsx`, `app/moments/page.tsx`, `app/guestbook/page.tsx`, `app/account/page.tsx`。

**接口：** 保持 PageIntro props、列表分页、相册筛选与灯箱选择器不变。

- [ ] 文章卡片保留编号和书目构图，统一标题/摘要/日期间距。标题自然换行，摘要允许截断，日期不覆盖正文；调整现有边线与阴影，避免再套一层纸框。
- [ ] 沿用照片三联排布与现有断点，统一相纸边框、照片下方说明间距；单张照片不放大占满整行。检查横图、竖图、无标题照片及图片加载失败状态。
- [ ] 对齐 PageIntro 与其下内容区的左右边缘，统一上/下留白；对时间轴日期、节点、续卷入口补足明暗对比，保留交错结构。
- [ ] 留言、账户、登录页只调整现有表单纸色、输入框边框、按钮和 focus-visible。保留错误信息、重试入口、提交禁用状态和用户未提交内容。
- [ ] 逐页检查首页卡片、相册、时间轴与表单在 390px 的实际布局，再执行相关回归检查。

```powershell
npm test -- tests/public-forms.test.tsx tests/reading-ui.test.tsx tests/search-palette.test.tsx
npm run typecheck
git diff --check
```

## Task 4：正文排版与目录

**Files:** Modify 现有 CSS 文件中的 `.md-body`、`.article-header`、`.article-excerpt`、`.reading-companion` 规则；Read `components/MarkdownView.tsx`, `components/ReadingCompanion.tsx`, `app/posts/[slug]/page.tsx`。

**接口：** 保留 Markdown 渲染、h2/h3 锚点、目录轨道、阅读进度与表格滚动区域。后台预览也使用 MarkdownView，需同步检查。

- [ ] 正文采用桌面 18px、手机 17px，行高 1.9–2。沿用宋体，不替换成另一套视觉字体；按现有内边距校准正文长度约 38 个中文字符，保持正文居中。
- [ ] 段落间距起点 1.25em；h2 上边距 2em、下边距 .75em；h3 上边距 1.6em。只更改目标规则中的属性，继承原颜色和装饰。
- [ ] 校准引用左线与纸面、列表缩进、代码块内边距；长 URL 可换行，代码与表格在局部滚动，不隐藏或截掉必要文本。
- [ ] 目录锚点落点预留导航高度；保留原桌面独立轨道，窄屏不挤压正文。检查无标题文章、重复标题、长标题、长表格及图片。
- [ ] 查看后台编辑预览、关于页等共享 MarkdownView 的页面，防止宽度和段落规则错误外溢。

```powershell
npm test -- tests/reading-ui.test.tsx tests/article-preview.test.tsx
npm run typecheck
git diff --check
```

## Task 5：校准已有动效，按测量优化背景

**Files:** Modify `components/ScrollFX.tsx` 及对应 CSS；按性能证据选择 Modify `components/QianliAmbient.tsx`, `components/StarryNight.tsx`；Read `components/MapleLeaves.tsx`, `components/useAmbientMotion.ts`, `lib/motion-policy.ts`。

**接口：** `ScrollFX` 保持无 props；背景组件保持 `{ active?: boolean }`；保留 Observer、RAF、计时器与动画的清理机制。

- [ ] 将已有分组延迟改为 `Math.min(idx, 3) * 70` ms；对应内容 transition 使用 450–650ms。调整清理计时器覆盖真实结束时间，不能只缩短 CSS 而留下旧延迟。
- [ ] hover 浮起仅对 fine pointer 启用，2–3px、180–240ms；恢复普通状态后无粘滞延迟。检查既有倾斜与 transform，避免覆盖。
- [ ] 保留当前首屏标题、背景氛围与主题切换动效。主题首次绘制沿用 `app/layout.tsx` 启动脚本，不通过增加整页过渡制造闪色。
- [ ] 用同一浏览器、尺寸和背景状态采集优化前后各 15 秒 Performance 记录。仅当背景绘制为显著热点时缓存重复渐变；否则标记无需改动，不引入自适应质量子系统。
- [ ] 如缓存云雾：纹理中保留当前径向渐变与椭圆裁切的关系，按原完整绘制区域等比绘制，再恢复 context 的 alpha/composite 状态。禁止直接把径向圆形纹理纵向缩放为椭圆，这会改变原渐变外观。不要重复实现 MapleLeaves 已有缓存。
- [ ] 开启 reduced-motion、save-data、后台标签，确认环境动画停止、内容可见；恢复前台不累积 RAF。快速切换主题、切换路由和返回页面时无残留 transform 或不可见文字。

```powershell
npm test -- tests/motion-policy.test.ts tests/background-stage.test.tsx tests/scroll-fx.test.tsx
npm run typecheck
git diff --check
```

纯视觉变化以浏览器对照验收，不编写镜像 CSS 实现的测试。如更改动画调度逻辑，在既有 motion 测试中先补“禁用后无后续 RAF/计时器、再次启用只启动一组”的行为回归，再实现并运行测试。

## Task 6：全站验收、提交与自动部署

**Files:** Update `docs/qa/2026-09-original-design-polish.md`；仅修复本轮产生或阻碍本轮验收的相关问题。

- [ ] 补齐 768×1024、360×800 和所有公开页 390×844 明暗布局；桌面首屏与长文补齐 1440×900、1280×720。用同一份内容对照改前/改后截图。
- [ ] 每个页面在最终 CSS 生效后测量实际宽度，不能只看 CSS 或截图猜测。浏览器页面上下文可使用：

```javascript
({
  viewport: window.innerWidth,
  body: document.body.scrollWidth,
  root: document.documentElement.scrollWidth,
  fits: document.body.scrollWidth <= window.innerWidth &&
    document.documentElement.scrollWidth <= window.innerWidth
})
```

- [ ] 核对菜单和灯箱的 Tab/Escape/焦点返回、搜索快捷键、文章目录、主题持久化、简繁切换。表单验证用本地 mock 或测试环境，避免往生产发布验收内容。
- [ ] 运行最终检查；通过后更新 QA 记录，写清通过项和未验证项，不能把网络失败说成线上故障。

```powershell
npm test
npm run typecheck
npm run build
git diff --check
git diff --stat
```

- [ ] 每个完整批次只 stage 明确修改文件并提交；开发分支用 `git push -u origin codex/original-design-polish` 同步。用户已授权 push，无须再询问。
- [ ] 最终验证后检查远端 main 是否前进。若保持祖先关系，按正常 fast-forward 集成；若发生并行改动，先合并解决冲突并重验。遵守仓库分支保护；不 force push，不夹带工作区其他改动。
- [ ] 确认发布分支并 push 生产分支；若 main 为生产分支，使用正常 `git push origin main`。遇到分支保护按现有 PR 流程推进，不绕过保护。
- [ ] 核对远端提交 SHA，再检查可访问的 Vercel 构建结果与公开首页/文章/相册。只有实际部署完成后才能报告上线成功；无法读取部署状态时明确报告“已 push，部署未确认”。

## 交付说明

这份计划替代本轮三种风格提案，保留 8 月 30 日旧文档作为既有工作，不自动执行旧文档任务。后续开发应提交原页前后截图与简短结果说明；若一个改动明显改变原构图，应撤回该改动并采用局部精修方案。
