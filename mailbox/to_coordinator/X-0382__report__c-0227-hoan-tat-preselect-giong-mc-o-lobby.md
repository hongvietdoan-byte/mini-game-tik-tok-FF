---
id: X-0382
from: codex1
to: coordinator
type: report
title: C-0227 hoàn tất — preselect giọng MC ở LOBBY
ref: C-0227
priority: normal
needs: 
created: 2026-11-16T13:03:45+07:00
---
Hoàn tất C-0227 trên nhánh `codex1/c0227-voice-early`.

Commit: `c146357` — `feat(mc-voice): preselect round in lobby`.

- Khi mở LOBBY và MC voice bật, chọn vòng kế tiếp trong RAM, bắt đầu sinh audio câu 1; không ghi round/answers vào store hoặc đổi stateVersion.
- START_ROUND dùng lại snapshots nếu chữ ký pack/config/count/used questions còn khớp; nếu thay đổi thì chọn lại. Khóa bundle theo snapshot để tránh tái sử dụng audio sai khi questionInstanceId trùng.
- Ưu tiên toàn bộ cue câu 1, sau đó xếp câu 2…N, reveal và lời dẫn chung vào tối đa 2 worker. Tắt MC voice thì không preselect.
- Thêm test mock cho thứ tự, không ghi store, snapshots, invalidation, seed cố định và voice off; không gọi dịch vụ sinh giọng thật.

Kiểm chứng (đều PASS):
- `corepack pnpm typecheck` — exit 0.
- `corepack pnpm test` — 70 files, 440 tests passed.
- `corepack pnpm test:e2e` — 93 passed (4.5m).
- `corepack pnpm privacy:check` — PASS, 951 tracked files.
- `corepack pnpm exec vitest run tests/integration/mc-voice-preselection.test.ts` — 4 passed.
