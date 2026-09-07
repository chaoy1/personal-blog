# 原有设计精修 QA 记录

日期：2026-09-07

分支：`codex/original-design-polish`

基线：`origin/main` @ `2f973b7`

## 视觉基准与边界

- 原貌以 `public/bg/qianli-bridge.jpg`、居中题字、朱印、两侧题签、枫叶及昼夜背景为唯一视觉基准。
- 不恢复开场卷轴，不引入季节主题、按时段主题、路由离场、背景视差、数字滚动或自动隐藏导航。
- 本地生产构建使用项目内置 fallback 文章完成版式验收；本地 Supabase 请求不可用时仅记录为环境限制，不视为线上数据库故障，也不向生产库写入演示内容。
- 浏览器：Codex in-app browser。主题初始化为 light，暗色主题另行逐页复核。

## 基线验证

| 检查 | 结果 |
|---|---|
| `npm test` | 22 个文件、101 项测试通过 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；生成 34 个路由页面 |
| 构建提示 | worktree 与仓库根目录各有 lockfile，Next.js 给出根目录推断警告；未影响编译 |

## 截图索引

基线截图在本次 Codex 浏览器验收中按以下条件采集；完成后使用相同路径、主题、视口和等待时间复拍对照。

| 编号 | 页面 | 视口 | 主题 | 内容 | 基线观察 |
|---|---|---:|---|---|---|
| B-HOME-1440-L | `/` | 1440×900 | light | fallback 统计与每日一句 | 动效结束后中轴完整；下滑入口下缘约 916px，略超首屏 |
| B-HOME-1280-L | `/` | 1280×720 | light | fallback 统计与每日一句 | 题签、统计和每日一句未重叠；下滑入口完整可见 |
| B-HOME-390-L | `/` | 390×844 | light | fallback 统计与每日一句 | 无横向溢出；题签按既有断点隐藏；统计与每日一句完整 |
| B-POSTS-390-L | `/posts` | 390×844 | light | 3 篇 fallback 文章 | 书目结构清晰；标题、编号栏与摘要仍可收紧节奏 |
| B-ARTICLE-390-L | `/posts/hello-world` | 390×844 | light | fallback 长文 | 无横向溢出；标题占屏偏重，正文纸面左右留白可校准 |

补充页面基线：`/album`、`/moments`、`/timeline`、`/guestbook`、`/about`、`/login`、`/account`、`/admin/login` 已在 390×844 检查。空数据页仅用于纸面与空状态检查；账户路由在未登录状态按预期回到登录页。

## 390px 宽度基线

所有下列页面均满足 `document.body.scrollWidth <= window.innerWidth` 且 `document.documentElement.scrollWidth <= window.innerWidth`：

- `/`、`/posts`、`/posts/hello-world`
- `/album`、`/moments`、`/timeline`
- `/guestbook`、`/about`、`/login`、`/account`
- `/admin/login`

## 样式归属

CSS 加载顺序保持 `globals.css` → `refinement.css` → `studio.css`。

| 选择器 | 基础定义 | 最终生效/本轮修改位置 |
|---|---|---|
| `.home-hero`, `.masthead`, `.hero-stats`, `.daily-quote` | `app/globals.css` | `app/globals.css` 的首页首屏与高度断点规则 |
| `.verse`, `.sigil` | `app/globals.css` | `app/studio.css` 的统一题签尺寸；背景与定位仍来自 globals |
| `.page-intro` | 三个 CSS 文件均有历史声明 | `app/studio.css` 末段开放式题头及内容纸面连接规则 |
| `.home-post-card`, `.archive-post-card` | 三个 CSS 文件均有历史声明 | `app/studio.css` 的公开页卡片规则及“只保留上下呼吸”覆盖 |
| `.md-body`, `.article-header`, `.article-excerpt` | `app/globals.css` | `app/globals.css` 的 article-reading-shell 与小屏断点规则 |
| `.reading-companion` | `app/globals.css` | `app/globals.css` 的阅读轨道规则；1460px 以下由 studio 隐藏 rail |
| `.album-grid`, `.album-item` | `app/globals.css` 与 refinement | `app/globals.css` 后段相纸规则，三列结构由 refinement 保持 |
| `.timeline`, `.tl-*` | `app/globals.css` 与 refinement | `app/globals.css` 后段馆藏标签规则；照片类型色由 refinement 覆盖 |

## 动效与渲染抽样

- ScrollFX 同组延迟收敛为 `0 / 70 / 140 / 210ms`，长列表不再继续累加等待；延迟在实际 `650ms + delay` 结束后清理，并切换到 `220ms` 悬浮反馈。
- 位移反馈仅在 `(any-hover: hover) and (any-pointer: fine)` 下启用，卡片抬升控制在 `2–3px`；触屏 hover 状态不再改变卡片位置。
- reduced-motion、Save-Data、隐藏标签页的静态回退由 motion-policy、ScrollFX、BackgroundStage 测试覆盖。
- Codex in-app browser 不暴露 DevTools Performance、`requestAnimationFrame` 或 PerformanceObserver。本轮在同一 1440×900 浏览器标签页中改用连续截图响应作为 15 秒代理抽样：light 30 次，平均 195.1ms、P95 218ms；dark 30 次，平均 175.4ms、P95 200ms。两种主题均持续响应，无卡死或明显主题差异；该数据不是 FPS 指标，因此未据此改写 Canvas 渐变绘制。

## 待完成检查

- [x] 首页、题签和小字精修后的同尺寸对照
- [x] 列表、相册、时间轴、表单纸面精修后的逐页检查
- [x] 正文排版与目录桌面/移动端检查
- [x] ScrollFX 延迟、结束清理与 reduced-motion 行为检查
- [ ] 1440×900、1280×720、768×1024、390×844、360×800 明暗主题终验
- [ ] 菜单、搜索、灯箱、目录、主题、简繁和表单 focus-visible 终验
- [ ] 最终测试、typecheck、build、diff-check 与远端/部署状态
