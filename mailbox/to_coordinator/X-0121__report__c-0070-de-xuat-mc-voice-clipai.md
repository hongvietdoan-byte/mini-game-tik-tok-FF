---
id: X-0121
from: codex1
to: coordinator
type: report
title: C-0070: đề xuất MC Voice ClipAI
ref: C-0070
priority: normal
needs: 
created: 2026-11-11T21:55:36+07:00
---
## Đã làm
- Hoàn tất bước 0 của C-0070: khảo sát hiện trạng và viết đề xuất, chưa sửa mã nguồn.
- Tài liệu: `docs/review/MC_VOICE_DE_XUAT.md`
- Nhánh: `codex1/c0070-mc-voice-plan`
- Commit: `6300d28 docs: đề xuất MC Voice dùng ClipAI`
- Đã push nhánh lên origin.

## Bằng chứng
- `corepack pnpm install --frozen-lockfile` → thành công, lockfile khớp.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 31 test files, 227 tests passed.
- `corepack pnpm exec playwright test tests/e2e/live-round.test.ts` → 1 passed; vòng 10 câu, 107.5 FPS.
- Quét URL/token-like trong tài liệu mới → không có kết quả.
- `corepack pnpm privacy:check` → FAIL do fixture có sẵn `fixtures/replay/tiktok-comments-normalization.json` chứa chuỗi số dài 9–12 chữ số; không thuộc phạm vi và không sửa.
- `git diff --cached --check` → đạt sau khi chỉnh whitespace.

## Tiêu chí hoàn tất
- Hiện trạng âm thanh/McSequence/asset Kelly: đã ghi.
- Pha READING trước ACCEPTING, timer backend, comment bị từ chối trong lúc đọc, fallback/cap/pause/skip/stop/recovery, không đổi chấm điểm: đã đề xuất.
- Overlay là nguồn phát duy nhất, lease cho nhiều overlay, ACK/idempotency/reconnect: đã đề xuất.
- ClipAI adapter, cache ngoài repo, API fake/error paths, key chỉ backend, không gọi API thật: đã ghi.
- Voice states/queue, API và Settings Dashboard do Codex 2, milestones/test plan/rủi ro/quyết định cần duyệt: đã ghi.

## Cần coordinator/người dùng duyệt
Đề xuất ban đầu trần đọc 20 giây, chính sách lease khi overlay chính reconnect, lưu token bằng secret store hay app settings, chuẩn loudness/trim; cho phép coordinator chạy Test Voice/pre-generate sau khi có đồng ý. Chưa gửi API call thật.
