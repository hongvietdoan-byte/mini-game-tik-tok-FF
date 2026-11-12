---
id: X-0137
from: codex1
to: coordinator
type: report
title: C-0078 M2 đã push — hợp đồng API MC Voice cho dashboard
ref: C-0079
priority: high
needs: 
created: 2026-11-11T23:58:35+07:00
---
## C-0078 M2 — máy chủ MC Voice

Nhánh `codex1/c0078-m2-voice-server`, commit `0521a84` (`feat: hoàn thiện máy chủ và cache MC Voice`) đã push lên origin.

### Hợp đồng API cho dashboard

Tất cả route yêu cầu `Authorization: Bearer <adminToken>`. Route ghi còn kiểm tra Origin.

- `GET /api/mc-voice/settings` → `{ provider: "CLIPAI", voiceName: "Kelly", hasToken: boolean, ready: boolean, primaryOverlayInstanceId: string | null }`. API chỉ trả `hasToken`, không trả token hoặc chuỗi đã che. Dashboard dùng `hasToken` và nên xoá ô nhập token sau khi lưu.
- `PUT /api/mc-voice/settings` nhận `{ token: string }` hoặc `{ clearToken: true }`, cùng tuỳ chọn `{ primaryOverlayInstanceId: string | null, confirmPrimaryOverlayChange?: boolean }`. Đổi overlay chính sau khi đã chọn cần xác nhận, nếu thiếu trả `409`. Response là settings snapshot.
- `POST /api/mc-voice/test` nhận `{ confirmed: true, text: string }`; trả `{ ok, assetId, durationMs, cacheHit }`. Thiếu xác nhận trả `422`.
- `POST /api/mc-voice/pre-generate` nhận `{ questionIds: string[] }`; chỉ nhận câu đã duyệt trong pack hiện hành, trả `202` với `jobId` và counters.
- `GET /api/mc-voice/pre-generate/:jobId` trả `{ jobId, status, total, completed, failed, tooLong, updatedAtMs }`; không chứa lời thoại, bytes hay credential.
- `GET /api/mc-voice/assets/:assetId` trả `audio/mpeg` sau kiểm tra admin.

`McVoiceSettingsSchema` dùng `hasToken` (không có `configured`/`tokenMasked`). Credential store có `get/set/clear`. Electron truyền `safeStorage` vào server; server chạy ngoài Electron nạp `CLIPAI_TOKEN` lúc khởi động rồi chỉ giữ thay đổi dashboard trong RAM. `.env.example` có giá trị rỗng.

### M2: phạm vi và trạng thái

- Có cache SHA-256/checksum, giới hạn 20 giây, pre-generate progress, normalizer mono 44.1 kHz / −16 LUFS / trim khoảng lặng trên 300 ms.
- ClipAI dùng transport interface được tiêm; tests chỉ dùng fake. Chưa có endpoint/protocol thật trong repo, chưa phát sinh request tới dịch vụ. Coordinator là bên nối transport thật sau khi người dùng duyệt nghe mẫu.
- Desktop lưu ciphertext qua `safeStorage` trong app data. Ngoài Electron, token chỉ ở biến môi trường lúc khởi động/bộ nhớ tiến trình; không ghi token rõ ra đĩa hay trả về API.
- Normalizer dùng `ffmpeg`/`ffprobe` hệ thống hoặc `FFMPEG_PATH`/`FFPROBE_PATH`. Máy này không có hai binary trên PATH; normalizer đã được kiểm bằng runner giả.

### Bằng chứng

- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 38 file, 260 test passed.
- `corepack pnpm privacy:check` → PASS (400 tệp).
- `corepack pnpm test:e2e` → 42 passed (1.5m).
