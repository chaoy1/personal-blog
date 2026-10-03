# 2026-10-03 历史修改残留清理

按用户要求清理旧试验稿和临时材料，生产页面组件、业务代码、CSS、图片及字体保持原样。

## 仓库清理

- 删除五份早期手绘背景备选稿 `a-ink-tide`、`b-blue-scroll`、`c-wind-bamboo`、`d-rain-ripple`、`e-night-feast`。
- 删除未被源码、测试或说明引用的 `about-color-harmony.html`、`daily-quote-pen-weights.html`、`daily-quote-shuffle.html`。
- 同步移除预览目录里的五个旧入口，保留昼夜江山和关于页动效入口。
- 保留正式 CSS、文档或测试引用的设计源文件及截图；保留 SEO 历史核验报告。

## 本地清理

- 删除未被运行进程使用的 18 个旧 Chrome profile。
- 删除重构核验的临时基线源码副本及 tar 归档、32 个首次失败采集文件、3 个失效 PID 文件。最终前后截图、比较结果和审计材料继续保留。
- 删除五份未跟踪每日一句试验 HTML、两组圆环试验目录、文章目录富样式备选稿及 `public/guestbook-color-study.html`。
- 合计清理 72 个目标、9,116 个文件，约 2,084 MiB；明细保存在本地 `.design/code-refactor/cleanup-residue.json`。

删除前核对绝对路径均在项目目录内，检查进程命令行和目录重解析点。临时基线中的 `node_modules` junction 先解除链接，保留项目实际依赖目录。没有结束任何浏览器进程。

## 保留的工作区内容

原有 `package.json` 的 CDP 命令、未跟踪 `AGENTS.md` 和 `scripts/chrome-cdp.cjs` 继续保留；`effect-preview/posts-xuan-collection.html` 被正式文章目录 CSS 和设计规范引用，继续保留。

## 验证

- `npm run typecheck` 通过，退出码 0。
- `npm test -- --reporter=dot` 通过：76 个测试文件、423 项测试。
- `npm run build` 通过，退出码 0，生成 38 个页面。
- 72 个清理目标均已不存在；预览目录入口及正式 CSS 中 11 个明确的设计源文件引用均有效。
- `git diff --name-only HEAD -- app components lib public tests package-lock.json next.config.mjs tsconfig.json` 无输出，正式显示效果对应的源码和资源未改动。
