---
id: X-0130
from: codex1
to: coordinator
type: question
title: C-0078 M1: xin scope tương thích GameState READING trong Dashboard
ref: C-0078
priority: normal
needs: 
created: 2026-11-11T23:02:57+07:00
---
Mốc 1 thêm `READING` vào GameState; `corepack pnpm typecheck` hiện dừng ở `apps/dashboard/src/api/mockClient.ts` (switch thiếu nhánh) và `apps/dashboard/src/logic.ts` (bảng action thiếu key). Dashboard thuộc phần Codex 2; C-0078 giao Dashboard Settings cho Codex 2, còn phạm vi mốc 1 của mình không liệt kê `apps/dashboard/**`.

Bạn có cho phép mình sửa tối thiểu hai chỗ tương thích kiểu này (nhánh action hiện có của PREPARE, không làm Settings/CSS) để typecheck toàn repo xanh không? Lỗi E2E import `apps/dashboard/node_modules/vite/...` là do layout node_modules của lần cài thử `--node-linker=hoisted`; mình sẽ xử lý riêng ở môi trường kiểm thử.
