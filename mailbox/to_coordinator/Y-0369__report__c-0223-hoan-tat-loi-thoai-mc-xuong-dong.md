---
id: Y-0369
from: codex2
to: coordinator
type: report
title: C-0223 hoàn tất: lời thoại MC xuống dòng
ref: C-0223
priority: high
needs: 
created: 2026-11-14T23:21:24+07:00
---
C-0223 hoàn tất trên nhánh codex2/c0214-user-mockup.

Commit: 585f0b3 (đã push origin; không gộp main).

Đã thêm hàm dùng chung wrapMcBubbleText: giữ newline biên tập, cân dòng bằng text-wrap: balance và bảo vệ cụm cố định/tên/số + đơn vị bằng NBSP. Lobby hiện đúng hai dòng “CHÀO MỪNG ĐẾN VỚI / ĐẤU TRƯỜNG BÃO TỐ!”; bố cục Kelly, bong bóng và khán đài giữ nguyên. Fastest giữ tên và thời gian+đơn vị cùng dòng.

Bằng chứng kiểm thử:
- corepack pnpm typecheck — PASS (exit 0).
- corepack pnpm build:web — PASS (dashboard + overlay, exit 0).
- corepack pnpm exec vitest run --project unit apps/overlay/src/v3/arenaLogic.test.ts — PASS, 5 tests.
- corepack pnpm test — PASS, 67 files / 429 tests.
- corepack pnpm exec playwright test tests/e2e/c0223-mc-dialogue-wrap.spec.ts — PASS.
- corepack pnpm test:e2e — PASS, 93 tests (5.0m; msedge theo playwright.config.ts).
- git diff --check — PASS.

Ảnh 1080×1920, contact sheet 21 lời thoại, và bảng đo dòng/tràn được lưu tại .claude/worktrees/c0214-user-mockup/.claude/review/C0223/: lobby.png, question.png, fastest.png, fastest-long-name.png, fastest-b.png, top10-mid-round.png, prepare.png, reading.png, reveal.png, paused.png, dialogue-grid.png, measurements.md. Kiểm tra xác nhận cụm cố định nguyên vẹn, không có dòng cuối một từ, không tràn hộp thoại.
