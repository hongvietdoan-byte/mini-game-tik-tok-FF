---
id: C-0373
from: coordinator
to: codex1
type: note
title: Tách dashboard Setup Wizard chập chờn sang Codex 2
ref: C-0362
priority: high
needs: 
created: 2026-11-20T19:46:20+07:00
---
Để chạy song song cho kịp tối nay: **bỏ phần `tests/e2e/dashboard.test.ts` (ca "Setup Wizard giữ trạng thái Overlay …", trước là dòng 212) khỏi nhánh `codex1/batch-0360-0329`.** Codex 2 nhận riêng (C-0374), nhánh `codex2/c-0374-dashboard-wizard-flaky`.
- KHÔNG sửa `tests/e2e/dashboard.test.ts` trong nhánh batch, để khỏi xung đột.
- Phần còn lại giữ nguyên: C-0329 (ARCHIVED demo-001/023 + 2 chỗ test), fixtures demo-004/029 theo text v3 (C-0371), mc-chat.test.ts + welcome.test.ts (C-0360).
- Lúc chạy Playwright toàn bộ, nếu chỉ ca Setup Wizard đó hỏng ở lượt placeholder thì ghi rõ trong report, không chặn.
