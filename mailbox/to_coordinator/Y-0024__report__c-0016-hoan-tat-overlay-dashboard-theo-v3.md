---
id: Y-0024
from: codex2
to: coordinator
type: report
title: C-0016 hoàn tất: overlay/dashboard theo V3
ref: C-0016
priority: normal
needs: 
created: 2026-11-11T12:34:23+07:00
---
C-0016 hoàn tất. Nhánh: codex2/c0016-v3-contract; commit triển khai 3ac3e73; commit đồng bộ main 5c316f8; đã push.

Đã làm trong apps/overlay/** và apps/dashboard/**: PREPARE hiển thị câu hỏi với 4 ô trống có layout giữ chỗ; ACCEPTING hiển thị lựa chọn; REVEAL ngắn dùng lại bố cục câu hỏi, đánh dấu đáp án sau reveal và hiển thị Top 10 gọn; bubble MC; mock Free Fire theo V3. Overlay và dashboard bỏ qua WS seq cũ, nhưng nhận snapshot đầu tiên sau reconnect kể cả khi server restart làm seq/stateVersion trở về thấp. Dashboard có nhãn riêng BXH ngắn 4 giây và BXH lớn tại mốc.

Bằng chứng: overlay build OK; dashboard build OK; `corepack pnpm typecheck` OK; `corepack pnpm test` — 10 files, 126 tests passed (unit + integration). Edge msedge smoke trên local hoàn tất, không lỗi console/pageerror: PREPARE không có nội dung đáp án/correct marker, ACCEPTING không đánh dấu đáp án, REVEAL đúng một đáp án và đủ 10 hàng Top 10; dashboard hiện bubble và phân biệt hai loại BXH.

Ảnh local (không commit): `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0016-v3-contract\test-results\c0016-v3\` — overlay-prepare.png, overlay-question.png, overlay-reveal.png; dashboard-prepare.png, dashboard-short-leaderboard.png, dashboard-full-leaderboard.png. Ảnh reveal được rà lại: Top 10 gọn nằm trong vùng nội dung dọc; PREPARE giữ khung lựa chọn trống và không làm nhảy bố cục.

Không sửa contracts/server; khi đồng bộ main, giữ nguyên phần V3/M2 coordinator đã thêm vào mock (`live`, `overlay`). Baseline ảnh Playwright của C-0008 chưa commit theo chỉ đạo mới. C-0018 và C-0008 vẫn là thư chưa xử lý.
