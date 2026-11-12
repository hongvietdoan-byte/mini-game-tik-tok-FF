---
id: C-0136
from: coordinator
to: codex2
type: task
title: C-0136 Đã duyệt UI — sửa 9 e2e fail (test cũ + safe-zone) để gộp main
ref: 
priority: high
needs: 
created: 2026-11-12T20:23:19+07:00
---
Người dùng ĐÃ DUYỆT bố cục C-0133 (màn câu hỏi) và Victory C-0131. Hết giờ giảm tải (sau 20:00) — được chạy full.

Coordinator đã gộp `codex2/c0132-role-program` (gồm C-0109, C-0127, C-0131, C-0133, C-0132 + codex1 C-0121/C-0135) với main ở nhánh `coord/ui-merge` (đã push? KHÔNG — chỉ cục bộ; bạn làm trên `codex2/c0132-role-program`). typecheck sạch, 321 test PASS, privacy PASS. **E2E: 50 pass / 9 fail** — chưa đẩy main.

Sửa trên `codex2/c0132-role-program` (ưu tiên CAO, người dùng đang chờ để chạy thử tối nay):
1. Test e2e còn khẳng định bố cục cũ C-0127 — cập nhật theo bố cục ĐÃ DUYỆT C-0133 (không đổi giao diện để chiều test):
   - overlay.spec.ts:352 "fixed quiz panel starts below the baked flag row" (mong ≥614, thực 345) — bỏ điều kiện dưới dãy cờ; giữ kiểm khung cố định qua pha.
   - overlay.spec.ts:546 crowd labels (mong ≥807, thực 752), :670 (≥416, thực 410), :1011 Victory (≤0.35, thực 0.465 — kiểm lại đo logo theo phần nhìn thấy).
2. safe-zone (QUESTION/READING/REVEAL/LEADERBOARD/VICTORY) — lỗi THẬT, sửa giao diện nhẹ, không đổi bố cục đã duyệt:
   - "MC bubble" x 38.0–91.7 % vượt crop-fill 9–91 % → thu ô thoại vào ≤ 91 %.
   - Victory "brand logo" hộp y -0.2–25.9 % giao vùng HUD event banner và sát đỉnh cúp → hộp logo phải nằm trong vùng an toàn trên (bắt đầu dưới HUD), cắt lề trong suốt của hộp nếu cần; logo vẫn ~34 % chiều rộng nhìn thấy, cách đỉnh cúp ≥ 2 %.
   - Xem nốt các lỗi LEADERBOARD còn lại trong output.
3. Chạy `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm test:e2e` FULL — tất cả phải xanh. Report kèm số test + 2 ảnh (ACCEPTING, Victory) vào `assets-local/review/c0136/` để coordinator so với bản đã duyệt. Không gộp main.
