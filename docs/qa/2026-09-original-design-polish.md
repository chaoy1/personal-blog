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

## 最终响应式验收

| 视口 | 页面与主题 | 实测结果 |
|---|---|---|
| 390×844 | `/`、`/posts`、`/posts/hello-world`、`/album`、`/moments`、`/timeline`、`/guestbook`、`/about`、`/login`、`/account`、`/admin/login`；light / dark | 全部 `body/root scrollWidth <= innerWidth` |
| 360×800 | 首页、文章列表、长文；light / dark | 全部通过 |
| 768×1024 | 首页、文章列表、长文；light / dark | 初测首页右题签使 `body.scrollWidth=790`；将 721–900px 题签收回左右各 8px 后，复测 `body=root=758`，全部通过 |
| 1280×720 | 首页、长文；light / dark | 全部通过；向下入口未与每日一句叠压 |
| 1366×900 | 长文 | 目录轨道在安全宽度不足时隐藏；`body=root=1356`，无横向溢出 |
| 1400×900 | 长文 | 目录轨道恢复显示，右缘 1391px，完整落在 1400px 视口内 |
| 1440×900 | 首页、长文；light / dark | 全部通过；正文 700px、18px/1.95，目录轨道可见 |

## 交互与首屏一致性

| 检查 | 浏览器/测试证据 |
|---|---|
| 移动菜单 | 390px 展开后焦点进入首个“首页”链接；Tab 环路、Escape 与焦点返回由 `site-nav.test.tsx` 覆盖 |
| 搜索 | `Ctrl+K` 打开“寻迹”，输入框获得焦点；Escape 关闭后焦点回到触发按钮 |
| 文章目录 | “为什么要有自己的地方”锚点写入 URL；目标顶部 89px，高于 65px 导航 |
| 主题 | light/dark 切换后跨路由及刷新持久化；首次绘制由 head 脚本与根主题 CSS 负责 |
| 简繁 | `data-lang` 切至 `zh-Hant`，导航、文章标题及正文同步转换；可切回简体 |
| 表单焦点 | 暗色登录邮箱输入框获得键盘焦点时，朱色边框及 3px 外光可见 |
| 灯箱 | 本地无 Supabase 照片，未做真实图片点击；Enter/Space、Tab 环路、Escape、关闭按钮及焦点返回由 `reading-ui.test.tsx` 覆盖 |
| 表单提交 | 未向生产环境提交验收内容；验证、禁用态、失败重试和完成提示由 `public-forms.test.tsx` 覆盖 |

暗色持久化首次暴露了服务端 light 分支与客户端 dark 分支的 hydration mismatch。修复后服务端主题中立标记、客户端挂载后环境层切换，并以根主题 CSS 保持首帧色调；全新标签页的 light 首载和 dark 刷新均无浏览器 warning/error，回归测试同时覆盖 SSR 标记。

合并前代码审查另指出 1366px 目录轨道和桌面超长 URL 风险：目录显示断点已提高到安全边界，`.md-body a` 在所有视口使用 `overflow-wrap: anywhere`。审查提出的触屏 hover 宽度变化经层叠核对不成立：后置规则已将普通、偶数及 hover 卡片统一为 `width: 100%`，细指针媒体查询只恢复 2–3px 位移。

## 最终自动化门禁

| 检查 | 结果 |
|---|---|
| `npm test` | 22 个文件、104 项测试通过 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；34 个路由页面完成生成，shared First Load JS 103kB |
| `git diff --check` | 通过；仅有 Windows 工作树 LF→CRLF 提示，无空白错误 |
| 构建提示 | Next.js 因仓库根与隔离 worktree 各有 lockfile 继续提示根目录推断；未影响构建 |

## 待完成检查

- [x] 首页、题签和小字精修后的同尺寸对照
- [x] 列表、相册、时间轴、表单纸面精修后的逐页检查
- [x] 正文排版与目录桌面/移动端检查
- [x] ScrollFX 延迟、结束清理与 reduced-motion 行为检查
- [x] 1440×900、1280×720、768×1024、390×844、360×800 明暗主题终验
- [x] 菜单、搜索、灯箱、目录、主题、简繁和表单 focus-visible 终验
- [x] 最终测试、typecheck、build 与 diff-check
- [ ] 远端提交 SHA、生产分支与 Vercel 部署状态（最终 push 后填写）
