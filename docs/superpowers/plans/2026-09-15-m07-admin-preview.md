# M07 后台文章预览页实施计划

## 目标

让 `/admin/preview/[id]` 在保留公开文章排版的同时，明确标识后台预览身份；补齐加载、文章不存在、权限不明和数据错误状态，并让返回编辑/后台路径始终可达。

## 任务

- [x] 先补充预览测试：覆盖预览状态栏、已保存版本说明、返回编辑、找不到和加载失败状态。
- [x] 改造 `app/admin/preview/[id]/page.tsx` 与 `components/admin/ArticlePreview.tsx`：保留现有文章渲染，增加状态边界与预览身份语义，不复制 Markdown 渲染链路。
- [x] 新增 `app/admin/preview/[id]/loading.tsx`：提供稳定状态栏和正文骨架。
- [x] 在 `app/studio.css` 增加 M07 页面作用域样式：窄状态栏、P03 正文宽度、打印隐藏与 375px 响应式规则。
- [x] 运行目标测试、类型检查、全量测试和生产构建；记录既有 P02 posts 测试失败，不扩大范围修复。
- [ ] 只暂存 M07 文件，执行 diff/凭据检查，提交并推送到 `origin/main`，校验远端 SHA 与 ahead/behind。

### 验证记录

- 目标测试：4/4 通过。
- `npm run typecheck`：通过。
- 全量测试：64 个文件中 62 个通过，275/278 个测试通过；3 个失败均为现有未提交 P02 测试改动。
- `npm exec -- next build --experimental-app-only`：通过，包含 `/admin/preview/[id]` 动态路由。
- 标准 `npm run build`：Next 15.5.22 在本机 App Router-only 项目中固定报内部 `/_document` 产物缺失；未修改业务代码或构建配置。

## 验收

- 草稿、已发布、找不到和错误状态不会混淆，也不会泄露不存在或无权限文章正文。
- 正文继续复用 `ArticlePreview` / `MarkdownView`，标题、摘要、媒体和代码块宽度不被后台状态栏挤压。
- 返回编辑保留文章 ID；预览身份在屏幕上清晰可见，打印时可隐藏。
- 375px 和 dark theme 下状态栏、正文与宽内容不横向溢出。
