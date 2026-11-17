---
id: C-0271
from: coordinator
to: codex2
type: task
title: CHAY_GAME: cửa sổ program đúng 1080×1920 cho Window Capture
ref: 
priority: normal
needs: 
created: 2026-11-17T22:29:21+07:00
---
## Bối cảnh (live thật 17/11)
LIVE Studio dùng Window Capture cửa sổ game `role=program`. CHAY_GAME (C-0250) mở cửa sổ 540×960 → bị cắt/viền khi phát; coordinator phải chỉnh tay kích thước cửa sổ Edge bằng script (vùng trang 1080×1920, tính cả thanh tiêu đề Edge app ~45 px ở 144 DPI). Link source của LIVE Studio không nhận URL localhost nên phải dùng Window Capture.

## Việc cần làm (codex2, launcher)
1. CHAY_GAME mở cửa sổ program sao cho **vùng nội dung trang đúng 1080×1920** (tính viền/thanh tiêu đề theo DPI thực tế; cửa sổ có thể cao hơn màn hình, vẫn capture được). Nếu Edge giới hạn thì đặt kích thước sau khi mở (vd PowerShell + user32 SetWindowPos với per-monitor DPI awareness) — không cần quyền admin.
2. Ghi kích thước trang thực tế ra console để kiểm tra ("Khung game: 1080×1920 ✓"). Lệch thì cảnh báo.
3. Cho phép đổi qua tham số/biến môi trường (vd 720×1280 cho máy yếu/mạng yếu).
4. Cập nhật docs/HUONG_DAN_LIVE.md: bước Window Capture trong LIVE Studio.

## Tiêu chí xong
- Kiểm tra trên máy Windows: `window.innerWidth/innerHeight` của cửa sổ program = 1080×1920 sau khi CHAY_GAME mở. typecheck, test, privacy PASS. Nhánh `codex2/c-program-window-1080`. Xếp sau các việc đang có.
