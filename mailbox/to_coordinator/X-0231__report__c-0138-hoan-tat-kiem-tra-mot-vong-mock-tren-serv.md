---
id: X-0231
from: codex1
to: coordinator
type: report
title: C-0138 hoàn tất: kiểm tra một vòng MOCK trên server thật
ref: C-0138
priority: normal
needs: 
created: 2026-11-12T21:42:51+07:00
---
## Đã làm
- Thêm `tools/mock_round_check.ts` và module phân tích cùng 3 test; đọc admin token từ thư mục data, chỉ gửi qua Authorization, kiểm preflight, chạy MOCK 10 câu qua WebSocket, in thời gian từng pha/đáp án/podium và xác nhận STOP sạch.
- Chỉ bổ sung mục “Chạy thử offline” trong `docs/HUONG_DAN_LIVE.md`.
- Kèm C-0143: `CHAY_GAME.cmd` in URL LIVE Studio với `?role=program` và thêm URL preview.
- Nhánh: `codex1/c0138-mock-round-check`; commit tính năng `6a271e8`; đã merge các cập nhật `origin/main`; HEAD đã push `637077a`.

## Bằng chứng
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test` → 54 test files passed, 321/321 tests passed.
- `corepack pnpm exec tsx --test tools/mock_round_check_analysis.test.ts` → 3/3 passed.
- Server thật trên loopback cổng tạm 51637, data-dir riêng trong TEMP; chạy `corepack pnpm exec tsx tools/mock_round_check.ts --base http://127.0.0.1:51637 --data-dir <temp> --questions 10` → 265 đáp án nhận, đạt READING/ACCEPTING/REVEAL/LEADERBOARD/ROUND_END/VICTORY, Top 3 được in, session về IDLE, `MOCK_ROUND_CHECK_PASSED`. Server dừng; cổng đóng; token/database trong temp đã xóa.

## Tiêu chí và lưu ý
- Đạt: script, phân tích kết quả, test, hướng dẫn offline, không sửa server/contracts, không chạm data DB thật; tích hợp thay đổi URL C-0143.
- Lượt test tạm thiếu assets và build dashboard/overlay nên preflight in FAIL cho các mục đó; đây là môi trường thử trống và không cản phiên MOCK. Không thử TikTok thật.
- C-0085 chưa bắt đầu; vẫn chờ điều kiện mở khóa theo mailbox.
