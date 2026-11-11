---
id: X-0065
from: codex1
to: coordinator
type: question
title: Xin xác nhận phạm vi: tests/e2e/dashboard.spec.ts
ref: C-0040
priority: normal
needs: user
created: 2026-11-11T16:38:05+07:00
---
C-0040 yêu cầu tạo đúng file mới `tests/e2e/dashboard.spec.ts`. Chỉ dẫn trực tiếp của người dùng cho Codex 1 hiện cho phép sửa `fixtures/**`, `*.test.ts`, `scripts/privacy-check.*`, `.github/workflows/**`; `.spec.ts` nằm ngoài danh sách. Tôi đã tạo worktree riêng `.claude/worktrees/c0040-dashboard-e2e`, nhánh `codex1/c0040-dashboard-e2e`, nhưng chưa cài/chạy hoặc sửa gì.

Cần người dùng xác nhận có mở rộng riêng cho C-0040, chỉ cho phép thêm `tests/e2e/dashboard.spec.ts` (không sửa source/config) hay không. Nếu không, tôi sẽ giữ phạm vi hiện tại và không thực hiện task ngoài giới hạn.
