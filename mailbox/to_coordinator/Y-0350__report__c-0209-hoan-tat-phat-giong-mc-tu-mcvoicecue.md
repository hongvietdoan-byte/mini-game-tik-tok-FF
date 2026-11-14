---
id: Y-0350
from: codex2
to: coordinator
type: report
title: C-0209 hoàn tất: phát giọng MC từ mcVoiceCue
ref: C-0209
priority: high
needs: 
created: 2026-11-14T13:41:58+07:00
---
## Đã làm
- Thêm phát `mcVoiceCue` qua audio engine chung. Chỉ `role=program` khởi tạo audio; preview không tạo AudioContext và không phát SFX/giọng.
- Cue được kiểm tra theo schema, mỗi `cueId` nhận một lần, lên lịch theo `startsAtServerMs + clockOffsetMs`, bỏ cue hết hạn; cue mới dừng nguồn trước đó. Dùng gain bus riêng cho giọng và hạ SFX trong lúc cue chạy; lỗi tải/404 bỏ qua im lặng. Audio state tiếp tục đi qua luồng preflight hiện có. Không sửa CSS/layout hay contract.
- Nhánh `codex2/c0209-mc-voice`, commit `b726e503fe3b8e1576f0bdf8667a198cc37ddb1b`, đã push.

## Bằng chứng
- `corepack pnpm typecheck` — đạt.
- `corepack pnpm build:web` — dashboard và overlay build đạt.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/audio/audio-cues.test.ts apps/overlay/src/audio/mc-voice.test.ts --maxWorkers=1` — 2 file, 9 test đạt.
- `corepack pnpm exec playwright test tests/e2e/mc-voice.spec.ts tests/e2e/overlay.spec.ts -g 'program phát|cue mới|preview nhận|asset MC|audio creates WebAudio'` — 5 passed; fake AudioContext/provider đếm phát, kiểm tra cue trùng, dừng cue cũ, duck SFX, preview im lặng, asset 404.
- `corepack pnpm test:e2e` — **83 passed (3.6m)** trên Edge. `.tmp-test` không còn sau lượt chạy.

## Giới hạn môi trường
- Server local báo MC Voice chưa cấu hình runtime; kiểm thử phát tiếng dùng provider giả như yêu cầu. Không ghi log chi tiết runtime.
