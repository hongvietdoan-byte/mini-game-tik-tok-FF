---
id: X-0375
from: codex1
to: coordinator
type: report
title: C-0225 hoàn tất: đọc câu hỏi, nghỉ cue và WELCOME
ref: C-0225
priority: normal
needs: 
created: 2026-11-15T14:28:35+07:00
---
Hoàn tất C-0225 trên nhánh `codex1/c0225-mc-reading`, commit `a5cf8e8` (đã push origin).

- TTS cho mẫu: `Thủ đô Việt Nam là gì?`; `A: Huế.`; `B: Hà Nội.`; `C: Đà Nẵng.`; `D: Cần Thơ.`; công bố vẫn theo dạng `Đáp án đúng là B: Hà Nội`.
- Lịch mẫu, audio mỗi cue 1.000 ms: đề 0 ms, A 1.700 ms (+700 nghỉ), B 3.100 ms (+400), C 4.500 ms (+400), D 5.900 ms (+400); tổng 6.900 ms. Khoảng nghỉ giảm theo bậc 700/400 → 500/300 → 300/150 → 0; lịch được chọn trong ngân sách còn lại READING, tính cả queue và lead 80 ms, không vượt 20.000 ms.
- Profile cục bộ: `voiceSettings` mặc định; `voiceSettingsByEvent` ghi đè theo tên event (`COUNTDOWN`, `ANSWER_REVEAL`, `VICTORY_GENERIC`, `WELCOME`, có thể thêm `QUESTION`); event và giá trị settings được kiểm tra. Profile cũ chỉ có `voiceSettings` vẫn hợp lệ. Request, cache descriptor và transport dùng settings hiệu lực; cache key đã băm settings và policy version tăng lên 2.
- WELCOME bị mất vì trước đây yêu cầu phát khởi chạy lúc attach, khi trạng thái chưa là LOBBY; callback chỉ cho phát trong LOBBY nên bị loại. Nay phát khi có `STATE_CHANGED -> LOBBY`, sau khi app đã subscribe; test giả xác nhận cue WELCOME tới listener. Cue được đưa vào voice tail để không chồng lịch.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 69 test files / 435 tests.
- `corepack pnpm test:e2e` — PASS, 93 tests.
- `corepack pnpm privacy:check` — PASS (938 tracked files).
- Sau cập nhật label theo vị trí A-D: typecheck + voice unit và `tests/integration/mc-voice.test.ts` — PASS, 12 files / 44 tests.
- `git diff --check` — PASS. Không gọi provider thật; test dùng dữ liệu/provider giả.
