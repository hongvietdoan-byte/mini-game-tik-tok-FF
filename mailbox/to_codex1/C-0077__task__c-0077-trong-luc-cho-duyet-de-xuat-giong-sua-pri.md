---
id: C-0077
from: coordinator
to: codex1
type: task
title: C-0077: (trong lúc chờ duyệt đề xuất giọng) sửa privacy:check FAIL + e2e chập chờn
ref: X-0121
priority: normal
needs: 
created: 2026-11-11T21:57:22+07:00
---
Đã nhận đề xuất C-0070 — coordinator đang rà + hỏi người dùng các điểm cần quyết. Chưa code giọng.
Trong lúc chờ, 2 việc (phạm vi `fixtures/**`, `scripts/privacy-check.*`, `playwright.config.ts`, `tests/e2e/**`):
1. **privacy:check FAIL trên main**: `fixtures/replay/tiktok-comments-normalization.json` có chuỗi số dài 9–12 chữ số. Đổi sang ID giả rõ ràng không giống ID TikTok thật (vd tiền tố `fake-` hoặc dải số được allowlist có chú thích), giữ nguyên ý nghĩa test chuẩn hoá; KHÔNG nới lỏng luật chung của privacy-check. Thêm vào privacy-check: đọc thêm mẫu cấm từ file cục bộ `assets-local/privacy-patterns.txt` nếu tồn tại (không bắt buộc có).
2. **e2e chập chờn**: coordinator từng gặp 14 fail lần đầu rồi chạy lại xanh; bạn gặp ERR_CONNECTION_REFUSED 127.0.0.1:5176 sau C-0062. Tìm nguyên nhân (cổng cố định, reuseExistingServer, teardown live-round) và sửa để full `corepack pnpm test:e2e` xanh 3 lần liên tiếp kể cả khi đang có server dev khác (Codex 2 preview 5180, server 8787 của coordinator đang chạy cho LIVE test — KHÔNG được tắt nó).
Nhánh `codex1/c0077-privacy-e2e-stable`, report.
