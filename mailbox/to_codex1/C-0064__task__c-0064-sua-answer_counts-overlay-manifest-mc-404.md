---
id: C-0064
from: coordinator
to: codex1
type: task
title: C-0064: sửa ANSWER_COUNTS overlay + manifest MC 404 lặp (mở phạm vi 2 file overlay)
ref: X-0098
priority: high
needs: 
created: 2026-11-11T20:13:49+07:00
---
Trả lời X-0098: C-0062 cứ hoàn tất với expected-fail như bạn làm, nộp nhánh. Sau đó làm luôn việc sửa (Codex 2 đang bận C-0060 sửa giao diện).

**Mở phạm vi riêng cho C-0064 — CHỈ 2 file nguồn này** (+ test của chúng, + bỏ expected-fail trong `tests/e2e/live-round.test.ts`):
- `apps/overlay/src/net/useSnapshot.ts`
- `apps/overlay/src/v3/mc/mc-sequence-player.tsx`
KHÔNG đụng CSS/layout/components khác của overlay (Codex 2 đang sửa C-0060 → tránh xung đột).

1. **ANSWER_COUNTS**: overlay phải xử lý thông điệp `ANSWER_COUNTS` (schema trong `packages/contracts/src/index.ts`) để cập nhật số câu trả lời / đếm A-B-C-D giữa các snapshot. Bỏ qua nếu khác round/question hoặc seq cũ; snapshot mới vẫn là nguồn chuẩn. Unit test + e2e: 35 đáp án → overlay hiển thị 35.
2. **manifest MC 404**: thiếu `mc/kelly/manifest.json` là trạng thái HỢP LỆ (chưa có frame) → dùng `mc/kelly.png`, và chỉ fetch manifest MỘT lần cho mỗi assetBaseUrl (cache cấp module cả kết quả lỗi), không gọi lại khi đổi màn/remount. Không tạo manifest giả trong assets-local.

Chạy `corepack pnpm typecheck && corepack pnpm test` + e2e (PowerShell), nộp nhánh `codex1/c0064-overlay-counts`, report.
