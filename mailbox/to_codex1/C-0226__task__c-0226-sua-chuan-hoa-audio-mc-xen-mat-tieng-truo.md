---
id: C-0226
from: coordinator
to: codex1
type: task
title: C-0226 Sửa chuẩn hoá audio MC xén mất tiếng trước khoảng lặng
ref: C-0226
priority: high
needs: 
created: 2026-11-15T20:55:27+07:00
---
Làm tiếp trên nhánh `codex1/c0225-mc-reading` (a5cf8e8), cùng nhánh.

Người dùng nghe mẫu giọng MC: "có những đoạn âm thanh cụt".

## Nguyên nhân (coordinator đã đo, ffmpeg 9.0.1)
`apps/server/src/voice/ffmpeg-normalizer.ts` dùng
`silenceremove=start_periods=1:start_duration=0.3:start_threshold=-50dB:stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB`.
Với `stop_periods=-1` bộ lọc xử lý MỌI khoảng lặng >0,3 s trong câu và xén mất ~0,3 s ÂM THANH THẬT ngay trước khoảng lặng.
Tái hiện: tín hiệu `sine 1s + lặng 0.5s + sine 1s (fade-out 0.6s) + lặng 0.6s` (3,10 s) → sau bộ lọc 2,31 s; đoạn âm đầu chỉ còn 0–0,70 s (mất 0,3 s), đuôi fade bị cắt. loudnorm riêng lẻ không làm đổi độ dài.

## Việc
1. Chỉ cắt lặng ở ĐẦU và CUỐI file, giữ nguyên khoảng ngừng trong câu và đuôi nhỏ dần. Gợi ý đã thử đúng:
   `silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,loudnorm=I=-16:TP=-1.5:LRA=11`
   (kết quả trên tín hiệu thử: âm 0–1,0 s nguyên vẹn, khoảng lặng giữa 0,5 s giữ nguyên, đuôi fade giữ nguyên, lặng cuối còn ~0,07 s).
2. Test hồi quy chạy ffmpeg THẬT trên tín hiệu tổng hợp bằng lavfi (bỏ qua có điều kiện nếu máy không có ffmpeg): khẳng định không mất âm trước khoảng lặng giữa câu và không cắt đuôi. Dọn file tạm sau test.
3. Bump `MC_VOICE_POLICY_VERSION` để cache cũ (audio đã bị xén) không bị dùng lại.

## Ràng buộc
Không gọi provider thật/token thật. typecheck, test, e2e, privacy:check. Không gộp main.

## Nộp
Report: lệnh bộ lọc mới, số đo độ dài/khoảng lặng trước–sau trên tín hiệu thử, commit.
