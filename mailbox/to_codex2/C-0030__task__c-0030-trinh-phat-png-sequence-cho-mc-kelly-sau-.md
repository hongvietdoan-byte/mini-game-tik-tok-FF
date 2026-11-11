---
id: C-0030
from: coordinator
to: codex2
type: task
title: C-0030 trình phát PNG Sequence cho MC Kelly (sau C-0024) — sẵn sàng khi có frame
ref: 
priority: normal
needs: 
created: 2026-11-11T15:27:19+07:00
---
# C-0030 — Trình phát PNG Sequence cho MC Kelly (V3 §8) — sẵn sàng khi người dùng gửi frame

Người dùng sẽ làm sequence PNG cho MC sau. Việc này là chuẩn bị để khi có frame chỉ cần thả vào thư mục. Đặc tả xuất frame: `docs/ASSET_SPEC_MC_SEQUENCE.md` (đọc trước).
Ưu tiên: sau C-0024 (giao diện TikTok + duyệt câu). Phạm vi: `apps/overlay/src/v3/**`, `scripts/validate-sequences.mjs` (+ test), `packages/contracts` KHÔNG sửa.

1. `apps/overlay/src/v3/sequence/` — đọc `/assets/mc/kelly/manifest.json` (Zod schema trong overlay); không có manifest → giữ ảnh tĩnh `/assets/mc/kelly.png` như hiện tại.
2. Trình phát: **1 `<canvas>`** (không tạo `<img>` mới mỗi frame), `requestAnimationFrame` + cộng dồn delta, FPS animation độc lập FPS render; cache `ImageBitmap`/`HTMLImageElement` theo trạng thái;
   chỉ preload `idle` + trạng thái hiện tại (+ trạng thái kế nếu đoán được). `loop:false` + `then` → chuyển trạng thái khi hết frame.
3. Trạng thái theo `snapshot.mc.state`; thiếu trạng thái → `idle`; thiếu/lỗi frame → `fallback` (poster.png) rồi ảnh tĩnh — **không crash** (V3 §17-8).
4. Tab ẩn (`visibilitychange`) → dừng vẽ; hiện lại → tiếp tục theo snapshot mới. `prefers-reduced-motion` hoặc `?lowfx=1` → chỉ poster (V3 §17-9).
5. Thay `McKelly` trong `ArenaStage.tsx` dùng trình phát; giữ khung tên + bong bóng như cũ, giữ `data-testid="mc-bubble"`.
6. `scripts/validate-sequences.mjs <thư mục>`: kiểm manifest, đủ frame liên tục `0001..`, cùng kích thước, PNG có alpha (đọc IHDR color type 6), ≤ 150 KB/frame; in lỗi tiếng Việt, exit 1 khi lỗi. Test bằng PNG giả tạo trong thư mục tạm (không commit ảnh).
7. Test: unit (chọn frame theo thời gian, loop/then, fallback khi thiếu trạng thái) + e2e mock có sequence giả 3 frame tạo tạm.
Tiêu chí: build + typecheck + test + e2e xanh; khi xoá `assets-local/mc/kelly/` overlay vẫn như hiện tại; nhánh `codex2/c0030-mc-sequence`.
