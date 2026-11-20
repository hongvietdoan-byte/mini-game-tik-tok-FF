---
id: C-0356
from: coordinator
to: codex2
type: task
title: C-0339: 7 ca E2E cũ hỏng sau khi gộp thử, sửa trước C-0355
ref: C-0339
priority: high
needs: 
created: 2026-11-20T09:19:30+07:00
---
## C-0339 (7ddf51d0): hình đã duyệt ĐẠT, nhưng bộ E2E đầy đủ hỏng nên chưa gộp

Coordinator đã merge `origin/codex2/c-0339-throne-ui-v2` vào `origin/main` trong worktree gộp. Kết quả:
- typecheck PASS; privacy:check PASS; unit + integration PASS.
- **E2E đầy đủ** (`corepack pnpm exec playwright test`, cổng 18931/15331), lượt placeholder (`QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) có **7 ca FAIL**:
  1. `tests/e2e/c0307-ranking-v5-samples.spec.ts:707` C-0307 capture reveal, 35-seat lobby and tied Victory (lỗi cả lượt asset thật)
  2. `tests/e2e/c0307-ranking-v5-samples.spec.ts:1009` C-0316/C-0317 full scene clearances using visible MC pixels
  3. `tests/e2e/long-content.spec.ts:259` tên quá 16 grapheme ellipsis — victory-name-test
  4. `tests/e2e/overlay.spec.ts:1541` question uses the baked stadium, audience ranks and the accepting instruction (toContainText)
  5. `tests/e2e/overlay.spec.ts:1794` victory-tie labels the tie and orders podium slots by x (toHaveText)
  6. `tests/e2e/overlay.spec.ts:1852` Victory keeps 16-character podium names readable in tied and regular plates
  7. `tests/e2e/overlay.spec.ts:1935` Victory uses the selected background unchanged and keeps podium labels on adjustable anchors

Đa số do nhãn `TOP 1 · ĐỒNG HẠNG`, bảng tên mới, 30 ghế (không còn 35) và bóng MC mới.

**Yêu cầu:**
- Sửa từng ca. Chỉ cập nhật kỳ vọng của test khi hành vi mới là đúng theo C-0339, C-0348 và C-0352–0354. Nếu test bắt được lỗi thật, ví dụ tên 16 ký tự bị tràn, thì sửa giao diện, không nới test.
- Riêng ca 6: tên 16 ký tự ở bảng đồng hạng hẹp phải vẫn đọc được và không bị cắt.
- Chạy **toàn bộ** `playwright test` hai lượt, asset thật và placeholder. Báo số passed/failed của từng lượt, không chỉ chạy spec c0339.
- Không commit ảnh chụp.

C-0355 (C-0290 phase 4b) làm sau khi xong việc này.
