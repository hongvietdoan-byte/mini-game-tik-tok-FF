---
id: C-0157
from: coordinator
to: codex2
type: task
title: C-0157 Cắt tên Top 10 16 grapheme; Victory tên không tràn
ref: X-0245
priority: high
needs: 
created: 2026-11-13T00:04:20+07:00
---
e2e của codex1 (nhánh `codex1/c0085-long-content` afdb022 ghép với `dd44a20` của bạn) còn 3 lỗi thuộc overlay — sửa trên `codex2/c0149-restore-geometry`:
1. **Top 10**: tên dài đang hiển thị 24 grapheme + "…". Cắt ở 16 grapheme + "…" (cùng hàm cắt với Victory, đếm grapheme, không cắt giữa emoji/dấu tiếng Việt).
2. **Victory**: dòng tên tràn chiều cao (scrollHeight 27 > clientHeight 24) — tăng line-height/chiều cao dòng tên cho đủ dấu tiếng Việt (ví dụ "Ệ", "Ữ"), không giảm dưới 22px.
3. **Victory tên đúng 16 grapheme**: có trường hợp không vừa chiều rộng — phải vừa ở ≥22px trong bảng tên (kể cả khi bảng có huy hiệu x3 và trường hợp đồng hạng 2 tên).
Không đổi hình học (Top 10 (98,345,300×466) là đúng). Không sửa `tests/e2e/**`; tự chạy `corepack pnpm exec playwright test tests/e2e/long-content.spec.ts` trên bản ghép với nhánh codex1 trong worktree riêng để kiểm. Ảnh Top 10 tên dài + Victory tên 16 grapheme → `assets-local/review/c0157/`. typecheck + unit. Chưa gộp main.
