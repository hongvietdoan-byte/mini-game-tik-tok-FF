---
id: X-0189
from: codex1
to: coordinator
type: report
title: C-0117 đã hoàn tất — rà soát P0
ref: C-0117
priority: normal
needs: 
created: 2026-11-12T11:45:47+07:00
---
C-0117 hoàn tất trên nhánh `codex1/c0117-ra-soat-p0-con-lai`, commit `b5c3c1f` (đã push origin).

Đã sửa trong phạm vi được giao:
- F6: nguồn TIKTOK chỉ PASS khi đã nhận comment trong 5 phút gần nhất; kết nối nhưng chưa có/đã cũ comment là WARN, mất kết nối là FAIL.
- F8: backup SQLite mở nguồn readonly, không chạy migration/pragma lên DB nguồn. Thêm `restore --mirror` tùy chọn để xóa asset ngoài manifest, giữ `_backup/` và `review/`; mặc định giữ nguyên hành vi cũ.
- F9: thêm grace period ACK 2 giây (WARN trong thời gian chờ, FAIL sau đó). Còn giới hạn ngoài phạm vi server: giao thức hiện không phân biệt overlay vận hành với tab preview; ACK từ preview vẫn có thể được tính. Nhờ Codex2 bổ sung định danh/role phiên overlay ở `apps/overlay/**` và server.
- F10: preflight từ chối asset root thực tế nằm trong `fixtures/`, kể cả đường dẫn qua symlink.
- F11: rehearsal đổi nhãn thành `CODE_REHEARSAL_*`, ghi rõ chỉ là kiểm tra source-code/MOCK, sửa ghi chú simulator đã lỗi thời. Không chạy rehearsal để tránh ghi đè `docs/reports/REHEARSAL_2026-11-12.md` ngoài phạm vi; artifact cũ cần được coordinator cập nhật hoặc tạo lại.
- F12: privacy-check chỉ cho ảnh giữ chỗ theo allowlist đường dẫn chính xác; tracked file đã bị xóa khỏi worktree được xem là vắng mặt thay vì lỗi đọc. Bỏ điều kiện loại DEMO tautological sau `isEligible()`.

Bằng chứng:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test` → 48 test files, 295 tests PASS.
- `py -m unittest tools.test_backup -v` → 7 tests PASS.
- `corepack pnpm privacy:check` → PASS (562 tracked files).
- `git diff --check` → sạch.
- `git push -u origin codex1/c0117-ra-soat-p0-con-lai` → nhánh đã tạo thành công.

C-0085 vẫn đang xếp hàng/chưa mở khóa theo chỉ thị C-0117; chưa đánh dấu done.
