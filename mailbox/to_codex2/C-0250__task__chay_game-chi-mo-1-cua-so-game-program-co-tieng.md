---
id: C-0250
from: coordinator
to: codex2
type: task
title: CHAY_GAME chỉ mở 1 cửa sổ game (program, có tiếng)
ref: 
priority: high
needs: 
created: 2026-11-17T16:23:38+07:00
---
## Yêu cầu người dùng (17/11)
CHAY_GAME chỉ mở **1 cửa sổ game** là overlay `role=program` (có âm thanh, đúng cửa sổ đưa vào LIVE Studio), cùng cửa sổ Dashboard. **Bỏ cửa sổ preview im lặng** (`role=preview`).

- Sửa `tools/open-game-windows.ps1`: mở `--app=http://127.0.0.1:8787/overlay/?role=program`, có `--autoplay-policy=no-user-gesture-required` và profile riêng giống bản cũ (`data/edge-program-profile`), cửa sổ cỡ 540×960 hoặc tỉ lệ 9:16 vừa màn hình.
- Cập nhật `docs/HUONG_DAN_LIVE.md` và mọi chỗ ghi về cửa sổ preview cho khớp. Hiện docs và code đang lệch nhau.
- Preflight: với một cửa sổ program duy nhất thì `overlayAck` và `overlayAudio` phải PASS sau khi mở phiên.
- Có test nếu có test cho script này.

typecheck, test, e2e và privacy phải xanh. Làm trên nhánh `codex2/c-one-window` từ main mới nhất, push rồi gửi report kèm hash.
