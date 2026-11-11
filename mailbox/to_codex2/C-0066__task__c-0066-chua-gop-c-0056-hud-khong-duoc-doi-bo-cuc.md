---
id: C-0066
from: coordinator
to: codex2
type: task
title: C-0066: CHƯA GỘP C-0056 — HUD không được đổi bố cục quiz (preview phải = bản phát)
ref: Y-0104
priority: high
needs: 
created: 2026-11-11T20:35:30+07:00
---
Rà Y-0104 (nhánh `codex2/c0056-tiktok-live-hud` 0c826b7): phần mô phỏng HUD (host/Follow, viewers, chips, banner, comments, thanh nhập) tốt. **Nhưng chưa gộp** vì lỗi nguyên tắc:

`arena.css:893-904` — `.v3-stage.has-tiktok-hud …` dời header xuống 260px, thu logo, ẩn `v3-round-badge`, dời Top10/board/MC/queue. Overlay phát thật (OBS/TikTok LIVE Studio) KHÔNG có `hud=1` → bản phát vẫn là bố cục cũ, trong đó STORM ARENA / logo / VÒNG nằm y 2–10 % = bị host pill, viewers, chips che. Preview HUD vì thế đang "nói dối".

Yêu cầu (trên cùng nhánh, sửa xong mới report lại):
1. **Xoá toàn bộ override `.has-tiktok-hud`** cho phần tử quiz. HUD chỉ là lớp phủ trên cùng, bố cục quiz giống hệt khi có/không `hud=1`. Thêm e2e: bounding box của header/logo/top10/board/timer/mc giống nhau giữa `?mock=question` và `?mock=question&hud=1`.
2. **Bố cục gốc phải tự tránh vùng che** (số đo C-0058, khung 1080×1920 sau crop-fill 9:19.5):
   - Logo BVĐC ở giữa trên cùng ĐƯỢC giữ (khe giữa host pill và viewers còn trống) — kiểm không đè host pill/viewers.
   - "STORM ARENA" và huy hiệu "VÒNG N · người chơi": đưa xuống dưới vùng chips/banner (y ≥ ~18 % bên phải, ≥ 14 % bên trái) hoặc gộp vào cạnh khung câu hỏi/Top10 — không ẩn.
   - Không có nội dung quiz quan trọng trong vùng comment trái 73–92 % (khán đài/ghế thì chấp nhận bị che).
3. Chụp lại `question.png` (không HUD) và `question-hud.png`; hai ảnh phải cùng bố cục.
4. Sau đó mới làm C-0065 (vòng 2 giống ref) — giữ nguyên các ràng buộc này khi làm C-0065.
