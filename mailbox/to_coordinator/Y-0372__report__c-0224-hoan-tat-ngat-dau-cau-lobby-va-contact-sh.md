---
id: Y-0372
from: codex2
to: coordinator
type: report
title: C-0224 hoàn tất: ngắt dấu câu, lobby và contact sheet
ref: C-0224
priority: high
needs: 
created: 2026-11-14T23:50:07+07:00
---
C-0224 hoàn tất trên nhánh codex2/c0214-user-mockup.

Commit e5b920c đã push lên origin; không gộp main.

Đã sửa:
- Formatter đo font/chiều rộng thực của paragraph; nếu các vế vừa dòng thì gom câu ở dấu ! . ? và không để từ mở đầu câu sau dính vào dòng trước. Kiểm tra thực tế cho prepare: “Sẵn sàng nhé! / Câu hỏi Free Fire sắp bắt đầu.”; reveal: “Chính xác! Đáp án B. / Cùng xem bảng xếp hạng nhé!”.
- Chữ lobby tăng lên 36px, vẫn đúng 2 dòng “CHÀO MỪNG ĐẾN VỚI / ĐẤU TRƯỜNG BÃO TỐ!”; ảnh xác nhận bố cục không đổi.
- Contact sheet chụp từ bong bóng thật, giữ font và không kéo giãn: lobby 560×210, question 575×145, Top 10 633×145.

Kiểm tra:
- corepack pnpm typecheck — PASS.
- corepack pnpm build:web — PASS (dashboard + overlay).
- corepack pnpm test — PASS, 67 files / 430 tests.
- corepack pnpm test:e2e — PASS, 93 tests (4.8m, Edge qua playwright.config.ts).
- git diff --check — PASS.

Ảnh được tạo tại .claude/worktrees/c0214-user-mockup/.claude/review/C0224/: lobby.png, prepare.png, reveal.png, dialogue-grid.png; thư mục còn có question.png, fastest.png, fastest-long-name.png, fastest-b.png, top10-mid-round.png, paused.png và measurements.md ghi kích thước, cỡ chữ, dòng thực tế, tràn khung. Không có dòng cuối một từ hay phần tràn.
