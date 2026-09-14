# Phase 1：站点设计系统基础 QA

日期：2026-09-14
范围：`2026-09-14-site-design-system-refactor-design.md` 的 Phase 1

## 自动化验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | 通过：30 个测试文件，163 个测试 |
| `npm run typecheck` | 通过，无 TypeScript 诊断 |
| `npm run build` | 通过，Next.js 生成 31/31 个页面 |
| `git diff --check` | 通过，无空白错误 |
| 设计系统契约测试 | 通过：语义 token、CSS 层归属、状态 token、PageIntro 变体、ArticleNav 命中区域 |

## 浏览器视觉与计算样式

通过本地 `http://localhost:3000` 逐页检查 `/posts`、`/about`、`/timeline`，覆盖明亮/暗色主题和目标视口：1440、1024、768、390、375、360px。

- 六组目标宽度的 `body.scrollWidth` 与 `documentElement.scrollWidth` 均等于 `window.innerWidth`，横向溢出为 0。
- 360px 暗色复测：ArticleNav 链接 `min-height: 44px`，页面横向溢出为 0；PageIntro 使用 `max-width: 100%`。
- 360px 明亮复测：`--color-primary: #b23a2b`、`--color-background: #f2edde`，ArticleNav 链接 `min-height: 44px`，横向溢出为 0。
- 1440px 明亮/暗色复测：页面导航、PageIntro、山水背景和原有书法构图均保持可见；未出现新的整块遮罩或布局断裂。
- PageIntro 默认渲染为 `page-intro--standard`；页面标题仍按现有页面配方展示，`display` 与 `compact` 变体已有组件级契约。

## 已知环境提示

构建静态生成阶段仍会输出 Supabase `fetch failed` / `EACCES` 警告，但命令最终以 exit code 0 完成；本阶段没有修改 Supabase schema、RLS、认证或上传流程。
