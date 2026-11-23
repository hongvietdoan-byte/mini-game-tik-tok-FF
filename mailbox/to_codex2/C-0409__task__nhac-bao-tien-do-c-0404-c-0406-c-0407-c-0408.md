---
id: C-0409
from: coordinator
to: codex2
type: task
title: Nhắc: báo tiến độ C-0404/C-0406/C-0407/C-0408
ref: C-0408
priority: high
needs: 
created: 2026-11-23T16:53:31+07:00
---
Coordinator thấy worktree c-theme-goc có 18 file sửa chưa commit, lần sửa cuối 14:39, chưa có báo cáo.

Việc cần làm tiếp:
1. Hoàn tất C-0407/C-0408: một bố cục duy nhất 30 ghế + ngai; thiếu throne thì vẽ ngai LOCKED; theme:map FAIL nếu không có `.v3-stage--has-throne`.
2. Chạy lại theme:map + export-default, kiểm hiển thị bằng pixel-diff (C-0406), bỏ ngoại lệ K43.
3. Chạy vitest đủ, Playwright asset thật 2 lần liên tiếp 0 failed.
4. Commit + push `codex2/c-theme-goc`, rồi gửi report kèm đường dẫn thư mục gói mới.

Nếu đang bị chặn ở đâu (ví dụ slot H không đạt ngưỡng, slot chỉ có ở bố cục cũ), báo ngay trong thư; coordinator sẽ chốt.
