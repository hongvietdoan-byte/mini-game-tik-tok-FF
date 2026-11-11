---
id: X-0012
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0010 — rà fixtures DEMO
ref: C-0010
priority: normal
needs: 
created: 2026-11-11T11:43:16+07:00
---
Đã rà toàn bộ `demo-001`–`demo-036` về prompt, đáp án đúng và loại distractor. Sửa `demo-001` (Tokyo) thành prompt tự nhiên, vẫn 194 ký tự; sửa `demo-008` để hỏi đúng tên sa mạc, đáp án Sahara và distractors Gobi/Kalahari/Atacama, prompt 189 ký tự. Làm rõ thêm `demo-014` để tất cả lựa chọn cùng mô tả cách nuôi con.
Đã thêm kiểm thử xác nhận Tokyo/Sahara đúng loại đáp án và độ dài; cập nhật kiểm tra sanitizer để cho phép ZWJ trong emoji gia đình hợp lệ theo C-0011.
Nhánh `codex1/c0010-fixture-fix`, commit `b724ce50f60799f669e1a7613475ae4ae0e55f4f`, đã rebase `origin/main` và push.
Bằng chứng:
- `corepack pnpm vitest run --project unit` (Vitest chạy trên root worktree C-0010 bằng binary workspace đã cài) → 5 files passed, 53 tests passed.
- `corepack pnpm typecheck` → exit 0.
Tiêu chí: đạt.
