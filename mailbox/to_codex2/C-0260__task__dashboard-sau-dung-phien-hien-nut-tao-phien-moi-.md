---
id: C-0260
from: coordinator
to: codex2
type: task
title: Dashboard: sau Dừng phiên hiện nút Tạo phiên mới (không cần F5)
ref: 
priority: normal
needs: 
created: 2026-11-17T21:35:07+07:00
---
## Bối cảnh (live thật 17/11)
Người dùng bấm "Dừng phiên" (STOP) → server đóng phiên (`/api/sessions/current` trả `sessionId: null`), nhưng Dashboard vẫn ở Live Control của phiên cũ: nút "Mở sảnh" bị disable (`snapshot.sessionStatus !== 'OPEN'`, apps/dashboard/src/main.tsx ~dòng 544), các nút cần lý do mờ, không có đường tạo phiên mới. Người dùng phải F5 mới thấy form tạo phiên.

## Việc cần làm (làn codex2, làm SAU C-0258)
1. Khi snapshot cho thấy phiên đã đóng (sessionStatus khác OPEN): Live Control hiện rõ "Phiên đã kết thúc" + nút chính **"Tạo phiên mới"** → ngắt subscribe phiên cũ và chuyển sang form tạo phiên (needsSession=true), giữ lại lựa chọn mode/username/Giọng MC đã lưu.
2. Ẩn hoặc disable kèm chú thích các nút điều hành của phiên đã đóng, không để nút "Mở sảnh" mờ gây hiểu nhầm.
3. Không đổi bố cục overlay.

## Tiêu chí xong
- E2E dashboard: STOP phiên → thấy "Tạo phiên mới" → bấm → form tạo phiên hiện, tạo được phiên mới không cần reload.
- typecheck, test, privacy:check, e2e dashboard PASS. Kiểm tra cuối file không có `\n` literal.
- Nhánh `codex2/c-dashboard-new-session-after-stop`, báo lại bằng thư.
