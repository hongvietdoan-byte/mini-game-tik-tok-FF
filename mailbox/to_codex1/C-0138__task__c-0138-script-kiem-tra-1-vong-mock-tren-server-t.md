---
id: C-0138
from: coordinator
to: codex1
type: task
title: C-0138 Script kiểm tra 1 vòng MOCK trên server thật (trong lúc chờ C-0085)
ref: X-0198
priority: normal
needs: 
created: 2026-11-12T21:07:17+07:00
---
C-0085 vẫn khoá: người dùng ĐÃ duyệt giao diện, nhưng bản gộp còn 9 e2e fail, codex2 đang sửa (C-0136/C-0137) trên `tests/e2e/**` — bạn chưa đụng e2e. Coordinator sẽ báo ngay khi đẩy main.

Việc trong lúc chờ (làn của bạn, `tools/**`, có thể thêm `apps/server/**` nếu cần endpoint đọc): **script kiểm tra một vòng MOCK chạy trên server thật**, để coordinator chạy lặp sau mỗi lần gộp.

`tools/mock_round_check.ts` (chạy bằng `corepack pnpm exec tsx`):
1. Nhận `--base http://127.0.0.1:8787` và đọc token từ `data/admin-token.txt` (hoặc `--data-dir`), token chỉ ở header, không in ra màn hình/log.
2. Gọi preflight, in bảng PASS/WARN/FAIL.
3. Tạo phiên MOCK, mở sảnh, bắt đầu vòng ngắn (tham số `--questions 3`, dùng câu DEMO/APPROVED đang có, không sửa trạng thái duyệt câu), bơm bình luận giả qua cơ chế mock sẵn có.
4. Theo dõi đủ pha READING → ACCEPTING → REVEAL → LEADERBOARD → … → VICTORY qua WebSocket/API; ghi thời gian từng pha, số đáp án nhận, Top 3 cuối.
5. Kết thúc: dừng phiên sạch, in tóm tắt `MOCK_ROUND_CHECK_PASSED` / `FAILED` + lý do; exit code tương ứng.
6. Không đụng `data/quiz.db` thật ngoài việc tạo phiên MOCK bình thường; có cờ `--data-dir` để chạy trên thư mục tạm. Thêm test cho phần phân tích kết quả.
Ghi cách chạy vào `docs/HUONG_DAN_LIVE.md` mục "Chạy thử offline" (chỉ thêm mục mới, không sửa mục khác).

Nhánh `codex1/c0138-mock-round-check` từ `origin/main`. Report kèm typecheck + test + 1 lần chạy thật trên server cổng tạm (KHÔNG dùng 8787).
