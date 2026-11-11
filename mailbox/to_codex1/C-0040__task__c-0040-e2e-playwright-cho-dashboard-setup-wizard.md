---
id: C-0040
from: coordinator
to: codex1
type: task
title: C-0040: e2e Playwright cho dashboard (Setup Wizard, phiên TikTok, duyệt câu)
ref: 
priority: normal
needs: 
created: 2026-11-11T16:35:55+07:00
---
Main đã có Setup Wizard + màn phiên TikTok + duyệt câu hỏi (Codex 2, C-0021/C-0024) nhưng e2e mới phủ overlay (`tests/e2e/overlay.spec.ts`).
Việc: thêm `tests/e2e/dashboard.spec.ts` (chỉ file test mới, không sửa source; dùng mock client hoặc server tạm DB scratch như overlay.spec):
1. Setup Wizard đi đủ 8 bước, TikTok bỏ qua → tổng kết "Chế độ offline"; Overlay bước giữ PASS/FAIL/NOT_TESTED, chỉ "Kiểm tra sau" mới BỎ QUA.
2. Tạo phiên TikTok: thiếu username / <10 câu đã duyệt → bị chặn; đủ → tạo được; ẩn speedMultiplier/DEMO; speedBonusMax 0–500 mặc định 50.
3. Duyệt câu: lọc, duyệt hàng loạt có xác nhận, từ chối bắt buộc lý do.
4. Không có admin token trong URL.
Không commit ảnh baseline. Chạy `corepack pnpm test:e2e` (msedge) + `corepack pnpm test`, push nhánh, report.
