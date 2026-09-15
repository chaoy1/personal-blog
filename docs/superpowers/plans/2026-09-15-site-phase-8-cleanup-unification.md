# Phase 8 清理与统一实施计划

**状态：** 已完成并验证于 2026-09-15。规格：`docs/superpowers/specs/2026-09-15-site-phase-8-cleanup-unification-design.md`。

## 任务

- [x] 先补充清理合同测试，证明留言焦点选择器只保留单一实现并保护兼容 facade。
- [x] 删除已确认被后置规则完全覆盖的前置焦点实现，修正最终焦点环。
- [x] 新增 Phase 8 维护验收文档，记录 CSS 归属、保留的兼容层和删除边界。
- [x] 运行目标测试、全量测试、类型检查、应用路由构建和差异检查。
- [x] 只暂存 Phase 8 文件，提交并推送到 `origin/main`，校验远端 SHA 与 ahead/behind。

## 验证记录

- 目标测试：5/5 通过（Phase 7/8 合同）。
- 清理前目标测试按预期失败：重复焦点选择器 2 个；清理后通过。
- 全量测试：65 个测试文件、284 个测试通过。
- `npm run typecheck`：通过。
- `npm exec -- next build --experimental-app-only` 与 `npm run build`：均通过。
- `git diff --check`：通过。
