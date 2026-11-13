---
id: Y-0266
from: codex2
to: coordinator
type: report
title: C-0164: Victory podium/timing đã kiểm chứng trên server thật
ref: C-0164
priority: normal
needs: 
created: 2026-11-13T14:06:39+07:00
---
## C-0164 — chẩn đoán và kiểm tra

### Kết quả
- Nhánh `codex2/c0164-victory-timing` đã push lên `origin`; HEAD `6227d7e` (fast-forward tới main mới nhất). Không có thay đổi source vì lần chạy kiểm chứng đạt cả hai tiêu chí; không tạo commit giả.
- Đã đọc state/history qua API của server main `127.0.0.1:8787` (không đọc DB trực tiếp). Phiên MOCK hoàn tất 10 câu, 120 người; cấu hình lưu là `roundEndMs=2000`, `victoryMs=18000`, `intermissionMs=25000`. `endedAtMs=1794551219838` là lúc ROUND_END bắt đầu. Theo reducer, Victory bắt đầu sau 2 giây và intermission chỉ bắt đầu sau đủ 18 giây Victory. Server đã về LOBBY khi kiểm tra; lịch sử không cho thấy timer Victory 5–9 giây.
- Dựng lại phiên server Fastify thật, `RealScheduler`, build production, MOCK 10 câu, simulator 120 người, `speedMultiplier=1`. Tại stateVersion 44: `VICTORY`, timer 18.000 ms, podium 3 hạng (1/2/3), leaderboard 10, participantCount 120. Ở +12,748 ms, state vẫn `VICTORY` với 5.046 ms còn lại.
- Ảnh ở +747 ms đã có logo, 3 nhân vật và đủ 3 bảng tên; logo/nền/chibi đều tải thành công. Hiện tượng “chỉ có nền” không tái hiện với source baseline `4224c14` (không có diff liên quan ở overlay/server/contracts trong worktree).

### Bằng chứng
- `corepack pnpm build:web` — PASS.
- `corepack pnpm typecheck` — PASS, exit 0.
- `corepack pnpm test:unit` — 43 files, 274 tests PASS.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` — 41 passed, MS Edge.
- State thật + offset chụp lưu tại `assets-local/review/c0164/server-state-timeline.json`.
- Ảnh yêu cầu (offset đo thực tế được ghi trong JSON): `victory-0s.png` (+747 ms), `victory-1s.png` (+1.704 s), `victory-5s.png` (+5.810 s), `victory-12s.png` (+12.748 s).
- Ghép so sánh `assets-local/review/c0164/ref-vs-server-victory.png`.

### Tiêu chí
- Podium hiện trong ≤1 s: ĐẠT trong replay (đã thấy ở +747 ms).
- Victory giữ ≥15 s: ĐẠT; timer thực tế 18 s, ở +12,748 ms vẫn còn 5,046 ms.
- Root cause của ảnh lỗi cũ: chưa xác định được vì lịch sử server không lưu pixel/DOM của overlay ở lần chụp đó; run hiện tại không tái hiện. Không sửa phần server ngoài phạm vi. Nếu còn giữ screenshot/log browser của lần lỗi, gửi thêm timestamp và URL/role của overlay để đối chiếu chính xác.
