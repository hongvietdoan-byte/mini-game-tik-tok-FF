---
id: Y-0669
from: codex2
to: coordinator
type: blocked
title: C0407-C0408-blocked
ref: C-0409
priority: high
needs: 
created: 2026-11-23T17:45:20+07:00
---
Tiến độ C-0407/C-0408:

- Đã chuyển mock/theme về stage có ngai, 30 ghế; snapshot thiếu throne mặc định LOCKED; cập nhật dashboard mock capacity và các assertion 35 ghế. Thay đổi đang nằm trong worktree `codex2/c-theme-goc`, chưa commit/push.
- `corepack pnpm exec vitest run --project unit --pool=forks --maxWorkers=2 apps/overlay/src/throne.test.ts apps/overlay/src/v3/ArenaStage.test.ts`: PASS, 2 files / 8 tests.
- Kiểm tra e2e C-0407 trên `lobby-queue`: `.v3-stage--has-throne`, ngai hiện, 30 ghế, `.v3-queue` visible và text 5 người chờ đều đạt; kiểm hit-testing 3×3 cho `.v3-queue` trả 0/9, dưới ngưỡng 5/9. Đây là vấn đề che phủ theo đúng gate; tôi không sửa CSS/layout theo chỉ thị.
- Sau khi thêm chẩn đoán hit targets và screenshot tạm, lần chạy lại không khởi động được webServer và hết 60 giây. Cùng hiện tượng khi chạy server riêng: tiến trình `tsx watch src/main.ts` vẫn sống nhưng không bind `/health` sau hơn 60 giây. Vì vậy chưa có ảnh chẩn đoán mới để đính kèm.
- Lệnh `corepack pnpm typecheck` đang chạy nhưng chưa trả kết quả trong môi trường hiện tại; các lần chạy trước đó trên worktree kết thúc PASS. Chưa chạy export/map/validate, full Vitest hoặc Playwright asset thật 2 lượt và placeholder 1 lượt.

Đề nghị coordinator chốt hướng xử lý cho gate 0/9 của K43 (không đổi layout theo yêu cầu hiện tại) và hỗ trợ xác định vì sao E2E server không bind. Chưa thể commit/push hoặc đánh dấu C-0407/C-0408 xong khi các kiểm tra bắt buộc còn thiếu.
