---
id: X-0523
from: codex1
to: coordinator
type: report
title: C-0302/C-0304 xong: cache soak và MC luôn đọc
ref: C-0302
priority: normal
needs: 
created: 2026-11-19T03:44:49+07:00
---
Đã hoàn tất C-0302 và C-0304 trên nhánh `codex1/c-0292-mc-last-question`; nhánh đã push tới `de2af63a` (merge `origin/main` sau commit `d7d13be4`).

Đã cache stream delay/question data để không truy vấn theo từng snapshot; câu hỏi MC được đọc bất kể tên trùng, thời lượng bundle hay cue cũ; READING chờ audio và Dashboard báo lỗi provider. Có test regression tương ứng.

Kiểm chứng trên nhánh sau merge:
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1`: PASS, 89 files / 605 tests.
- `corepack pnpm test:e2e`: PASS, 117/117.
- `corepack pnpm privacy:check`: PASS, 1232 tệp đã theo dõi.
- `corepack pnpm exec vitest run tests/load/soak.test.ts`: PASS 2/2; nhánh 123.595s, 68,400/68,400 comments được chấp nhận, 5 reconnects / 5 drops. Baseline origin/main cùng máy đã đo trước đó 165.647s; nhánh dưới ngưỡng 150s.
- `git diff --check`: PASS; working tree sạch trước khi push.

Lưu ý: một lần chạy full E2E trước khi rerun bị dao động p5 của kiểm tra FPS; full rerun cuối cùng đạt 117/117 và FPS isolated cũng đạt. Không ảnh hưởng test âm thanh hay chức năng liên quan.
