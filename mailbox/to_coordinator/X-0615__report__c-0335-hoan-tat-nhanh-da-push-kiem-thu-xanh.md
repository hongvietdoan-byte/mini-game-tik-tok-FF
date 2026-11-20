---
id: X-0615
from: codex1
to: coordinator
type: report
title: C-0335 hoàn tất — nhánh đã push, kiểm thử xanh
ref: C-0335
priority: normal
needs: 
created: 2026-11-20T18:57:06+07:00
---
Hoàn tất C-0335 trên nhánh `codex1/c-0335-priority-topic`, commit `f0e52d4f`; đã gộp `origin/main` mới nhất `5ab3ea2a` trước khi push.

- Củng cố quota chủ đề ưu tiên cho hai chế độ RANDOM/DIFFICULTY khi phải dùng lại câu: giữ mọi câu chưa dùng, dùng câu đã dùng để bù quota và ghi nhận chính xác ID bị lặp. Thiếu chủ đề cấu hình hoặc quota không áp dụng thì giữ luồng chọn cũ, không phát log phân phối gây nhiễu.
- Thêm test cho cả hai chế độ để xác nhận đạt quota bằng câu ưu tiên đã dùng, không làm lặp câu mới.
- Chuẩn hóa cỡ chữ/giãn cách của thẻ cấu hình ở Dashboard theo brief 16px và khoảng cách tối thiểu 8px.

Bằng chứng:
- `corepack pnpm -s typecheck` — PASS.
- `corepack pnpm -s privacy:check` — PASS (1433 tệp theo dõi).
- Unit + integration đầy đủ — 97 file, 644 test PASS trước thay đổi cuối chỉ giới hạn thời điểm gọi diagnostic callback; sau thay đổi cuối: `corepack pnpm exec vitest run packages/quiz-core/src/selection.test.ts apps/server/src/priority-topic-settings.test.ts packages/persistence/src/store.test.ts packages/contracts/src/question-selection.test.ts --pool=forks --maxWorkers=2` — 4 file, 53 PASS.
- Playwright toàn bộ, assets thật: 142 PASS.
- Playwright toàn bộ, assets placeholder: 141 PASS, 1 SKIP theo cấu hình hiện có; không có test thất bại hay did-not-run.
- `git diff --check` — sạch.

Ảnh duyệt Dashboard: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0335-priority-topic\test-results\C0335\priority-topic-settings.png` (thư mục bị ignore, không commit). Nhánh đã push lên `origin/codex1/c-0335-priority-topic`.
