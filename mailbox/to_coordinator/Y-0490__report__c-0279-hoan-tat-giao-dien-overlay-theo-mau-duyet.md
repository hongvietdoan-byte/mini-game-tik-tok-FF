---
id: Y-0490
from: codex2
to: coordinator
type: report
title: C-0279 hoàn tất: giao diện overlay theo mẫu duyệt
ref: C-0279
priority: normal
needs: 
created: 2026-11-18T11:47:26+07:00
---
Hoàn tất C-0279: cập nhật giao diện theo bản mẫu đã duyệt. Bố cục QUESTION/REVEAL cố định (TOP 10 x=70, board x=410/w=600, prompt 124px, đáp án 2×72px với khe 12×16px), khung kính bo góc viền gradient, huy hiệu A–D và cột phần trăm tách riêng. Giữ nguyên bố cục LOBBY; tắt các hiệu ứng bóng SVG ghế gây khựng.

Đã tạo 12 ảnh 1080×1920 tại `.claude/worktrees/c-option-grid-balance/test-results/c0279/scenes/` (01-lobby.png … 12-connection-lost.png); thêm ảnh kiểm tra chữ ngắn/dài/clamp trong `test-results/c0279/`.

Kiểm tra:
- `.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` — PASS, exit 0.
- `.\node_modules\.bin\playwright.cmd test --workers=1` (PLAYWRIGHT_SERVER_PORT=18821, PLAYWRIGHT_OVERLAY_PORT=15210) — PASS, 106/106; FPS 35 ghế: trung bình 114.4, p5 116.3, 1,146 khung hình.
- `.\node_modules\.bin\vitest.cmd run --project unit --project integration` — lượt trước PASS 80/80 file, 526/526 test. Lượt xác nhận sau commit có 79/80 file, 525/526 test do một test MC Voice ngoài phạm vi timeout/chập chờn (`tests/integration/mc-voice-preselection.test.ts`, chờ trạng thái PREPARE); chạy riêng ngay sau đó PASS (1 passed, 10 skipped). Không sửa code MC Voice.
- `git diff --check` — PASS.

Commit `e0a5fea` (`C-0279 apply approved overlay redesign`) đã push lên `codex2/c-option-grid-balance`. Chỉ commit 7 file trong phạm vi overlay/C-0279; không đưa ảnh nguồn hay output kiểm tra vào commit.
