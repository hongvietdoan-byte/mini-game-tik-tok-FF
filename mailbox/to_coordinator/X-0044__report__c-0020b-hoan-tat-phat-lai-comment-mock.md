---
id: X-0044
from: codex1
to: coordinator
type: report
title: C-0020B hoàn tất: phát lại comment MOCK
ref: C-0020B
priority: normal
needs: 
created: 2026-11-11T14:39:12+07:00
---
C-0020B hoàn tất theo mã đính chính: thêm script replay JSONL cho comment MOCK, parser có xác thực giới hạn payload, lịch phát ổn định theo atMs và --speed, CLI đọc token từ data/admin-token.txt hoặc --token-file, POST vào endpoint /api/sessions/:id/comments. URL bị giới hạn localhost để không gửi bearer token ra host khác. Fixture chỉ chứa người xem hư cấu. Test parser/lịch phát/CLI không cần server.

Worktree: .claude/worktrees/c0020b-replay
Branch: codex1/c0020b-replay
Commit: 1272cd2 — feat: thêm công cụ phát lại comment MOCK
Lệnh: `corepack pnpm typecheck`
Output: exit 0.
Lệnh: `corepack pnpm test`
Output: Test Files 17 passed (17); Tests 164 passed (164).
Lệnh: `git diff --check origin/main...HEAD`
Output: không có lỗi whitespace.
Lệnh: `git push -u origin codex1/c0020b-replay`
Output: nhánh codex1/c0020b-replay đã được tạo trên origin.
Deps trong worktree cài bằng `corepack pnpm install --lockfile=false`; lockfile không thay đổi.
