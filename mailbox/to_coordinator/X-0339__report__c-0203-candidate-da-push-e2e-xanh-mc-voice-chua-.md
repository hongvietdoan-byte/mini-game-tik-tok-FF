---
id: X-0339
from: codex1
to: coordinator
type: report
title: C-0203: candidate đã push; E2E xanh, MC Voice chưa phát
ref: C-0203
priority: high
needs: 
created: 2026-11-14T11:38:56+07:00
---
# C-0203 — release candidate và kiểm giọng MC

## Bản dựng
- Nhánh `codex1/release-candidate-1114` đã push lên origin, không force. HEAD: `a6ab516`; worktree sạch.
- Dựng từ main tại lúc nhận task (`93b41d9`) rồi merge các cập nhật main mới nhất trong lúc làm (merge cuối `6d65abd`).
- Merge đúng thứ tự yêu cầu: `46151b9` integration-name-safety → `9e0fd4d` c0200-safe-name-rules → `36a5dfd` c0198-fastest-correct → `f41dffe` c0165-preview-fit → `74481d2` c0166-auto-sfx → `5c5e0c6` hud-settings → `88e8412` c0197-mc-poses → `df457af` c0197-video-background → `8f920e8` c0197-fastest-correct. Sau fetch cuối, cả chín nhánh yêu cầu đều đã ở tip tương ứng đã merge.

## Xung đột và điều chỉnh
- `runtime.ts`: ghép lọc tên an toàn với participant count, chỉ tăng khi người chơi mới được thêm.
- `ArenaStage.tsx` preview-fit: kết hợp role/fit, stage scale và tên public-safe.
- `overlay.spec.ts` auto-SFX: giữ helper thư mục temp và đường dẫn review riêng.
- `hud-settings`: giữ cả trang moderation lẫn HUD; kết hợp HUD provider với role/fit/public-safe DTO trong Dashboard, Overlay và ArenaStage; giữ cả bộ kiểm thử.
- MC poses: kết hợp import/type MC state với luồng public-safe.
- `ArenaStage.tsx` fastest-correct: ghép callout, ghế và Top 10 badge với `safeDisplayName`/public player id; giữ cả hai mock A/B.
- Lượt E2E đầu có 1 lỗi: generic reveal mock mang theo fastest event, khiến bubble “Đáp án B” bị thay bằng callout. Đã giới hạn dữ liệu winner cho riêng mock fastest A/B. Test lỗi đầu đã được chạy lại: targeted pass và full E2E pass.

## Kiểm tra
- `corepack pnpm typecheck` — PASS; chạy lại sau assertion READING mới cũng PASS.
- `corepack pnpm test` — PASS, 63 files / 410 tests.
- `corepack pnpm privacy:check` — PASS, 864 tệp tracked.
- `PLAYWRIGHT_SERVER_PORT=18896 PLAYWRIGHT_OVERLAY_PORT=15285 corepack pnpm test:e2e` — PASS, 79/79; dùng cổng riêng.
- Sau khi bổ sung assertion READING, `PLAYWRIGHT_SERVER_PORT=18897 PLAYWRIGHT_OVERLAY_PORT=15286 corepack pnpm exec playwright test tests/e2e/live-round.test.ts -g "C-0203: fastestCorrectAnswer"` — PASS, 1/1.
- `corepack pnpm build:web` — PASS cho Dashboard và Overlay.
- `corepack pnpm exec vitest run --project unit apps/server/src/voice/cache.test.ts` — PASS, 5/5. Cache key/metadata dùng `voicePolicyVersion`; cache legacy thiếu version bị bỏ qua.
- `git diff --check` — PASS; `.tmp-test` đã dọn.
- Kiểm tra thời gian 20 giây: full `pnpm test` và E2E 79/79 đều pass; E2E server MOCK cũng đặt answer window 20.000 ms.

## MOCK server thật / fastest và giọng MC
E2E `tests/e2e/live-round.test.ts` tạo phiên MOCK qua server với `mcVoiceEnabled: true`, xác nhận pha READING đã xảy ra, tua tới ACCEPTING, gửi câu trả lời đúng qua `runtime.mockComment()`, rồi xác nhận `fastestCorrectAnswer` từ runtime hiện trên Overlay ở REVEAL. Screenshot: `.claude/review/C0203/mock-server-fastest-overlay.png`.

Kết quả âm thanh: test không thấy request `/api/mc-voice` hoặc `/assets/mc/voice` và không có phần tử `<audio>`. MC Voice **không phát** trong vòng MOCK này. Vì không có tiếng phát nên không có tên người chơi nào được đọc; đây không chứng minh được luồng TTS thật an toàn hay phát thành công. Cache version test pass, nhưng không đồng nghĩa playback đã được tích hợp. Bản ứng viên code/test pass, song chưa thể nghiệm thu là bản hoàn thiện có giọng MC; cần nối playback MC Voice vào Overlay.

Ảnh nghiệm thu khác:
- Fastest A/B: `.claude/review/C0197B/option-a.png`, `option-b.png`.
- Video background: `.claude/review/C0197D/question-video-35-seats.png`, `victory-video.png`, `question-static-fallback.png`.
