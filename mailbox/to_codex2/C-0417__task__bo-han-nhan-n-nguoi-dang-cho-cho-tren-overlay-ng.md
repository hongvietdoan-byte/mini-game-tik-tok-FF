---
id: C-0417
from: coordinator
to: codex2
type: task
title: Bỏ hẳn nhãn '+N người đang chờ chỗ' trên overlay (người dùng chốt 24/11)
ref: 
priority: high
needs: 
created: 2026-11-24T07:32:11+07:00
---
Người dùng chốt 24/11: nhãn "+N người đang chờ chỗ" không cần hiện. Lý do phát sinh: trong bố cục ngai, nhãn này (arena.css:602, right 97 / top 1004) đè lên chữ "NGAI VÀNG" dưới ngai.
Gói theme C-0407 đã gộp main dcc7cdf1. Làm trên nhánh mới `codex2/c-bo-nhan-cho` tách từ origin/main.

VIỆC (sửa tối thiểu, không đổi bố cục khác):
1. apps/overlay/src/v3/ArenaStage.tsx:869 — xoá dòng render `.v3-queue`. Giữ nguyên trường `queued` trong snapshot/contracts (server không đổi).
2. apps/overlay/src/v3/arena.css — xoá 3 luật `.v3-queue` (dòng ~340, ~602, ~1837).
3. Theme: bỏ slot K43.
   - apps/overlay/src/theme-skins.ts:74 (xoá dòng K43);
   - tools/theme-map.ts: xoá captureK43CoverageScreenshot (~453) và chỗ gọi (~918), cùng biến môi trường QUIZ_THEME_K43_COVERAGE_SCREENSHOT;
   - slots.json, CAN-CHUAN-BI, SO-DO và mọi chỗ đếm số slot (74 → 73) để export-default/map không còn K43.
   Không đánh số lại các slot K khác (K44+ nếu có giữ nguyên ID).
4. Test:
   - tests/e2e/overlay.spec.ts:842 (test C-0407 "để hàng chờ nhìn thấy") → đổi thành: mock lobby-queue (30 ghế + 5 người chờ) có ngai, 30 ghế, `.v3-queue` count 0, và chữ "NGAI VÀNG" dưới ngai nhìn thấy, không bị phần tử nào khác chồng lên (so bbox).
   - :2155 (`toBeHidden`) → `toHaveCount(0)`.
   - throne.test.ts:34 và mock 'lobby-queue' giữ nguyên nếu vẫn đúng.
   - grep toàn repo "K43", "v3-queue", "đang chờ chỗ" phải hết (trừ docs lịch sử, mailbox).

KIỂM TRƯỚC KHI BÁO:
- typecheck, privacy:check, vitest đủ;
- theme:export-default + theme:map chạy qua;
- TOÀN BỘ Playwright 2 lượt: asset thật + placeholder. Báo passed/failed/skipped từng lượt.
- Ảnh duyệt (chỉ trong thư mục bị ignore, KHÔNG commit ảnh): sảnh 30 ghế + 5 người chờ, phóng to vùng ngai + chữ NGAI VÀNG. Báo đường dẫn tuyệt đối.
- Merge origin/main mới nhất trước khi báo, push nhánh.
