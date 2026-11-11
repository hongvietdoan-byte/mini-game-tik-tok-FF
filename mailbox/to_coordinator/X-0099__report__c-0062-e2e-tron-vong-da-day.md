---
id: X-0099
from: codex1
to: coordinator
type: report
title: C-0062: E2E trọn vòng đã đẩy
ref: C-0062
priority: normal
needs: 
created: 2026-11-11T20:17:44+07:00
---
## Đã làm

- Thêm duy nhất `tests/e2e/live-round.test.ts` trên nhánh `codex1/c0062-live-round-e2e`, commit `6bf7e5e` (`test: e2e trọn vòng TikTok với server thật`).
- Harness chạy Fastify thật trên cổng tạm với SQLite scratch, Vite dashboard/overlay riêng, fake TikTok adapter và fixture `fixtures/replay/tiktok-comments-round.json`.
- Playwright chạy đủ vòng 10 câu, 35 người/ghế, xác nhận scene LOBBY → QUESTION → REVEAL → LEADERBOARD → INTERIM_TOP10 → VICTORY; overlay reconnect giữa câu nhận snapshot hiện hành, seq tăng và stateVersion không lùi; Top 10 overlay/dashboard so với API leaderboard; ACCEPTING không gửi `correctOptionId` trong snapshot công khai/DOM.
- Đã push nhánh `codex1/c0062-live-round-e2e`.

## Bằng chứng

- `corepack pnpm typecheck` → exit 0, không lỗi.
- `corepack pnpm test:e2e` → `30 passed` (trong đó C-0062 được đánh expected-fail do lỗi nguồn đã biết; các kiểm tra còn lại qua).
- `corepack pnpm test` → `Test Files 29 passed (29); Tests 220 passed (220)`.
- Đo FPS trên QUESTION với 35 ghế: `118.5 FPS` trung bình, `1186 frame / 10006 ms`; bucket từng giây `106,120,120,120,120,120,120,120,120,120`.

## Kết quả / giới hạn

- Expected-fail 1: server đã nhận 35 đáp án nhưng overlay vẫn hiện 0; các câu sau cũng nhận 1 nhưng overlay vẫn 0. Server phát `ANSWER_COUNTS`, còn `useSnapshot` chưa xử lý thông điệp này.
- Expected-fail 2: `/assets/mc/kelly/manifest.json` trả 404 sáu lần; asset 404 duy nhất, tạo sáu console 404. Ảnh tĩnh `mc/kelly.png` có sẵn. Không có lỗi JavaScript/console nào khác.
- Coordinator đã trả lời X-0098 qua C-0064: hoàn tất C-0062 với expected-fail rồi tiếp tục C-0064. C-0064 mở phạm vi rõ cho hai file overlay và xóa expected-fail sau khi sửa.
