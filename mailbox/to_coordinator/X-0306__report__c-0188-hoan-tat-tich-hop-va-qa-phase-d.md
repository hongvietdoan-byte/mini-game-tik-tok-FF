---
id: X-0306
from: codex1
to: coordinator
type: report
title: C-0188 hoàn tất tích hợp và QA Phase D
ref: C-0188
priority: high
needs: 
created: 2026-11-13T20:08:26+07:00
---
Đã làm
- Nhánh: codex1/integration-name-safety; commit cuối: f36fa67ba42fe071af47ced7413d02b03c90d74f (C-0188: sửa kiểm thử theo tên công khai an toàn). Đã push lên origin; không push main, không rebase.
- Đã merge name-filter → name-moderation (@ 929a8a0) → hud-config; validator Dashboard dùng schema export từ @quiz/contracts, không đổi giao diện.
- Xung đột:
  * apps/server/src/voice/cache.test.ts: giữ helper thư mục .tmp-test của C-0184.
  * scripts/simulate-round.ts: giữ runtime/cleanup của C-0184 và safeDisplayName của name-filter.
  * apps/overlay/src/main.tsx, ArenaStage.tsx, AuxiliaryStages.tsx, Victory.tsx: giữ DTO tên công khai và fallback tên legacy chỉ trong mock.
  * hud-config: không có xung đột; contracts auto-merge.
- Sau lần E2E đầu, cập nhật hai test theo DTO công khai: long-content đặt safeDisplayName; C-0062 so bảng theo từng hàng/thứ hạng để hỗ trợ tên hiển thị trùng. Không sửa mã sản phẩm ở bước này.

Bằng chứng
- corepack pnpm typecheck — PASS (exit 0).
- corepack pnpm test --testTimeout=60000 --hookTimeout=60000 --maxWorkers=1 — 61 test files, 376 tests PASS; 159.48s.
- corepack pnpm privacy:check — PASS, 801 tệp theo dõi.
- corepack pnpm build:web — PASS; dashboard 47 modules, overlay 55 modules.
- QUIZ_ASSETS_DIR=<assets-local checkout chính>, PLAYWRIGHT_SERVER_PORT=18887, PLAYWRIGHT_OVERLAY_PORT=15187 corepack pnpm test:e2e — 65/65 PASS, 4.2 phút. E2E dùng assets checkout chính và cổng riêng.
- corepack pnpm exec tsx tools/phase_d_name_safety.ts — PHASE_D_NAME_SAFETY_PASSED: 506 người, 10 câu, seed 20261113, cùng session ID. Sau lọc: NONE 500, REVIEW 1, PARTIAL 1, HIGH 3, MANUAL_HIDE 1. Có 273 WS public messages, overlay reconnect 1, không rò tên/mã nhạy cảm. Điểm/thứ hạng trùng control cùng seed. TTS có 5 request nhưng 0 trường danh tính.

EPERM / rủi ro
- Không xác định được PID giữ file dist: lần kiểm tra không có handle.exe; process inventory có nhiều tiến trình Vite/overlay dev nên có khả năng tranh chấp, nhưng đây chưa phải nguyên nhân được chứng minh. corepack pnpm build:web sau merge chạy thành công và không tái hiện EPERM.
- Dọn dẹp: pnpm test giữ số thư mục quiz-* trong temp hệ thống ở 45 → 45; sau E2E .tmp-test trong repo còn 0 mục. 45 thư mục cũ không bị xóa.
- Nhánh sạch sau push. origin/main đã tiến thêm trong lúc làm; nhánh được tạo từ origin/main tại thời điểm bắt đầu và không rebase/merge thêm main sau đó theo chỉ dẫn chỉ merge.
