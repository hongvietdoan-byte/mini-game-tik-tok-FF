---
id: C-0289
from: coordinator
to: codex1
type: task
title: V5 Phase 5 (phần không phụ thuộc UI): bench 10k, cờ tắt danh hiệu, report, prune dry-run
ref: 
priority: normal
needs: 
created: 2026-11-18T20:47:44+07:00
---
C-0287, C-0288 (Phase 4a) và C-0271 đã vào main (a9134292). Việc kế của Codex 1: **V5 Phase 5 — phần đo tải, analytics, retention KHÔNG phụ thuộc giao diện**. Kế hoạch ghi Phase 5 làm sau Phase 3, nhưng phần dưới đây chỉ chạm `tools/`, `apps/server` (đọc DB), `packages/persistence` nên làm trước được. Nhánh mới từ origin/main.

Đọc `docs/V5_AUDIT_PLAN.md` §7 (Đo tải, Rollback) và `docs/specs/NHA_THONG_THAI_V5_SPEC.txt` các đoạn về retention/analytics/load test.

1. **Bench V5 đủ chu trình:** mở rộng simulator (`pnpm bench:simulator-20k` hiện có) thành lệnh `pnpm bench:v5` chạy 100 / 1.000 / 5.000 / 10.000 người, bình luận dồn cục, vòng 15 câu có Top 3 câu/chặng + evaluator danh hiệu. Ghi p50/p95/p99 thời gian tính chặng và danh hiệu, CPU, RAM, kích thước payload WebSocket mỗi loại sự kiện, độ tăng DB; xác nhận 0 đáp án mất và tổng điểm trước/sau V5 giống hệt trên cùng dữ liệu phát lại. Xuất báo cáo markdown/JSON vào thư mục bị ignore.
2. **Cờ tắt hiển thị danh hiệu khi LIVE** không cần build lại (cấu hình server/Dashboard API, mặc định BẬT): khi tắt, snapshot không gửi achievement xuống overlay; evaluator vẫn tính và lưu. Có test. KHÔNG làm giao diện Dashboard cho cờ này (để Codex 2), chỉ API + contracts.
3. **Báo cáo analytics chỉ đọc DB:** lệnh `pnpm report:session <roundId|latest>` dùng dữ liệu theo người chơi (không suy retention từ số đáp án mỗi câu): số người tham gia, trả lời ≥1/≥5/hết 15 câu, rơi rụng theo câu dựa trên player-level, người quay lại giữa các vòng/phiên. Mở DB read-only.
4. **Retention policy + dọn dữ liệu dry-run:** lệnh `pnpm data:prune --older-than <ngày> [--apply]`, mặc định dry-run in số dòng sẽ xoá mỗi bảng; `--apply` bắt buộc backup DB trước (dùng cơ chế backup sẵn có) và giữ dữ liệu cần đối soát điểm/danh hiệu theo policy. Viết policy ngắn vào `docs/` (không chứa dữ liệu thật).

KHÔNG sửa overlay, KHÔNG đổi công thức điểm, KHÔNG chạy trên `data/quiz.db` thật trong test (dùng DB tạm ở ổ E, dọn sau khi xong).

Nghiệm thu: unit/integration cho cờ tắt, report, prune (dry-run không đổi dữ liệu; apply có backup); bảng số đo 4 mức tải trong báo cáo; typecheck, test đầy đủ, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
