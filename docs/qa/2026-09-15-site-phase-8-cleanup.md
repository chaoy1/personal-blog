# Phase 8 清理与统一验收记录

日期：2026-09-15

## 清理记录

| 文件 | 处理 | 依据 |
| --- | --- | --- |
| `app/guestbook/guestbook.css` | 删除前置的 `.guestbook-immersive-textarea:focus-visible` 重复实现，保留后置纸笺实现并统一为 2px 可见焦点环 | 同名选择器的前置规则被后置规则完全覆盖；清理合同测试要求源码只保留一个实现 |

## 明确保留

- `lib/app-store.tsx` 兼容 facade 继续保留，原因是迁移边界和 `tests/app-store-compatibility.test.ts` 仍明确保护它。
- `globals.css` 的 token/reset、`refinement.css` 的共享组件契约和页面 CSS 的局部配方没有被合并成无法追踪的单一文件。
- 旧变量和路由 DOM 契约继续保留，避免把“清理历史规则”扩大为行为迁移。

## 维护规则

今后删除 CSS 规则前，先确认选择器有后置最终所有者、没有独立声明依赖，并为删除结果增加源码合同或页面行为测试。页面专属样式继续留在对应路由 stylesheet，共享焦点环和触达尺寸继续由共享层与页面边界共同保护。

## 验证矩阵

- Phase 7/8 合同测试：通过。
- 全量测试：通过。
- `npm run typecheck`：通过。
- `npm exec -- next build --experimental-app-only`：通过。
- `npm run build`：通过，31 个静态页面/应用路由完成生产构建。
- `git diff --check`：通过。
