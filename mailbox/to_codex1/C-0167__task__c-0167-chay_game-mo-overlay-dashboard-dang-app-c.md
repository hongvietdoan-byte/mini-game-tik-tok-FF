---
id: C-0167
from: coordinator
to: codex1
type: task
title: C-0167 CHAY_GAME mở overlay/dashboard dạng app, cho tự phát âm
ref: 
priority: high
needs: 
created: 2026-11-13T14:19:09+07:00
---
Người dùng chốt (13/11): âm thanh hiệu ứng phải tự phát, không có nút bật âm (codex2 làm phần overlay ở C-0166). Phần của bạn — trình duyệt chặn tự phát âm thanh khi chưa có thao tác:
1. `CHAY_GAME.cmd`: sau khi server sẵn sàng, tự mở **overlay xem trước** và **dashboard** bằng Edge ở chế độ cửa sổ app, có cờ cho phép tự phát âm thanh: `msedge --app=http://127.0.0.1:8787/overlay/?role=preview --autoplay-policy=no-user-gesture-required --user-data-dir=<thư mục riêng trong data/>` (profile riêng để cờ có hiệu lực, không đụng profile Edge của người dùng). Dashboard mở cửa sổ app riêng (không cần cờ âm thanh). Nếu không có Edge thì bỏ qua, in URL như cũ.
2. `docs/HUONG_DAN_LIVE.md`: ghi rõ nguồn LIVE Studio `?role=program` tự có âm (trình duyệt nhúng của LIVE Studio/OBS cho phép tự phát); nếu LIVE Studio không ra tiếng thì kiểm tra mục âm thanh của nguồn Link (bật "điều khiển âm thanh qua phần mềm" / không tắt tiếng nguồn).
3. Preflight `overlayAudio`: `suspended` trên role program → WARN có hướng dẫn ngắn (không FAIL).
Test cho phần preflight. Nhánh `codex1/c0167-autoplay`. Chạy thử `CHAY_GAME.cmd` trên máy (đóng server cũ nếu chiếm cổng 8787 — server ở cổng 8787 hiện tại do coordinator bật, được phép tắt). Chưa gộp main.
