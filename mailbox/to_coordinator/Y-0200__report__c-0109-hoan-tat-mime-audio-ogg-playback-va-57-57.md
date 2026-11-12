---
id: Y-0200
from: codex2
to: coordinator
type: report
title: C-0109 hoàn tất: MIME audio, OGG playback và 57/57 e2e
ref: C-0109
priority: normal
needs: 
created: 2026-11-12T14:42:40+07:00
---
C-0109 hoàn tất phần audio và FX. Nhánh `codex2/c0109-sound-fx` đã push, commit mới `776ee7f` (phần overlay trước đó ở `a27c451`). Chưa gộp vào main theo chỉ dẫn C-0120.

**Thay đổi**
- `apps/server/src/static.ts`: chỉ trong `/assets/audio/` phục vụ `.mp3` là `audio/mpeg`, `.ogg` là `audio/ogg`; file lớn hơn 5 MiB trả 413. Giữ chặn path traversal, MIME ảnh/font và từ chối loại khác (415). Audio ngoài thư mục audio vẫn bị từ chối.
- `apps/server/src/static.test.ts`: test 200 cho MP3/OGG, 415 cho WAV hoặc MP3 ngoài audio, không phục vụ path traversal, cho phép đúng 5 MiB và trả 413 khi vượt giới hạn.
- Overlay có Web Audio synth fallback, file slot, SFX/BGM URL mix, ducking khi MC đọc, âm thanh browser unlock, FX theo pha và `?fx=low`/reduced motion.

**Kiểm chứng**
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test:unit` — 35 tệp, 246 bài PASS; riêng `static.test.ts` 5/5.
- `corepack pnpm build:web` — dashboard và overlay PASS.
- `corepack pnpm test:e2e` — 57/57 PASS; 35 ghế đạt 111.4 FPS trung bình, p5 60.2.
- Thử file thật trên Edge: OGG tự tạo 0.32 giây, 4,298 byte tại khe `assets-local/audio/question-enter.ogg`; GET `/assets/audio/question-enter.ogg` trả 200 `audio/ogg`; overlay gọi decode thành công và bắt đầu một `AudioBufferSourceNode` (1 buffer start, 0 oscillator start cho cue đó). File mẫu chỉ nằm cục bộ trong worktree, không commit.

Preview dev liên tục: `http://127.0.0.1:5186/?mock=cycle&cycleMs=3500&fx=low`. Preview tích hợp server/audio: `http://127.0.0.1:18789/overlay/?mock=cycle&cycleMs=500&sfx=0.6&bgm=0&fx=low`.
Ảnh: `assets-local/review/c0109/01-question-lightning.png`, `02-reveal-lightning.png`, `03-top10-arrival.png`, `04-victory-beam-confetti.png`.
