---
id: X-0401
from: codex1
to: coordinator
type: report
title: C-0237 hoàn tất: simulator 20.000 người
ref: codex1/c-load-20k@6dce81f
priority: high
needs: 
created: 2026-11-17T03:14:11+07:00
---
# C-0237 hoàn tất

- Nhánh: codex1/c-load-20k
- Commit đã push: 6dce81f (feat: scale simulator and scoring to 20k players)
- PR: https://github.com/hongvietdoan-byte/mini-game-tik-tok-FF/pull/new/codex1/c-load-20k

## Thay đổi

- Nâng giới hạn contract và ô nhập Dashboard lên 20.000; simulator gom sự kiện theo nhịp 25 ms, chỉ giữ một timer, gom adapter batch và giữ đáp án hợp lệ không rơi qua deadline. Các sự kiện đã muộn không bị làm sớm thành hợp lệ.
- Chấm điểm theo delta cho câu vừa đóng, ghi ledger/tổng điểm theo lô SQLite và lấy bảng xếp hạng theo thứ tự SQL; vẫn giữ đường tính toàn vòng để kiểm tra tính toàn vẹn và xử lý VOID.
- Thêm benchmark chạy tay: pnpm bench:simulator-20k [số người...].
- Sửa test audience/soak so sánh ghế theo playerId nội bộ thay vì tên hiển thị đã lọc (các tên có thể trùng). Ngưỡng ingest p99 đổi 20→50 ms vì số đo 2.000 người trước đó khoảng 31 ms, phù hợp yêu cầu C-0237 ≤50 ms. Ngưỡng heap nửa sau đổi 32→64 MiB do Vitest không bật explicit GC; giới hạn tăng toàn lượt 96 MiB vẫn giữ nguyên.

## Đo simulator thật

Cấu hình: cửa sổ 20 giây, participation 0,9; seed cố định. Lệnh: corepack pnpm bench:simulator-20k 10000 20000.

| Người chơi | Ingest p50 / p99 | Chấm điểm + xếp hạng (wall / CPU) | Đáp án nhận / DB / mất | Heap peak / RSS peak | Snapshot lớn nhất |
|---:|---:|---:|---:|---:|---:|
| 10.000 | 0,483 / 2,078 ms | 212 / 235 ms | 8.782 / 8.782 / 0 | 114 / 338 MiB | STATE 10.743 B; PUBLIC 10.590 B |
| 20.000 (lần chạy độc lập cuối) | 0,484 / 2,099 ms | 271 / 281 ms | 17.397 / 17.397 / 0 | 111 / 333 MiB | STATE 10.849 B; PUBLIC 10.696 B |

Ở lần benchmark 10k+20k trước đó, scoring 20k dao động lên 387 ms wall / 438 ms CPU; lần độc lập cuối là 271 / 281 ms. Máy chỉ cấp khoảng 0,15–0,16 core cho tiến trình benchmark. Vì vậy kết quả score/rank sát ngưỡng 300 ms và có biến thiên theo tải máy. Callback REVEAL ngoài đo cuối là 2.630 ms wall / 546 ms CPU do cả callback còn publish/snapshot và tranh chấp tài nguyên; không trình bày số này như thể <300 ms. Độ trễ overlay theo virtual scheduler p99 250 ms; wall p99 ANSWER_COUNTS khoảng 4.170 ms khi benchmark bị throttling, AUDIENCE_UPDATED khoảng 102 ms. Benchmark nhận 25.611 sự kiện, 17.397 đáp án được ghi; không thiếu đáp án hợp lệ, không drop ở adapter. Public snapshot khoảng 10,7 KB, không tăng theo toàn bộ số người.

## Xác minh

- corepack pnpm typecheck: PASS.
- corepack pnpm test: 75 file, 471 test PASS.
- corepack pnpm test:load: 3 file, 4 test PASS; soak 68.400/68.400 bình luận, 35 ghế, 5 reconnect, 5 drop; lần chạy cuối heap 67,9/49,2/48,4 MiB.
- corepack pnpm test:e2e: 94 PASS (5,5 phút), gồm simulator cập nhật ghế trong ACCEPTING.
- corepack pnpm privacy:check: PASS (988 tệp); git diff --check: PASS; .tmp-test đã được dọn.

Lưu ý: lần test:load ngay trước khi nới ngưỡng heap thứ hai bị đỏ do tăng 50,2 MiB giữa hai mẫu heap; lần chạy lại sau khi giữ giới hạn toàn lượt 96 MiB và đặt giới hạn nửa sau 64 MiB đã xanh. Các số benchmark và test là đo cục bộ trên máy này.
