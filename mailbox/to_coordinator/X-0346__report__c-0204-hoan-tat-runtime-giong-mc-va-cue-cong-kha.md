---
id: X-0346
from: codex1
to: coordinator
type: report
title: C-0204 hoàn tất: runtime giọng MC và cue công khai
ref: C-0204
priority: normal
needs: 
created: 2026-11-14T12:51:30+07:00
---
## Đã làm
- Nối runtime MC voice thật vào main.ts khi có token và profile máy cục bộ; thiếu cấu hình thì giọng tắt, preflight báo WARN và phiên vẫn chạy.
- Pre-generate lời chào, lời dẫn câu hỏi + bốn lựa chọn, lời đáp án, đếm ngược, BXH và vinh danh chung; thêm cache theo nội dung + voicePolicyVersion + voiceKey đã băm. Lỗi provider bỏ qua, không tự sinh lại; telemetry chỉ ghi event/reason.
- Thêm transport HTTPS dùng profile cục bộ, CDN allowlist và asset hash công khai không cần token. Validator từ chối lời/câu có tên hoặc ID người chơi; không đọc tên người nhanh nhất.
- Pha READING lấy thời lượng từ audio và hàng đợi, tối đa 20.000 ms; khi thiếu audio dùng 5.000 ms.
- Nhánh codex1/c0204-mc-voice, commit 6b44230 Nối giọng MC vào runtime và cue công khai đã push.

## Hợp đồng cho Codex 2
PublicSnapshot.mcVoiceCue?: McVoiceCue | null.
McVoiceCue = { cueId: string (UUID); eventType: WELCOME | QUESTION | COUNTDOWN | ANSWER_REVEAL | LEADERBOARD_GENERIC | VICTORY_GENERIC; assetUrl: string theo mẫu /api/mc-voice/assets/{64 chữ hex thường}; durationMs: số nguyên từ 1 đến 20.000; startsAtServerMs: số hữu hạn không âm }.
Cue nằm trên WS STATE_SNAPSHOT một lần, serverTimeMs và startsAtServerMs dùng cùng đồng hồ server. Snapshot HTTP/reconnect luôn null; overlay cần phát mỗi cueId/seq đúng một lần.

## Câu thoại mẫu
- WELCOME: “Chào mừng cả nhà đến với phiên đố vui! Hãy cùng sẵn sàng nhé.”
- QUESTION: đọc nội dung câu hỏi rồi lần lượt “Đáp án A/B/C/D” theo bốn lựa chọn đã duyệt.
- COUNTDOWN: “Còn số giây, hãy chốt đáp án!”
- ANSWER_REVEAL: “Đáp án đúng là lựa chọn: nội dung”.
- LEADERBOARD_GENERIC: “Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!”
- VICTORY_GENERIC: “Xin chúc mừng những người chiến thắng! Cảm ơn mọi người đã tham gia.”
Không câu nào đọc tên/ID người chơi hay thông tin fastestCorrectAnswer.

## Cấu hình máy coordinator
- Biến môi trường: CLIPAI_TOKEN; tùy chọn QUIZ_MC_VOICE_PROFILE_FILE (mặc định data/mc-voice-profile.json).
- Các khóa profile JSON: baseUrl, provider, model, voiceId, voiceSettings, allowedCdnHosts.
- Tùy chọn executable: FFMPEG_PATH, FFPROBE_PATH.
- Không ghi giá trị cấu hình hay địa chỉ dịch vụ trong report. Profile thay đổi tạo namespace cache mới. Không gửi tham số tốc độ cho provider; runtime để rate=1, ffmpeg chỉ chuẩn hóa audio, overlay có thể áp dụng playbackRate.

## Kiểm tra
- corepack pnpm typecheck → pass (tsc --noEmit).
- corepack pnpm vitest run --project unit --project integration --maxWorkers=1 → 66 file, 425 test pass; suite không tạo thêm thư mục temp hệ thống.
- corepack pnpm vitest run --project integration tests/integration/mc-voice.test.ts -t tự-pre-generate → 1 pass.
- git diff --check → pass.
- Lần chạy song song đầu tiên làm lộ test race khi pre-generate chưa kết thúc và timeout ở bài tải lớn; đã làm bài MC chờ hoàn tất 10 gói câu hỏi/lời đáp rồi chạy lại toàn bộ tuần tự thành công.
- Không gọi provider thật. Script kiểm tra thật giới hạn cứng 12 dòng; mặc định dự kiến 1 dòng và in planned_lines=1 hard_limit=12 trước khi gọi provider, yêu cầu --confirm-spend. Coordinator tự chạy khi sẵn sàng: corepack pnpm mc-voice:real-check -- --confirm-spend.

## Phạm vi còn lại
Phía server và contract đã xong. Overlay chưa nối phát âm thanh trong nhánh này; Codex 2 dùng hợp đồng trên để tiêu thụ cue.
