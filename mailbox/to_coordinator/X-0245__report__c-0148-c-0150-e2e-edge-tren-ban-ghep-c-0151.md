---
id: X-0245
from: codex1
to: coordinator
type: report
title: C-0148/C-0150: E2E Edge trên bản ghép C-0151
ref: C-0150
priority: normal
needs: 
created: 2026-11-13T00:02:56+07:00
---
C-0148 / C-0150 — kết quả kiểm chứng E2E

Nhánh đã push: `codex1/c0085-long-content`, HEAD `afdb022` (các commit liên quan: `d4f1664`, `b626c41`, `afdb022`). Bộ kiểm thử tích hợp chạy trong worktree tạm, detached từ Codex2 `dd44a20` (C-0151), ghép nhánh Codex1 bằng `git merge --no-commit --no-ff`; không commit hoặc push worktree tích hợp.

Lệnh chạy Edge, assets thật (đã bỏ `CI`):
`$env:QUIZ_ASSETS_DIR='E:\Ai\2026\Trend mini game tiktok\assets-local'; $env:PLAYWRIGHT_SERVER_PORT='18825'; $env:PLAYWRIGHT_OVERLAY_PORT='15214'; corepack pnpm exec playwright test --reporter=line`
Kết quả: **57 passed, 4 failed / 61** (Edge). Lệnh thoát 1 do các assert sản phẩm bên dưới.

Lệnh chạy Edge, assets giữ chỗ:
`$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:PLAYWRIGHT_SERVER_PORT='18826'; $env:PLAYWRIGHT_OVERLAY_PORT='15215'; corepack pnpm exec playwright test --reporter=line`
Kết quả: **56 passed, 4 failed, 1 skipped / 61** (Edge). Skip là C-0062 không chạy với assets giữ chỗ.

Các lỗi chung còn lại (`it.fails`, thuộc overlay Codex2):
- Top10 render tên dài thành 24 grapheme, vượt giới hạn 16; có dấu ellipsis nhưng chưa cắt theo mốc.
- Victory: tên dài bị tràn chiều cao (`scrollHeight 27px`, `clientHeight 24px`); test tên 16 grapheme cũng ghi nhận một trường hợp không vừa chiều rộng.
- Top10 trong test geometry kết thúc tại y=811 (y=345, cao 466px), lệch 4px so với mốc C-0133 y=815 đã giao.

Các kiểm tra prompt 160 / đáp án 45, nền `bg-question-user.jpg`, không cờ rời, và các test còn lại đều qua. Preflight in cảnh báo không chặn cho 15 câu demo vượt ngưỡng. `corepack pnpm typecheck` trên cây tích hợp: **PASS**. `corepack pnpm typecheck` trên nhánh Codex1 sau cập nhật test: **PASS**. Full unit suite trước đó trên nhánh Codex1: **323/323 PASS**. Smoke Edge local và smoke Chromium CI cũng đã PASS.

Đã cập nhật test để bỏ ba trường hợp DEMO vượt giới hạn hiển thị đã được thay bằng bộ 160/45, bỏ kích thước hàng đáp án cố định 64px, và đo geometry bắt đầu từ pha chuẩn bị câu hỏi. Test vẫn giữ đúng mốc 16 grapheme và y=815 nên còn phản ánh các lỗi overlay phía trên.
