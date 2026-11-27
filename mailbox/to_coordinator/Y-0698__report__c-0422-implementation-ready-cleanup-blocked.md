---
id: Y-0698
from: codex2
to: coordinator
type: report
title: C-0422 implementation ready; cleanup blocked
ref: C-0422
priority: high
needs: 
created: 2026-11-28T03:41:14+07:00
---
C-0422 — implementation và kiểm thử đã xong; nhánh đã push, còn mục dọn tệp tạm bị chặn bởi command review.

Nhánh: codex2/c-fast-start, HEAD 7e60ab45; đã merge origin/main 7461cdf2. PR: https://github.com/hongvietdoan-byte/mini-game-tik-tok-FF/pull/new/codex2/c-fast-start

Thay đổi chính:
- CHAY_GAME kiểm liên kết @quiz, ghi thời gian 5 giai đoạn; server dùng ESM bundle có hash source + hash artifact, SQLite external trỏ về entry package trong workspace, build lại khi source/artifact stale hoặc bundle thiếu/hỏng.
- Backup giữ DB nhất quán, manifest v2, quét assets bằng scandir và chia sẻ asset không đổi bằng hardlink snapshot-to-snapshot trên NTFS; filesystem khác hoặc hardlink lỗi thì copy thường. Backup chỉ lấy data/quiz.db và assets-local, không quét Edge profile/cache hay data/admin-token.txt.
- Cửa sổ chờ tối đa 1200 giây, báo mỗi 30 giây, báo lỗi ngay khi PID server chết; fallback TSX chạy được với đường dẫn checkout có khoảng trắng.
- File:line:
  - CHAY_GAME.cmd:45,57,71
  - apps/server/src/main.ts:7,15 (static fixture import và đường dẫn migrations cho bundle)
  - tools/backup.py:145,285
  - tools/check_workspace_links.py:14,53
  - tools/open-game-windows.ps1:15,347
  - tools/server_build.py:64,114,216
  - tools/start-game.ps1:28,42,63
  - tools/step_timer.py
  - tools/test_backup.py, tools/test_server_build.py, tools/test_workspace_links.py

Đo khởi động (bản sao trên E:, cổng 28790; baseline Y-0694 n=2, sau n=3):
| Bước / tổng | Trước ấm | Sau ấm | Trước gần lạnh | Sau gần lạnh |
|---|---:|---:|---:|---:|
| web ensure | 1.249 s | 1.3 s | 1.419 s | 1.4 s |
| backup (baseline đủ asset; lượt CHAY_GAME sau DB-only) | 23.114 s | 1.7 s | 90.990 s | 1.9 s |
| server từ sau backup tới /health 200 | 8.009 s | 1.5 s bundle ensure + 0.1 s health | 40.922 s | 1.5 s bundle ensure + 0.1 s health |
| helper mở cửa sổ sau health | 8.440 s | 6.1 s | 41.213 s | 6.2 s |
| CHAY_GAME tới health | 32.372 s | 5.9 s | 133.331 s | 6.4 s |
| CHAY_GAME tới cửa sổ mở | 40.812 s | 11.9 s | 174.544 s | 12.5 s |

Ghi chú phương pháp: baseline Y-0694 đọc 45.91/46.85 GiB để đẩy cache; ba lượt gần lạnh mới đọc 4 GiB trước mỗi lần. Lượng đọc khác nhau nên số gần lạnh không có cùng độ cache. Số sau tới health vẫn dưới 60 giây; tỷ lệ số học so baseline là -81.8% warm và -95.2% near-cold, nhưng không coi đây là phép so trực tiếp cùng cache depth. Test backup tăng dần riêng trên bộ 1,210 tệp: lượt thứ hai 8.8 s, verify PASS; mirror restore SHA-256 byte-match 1,210/1,210. Bản sao chạy CHAY_GAME có DB nhưng không mang đủ assets, nên stage backup 1.7/1.9 s trong bảng không phải phép đo đủ asset.

Kiểm thử:
- Sau merge origin/main: corepack pnpm typecheck — PASS; corepack pnpm privacy:check — PASS (1,718 tệp); corepack pnpm exec vitest run --project unit --project integration --no-file-parallelism — 104 files, 688 passed, 0 failed.
- py -3 -m pytest tools/test_backup.py tools/test_server_build.py tools/test_workspace_links.py tools/test_web_build.py -q — 32 passed, 3 subtests passed.
- node --check apps/server/dist/main.js, server_build.py check, workspace-link check, PowerShell parser và git diff --check — PASS.
- Playwright asset thật: 176 passed, 0 failed; placeholder: 175 passed, 1 skipped (case cần asset thật), 0 failed. Các lượt MOCK trên bản sao tới VICTORY. Sau merge cuối, CHAY_GAME rebuild bundle do HEAD mới, /health PASS và Overlay xác minh 1080×1920; forced TSX fallback cũng /health PASS và xác minh cùng kích thước.
- Lệnh đo lại: trong bản sao ổ E đặt QUIZ_PORT khác 8787 rồi chạy CHAY_GAME.cmd; trước mỗi lượt gần lạnh đọc tệp không liên quan ≥4 GiB. Các lệnh test ở trên; E2E dùng corepack pnpm test:e2e.

Mục dọn tệp tạm còn chặn: command review từ chối Remove-Item cho cả tệp 4 GiB và các bản sao E:\temp dù các mục tiêu đã được liệt kê/xác minh đúng đường dẫn. Còn các mục do C-0422 tạo:
- E:\temp\c0422-fake-worktree
- E:\temp\codex2-c0422-baseline
- E:\temp\codex2-c0422-chain
- E:\temp\codex2-c0422-instrumentation-backup
- E:\temp\codex2-c0422-pw-placeholder
- E:\temp\codex2-c0422-pw-real
- E:\temp\codex2-c0422-pw-real2
- E:\temp\codex2-c0422-pw-rerun
- E:\temp\codex2-c0422-real
- E:\temp\c0422_cache_eviction.bin (4 GiB)
- E:\temp\c0422_restore_verify.py

Không có các mục này trong commit. Xin coordinator dọn các đường dẫn trên bằng kênh được phép; C-0422 chưa được đánh dấu done tới khi dọn xong.
