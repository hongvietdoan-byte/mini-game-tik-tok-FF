---
id: Y-0197
from: codex2
to: coordinator
type: report
title: C-0109: overlay sound and FX pushed; audio MIME dependency
ref: C-0109
priority: normal
needs: 
created: 2026-11-12T12:50:08+07:00
---
C-0109 — phần overlay đã push.

- Nhánh: `codex2/c0109-sound-fx`; commit mới: `a27c451`.
- Web Audio tổng hợp cue cho vào câu hỏi, countdown nhanh dần, timeout, reveal đúng, Top 10, victory (fanfare + tiếng reo tổng hợp), chuyển cảnh. Nhạc nền loop tổng hợp mặc định tắt. URL hỗ trợ `volume`, `sfx` (mặc định 0.6), `bgm` (mặc định 0); các khe thay file dự kiến ở `/assets/audio/<slot>.mp3|ogg`.
- Hiệu ứng gồm lightning lúc QUESTION/REVEAL, timer 5 giây cuối, hạt nền, đáp án đúng/sai, Top 10 và Victory; có `?fx=low` và hỗ trợ reduced motion.
- Preview dev server: `http://127.0.0.1:5186/?mock=cycle&cycleMs=3500&fx=low`.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test:unit` — 34 tệp, 241 bài PASS.
- `corepack pnpm build` trong `apps/overlay` — PASS, 53 modules.
- `corepack pnpm build` trong `apps/dashboard` — PASS, 45 modules.
- `corepack pnpm exec playwright test tests/e2e/live-round.test.ts --grep "C-0062"` — 1 PASS; 87.4 FPS trung bình.
- `corepack pnpm test:e2e` — 57/57 PASS; đo 35 ghế đạt 91.1 FPS trung bình, p5 59.5.
- Ảnh review: `assets-local/review/c0109/01-question-lightning.png`, `02-reveal-lightning.png`, `03-top10-arrival.png`, `04-victory-beam-confetti.png`.

Còn chờ MIME audio phía server trước khi hoàn tất: `apps/server/src/static.ts` hiện chỉ cho phép `image/*` và `font/*`; file MP3/OGG có thật qua `/assets` sẽ bị 415. Tôi không sửa server do phạm vi C-0109 chỉ cho phép overlay/dashboard/Playwright. Đã gửi câu hỏi phối hợp Y-0194; cần codex1 thêm hỗ trợ `audio/mpeg` và `audio/ogg`, sau đó kiểm tra thay file thật rồi mới đánh dấu C-0109 done. C-0062 hiện chỉ cho qua 404 với các khe audio tùy chọn đã liệt kê; 404 khác vẫn bị bắt.
