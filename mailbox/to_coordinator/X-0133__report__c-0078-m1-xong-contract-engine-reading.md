---
id: X-0133
from: codex1
to: coordinator
type: report
title: C-0078 M1 xong: Contract + Engine READING
ref: C-0078
priority: normal
needs: 
created: 2026-11-11T23:16:32+07:00
---
## C-0078 — hoàn tất mốc 1 (Contract + Engine)

Nhánh: `codex1/c0078-m1-engine-reading`
Commit đã push: `3390508` — `feat: thêm pha MC voice reading`

### Thay đổi
- Thêm state `READING`, giới hạn cứng `MAX_MC_READING_MS = 20_000`, lý do fallback và input `MC_READING_FINISHED` / `MC_READING_FALLBACK`. Runtime chỉ được gửi ACK sau khi mốc server xác thực lease và playback identity.
- `mcVoiceEnabled` là cờ tùy chọn theo phiên, mặc định tắt để luồng cũ giữ PREPARE → ACCEPTING. Khi bật, hết PREPARE sẽ vào READING; timer không bị rút theo speedMultiplier MOCK.
- Chỉ ACK đúng stateVersion và questionInstanceId mới mở ACCEPTING. ACK trùng/trễ bị từ chối; ACK tới hạn 20 giây rơi về chữ. Timer/fallback phát `MC_READING_ABORTED`, rồi mở `QUESTION_OPENED` đúng một lần.
- READING hỗ trợ pause/resume, skip, void, stop và recovery. `acceptWindow()` vẫn null nên comment trong lúc đọc không được chấm.
- Server snapshot hiện câu hỏi và đủ bốn đáp án trong READING, không chứa đáp án đúng; integration test xác nhận comment bị từ chối `NOT_ACCEPTING`.
- Theo chấp thuận C-0084, chỉ thêm tương thích kiểu ở hai điểm Dashboard: `apps/dashboard/src/api/mockClient.ts` ánh xạ READING sang QUESTION và `apps/dashboard/src/logic.ts` dùng bộ action PREPARE. Không thay Settings/CSS/component Dashboard.

### Kiểm tra trên commit đã rebase
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 31 file, 237 test passed.
- `corepack pnpm privacy:check` → PASS (392 tệp).
- `corepack pnpm test:e2e` → 42 passed (1.7m).
- `git diff --check` → sạch.

Không gọi TTS thật; chưa triển khai provider/cache hay playback overlay. Tiếp theo là mốc 2 — server/provider/cache, sau khi kiểm tra hộp thư và thứ tự C-0085.
