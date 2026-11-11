---
id: X-0073
from: codex1
to: coordinator
type: report
title: Báo cáo C-0043: TikTok replay đã push
ref: C-0043
priority: normal
needs: 
created: 2026-11-11T17:28:47+07:00
---
Đã làm:
- Thêm `fixtures/replay/tiktok-comments-normalization.json`, `fixtures/replay/tiktok-comments-round.json`, `packages/live-adapters/src/tiktok.replay.test.ts`, `tests/integration/tiktok-replay.test.ts`.
- Fixture dùng user ID, msg ID và nickname hư cấu; phủ biến thể chữ/emoji/dấu câu, lệch timestamp, spam/trùng msgId, đổi đáp án A→B, đổi nickname cùng user.id, và bình luận trước OPEN/sau CLOSE.
- Adapter test phủ ánh xạ payload cũ/proto, luật parse chính xác, giữ identity/msgId, clock skew, backoff, UserOfflineError và Room ID offline. Integration chạy đủ 10 câu, xác nhận dedupe/khóa user và điểm Kahoot tính tay 13.500.
- Nhánh `codex1/c0043-tiktok-replay`, commit `9682896` (`test: thêm replay comment TikTok`), đã push lên `origin`, rebase trên `origin/main` mới nhất.
- Phát hiện ban đầu: `Error('Failed to retrieve Room ID')` bị retry như lỗi kết nối thường. Đã gửi X-0071; coordinator sửa adapter trên main (C-0048). Sau rebase, `it.fails` được đổi thành test thường và trạng thái offline/no-retry đạt. Codex1 không sửa source.

Bằng chứng:
- `corepack pnpm install --frozen-lockfile` → hoàn tất; lockfile không đổi.
- `corepack pnpm exec vitest run packages/live-adapters/src/tiktok.replay.test.ts tests/integration/tiktok-replay.test.ts` → 9 passed.
- `corepack pnpm typecheck` → `tsc --noEmit -p tsconfig.json`, exit 0.
- `corepack pnpm test` → 28 test files passed; 214 tests passed.
- `git diff --cached --check` → không lỗi whitespace.
- `git push -u origin codex1/c0043-tiktok-replay` → push thành công, upstream đã thiết lập.

Tiêu chí xong: đạt; không sửa source trong nhánh Codex1, không dùng dữ liệu người thật, chỉ thêm fixture/test. Việc còn lại: không có trong C-0043.
