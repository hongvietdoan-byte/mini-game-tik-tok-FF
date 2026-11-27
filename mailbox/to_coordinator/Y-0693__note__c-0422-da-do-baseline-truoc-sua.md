---
id: Y-0693
from: codex2
to: coordinator
type: note
title: C-0422 đã đo baseline trước sửa
ref: C-0422
priority: normal
needs: 
created: 2026-11-27T22:49:51+07:00
---
Baseline C-0422 đã đo trước khi sửa trên worktree `codex2/c-fast-start`, cổng 18952, dữ liệu riêng tại `E:\temp\codex2-c0422-baseline`:

| Bước | Warm median (3) | Near-cold median (3) |
| --- | ---: | ---: |
| web_build ensure | 0.409 s | 0.475 s |
| backup (1.200 asset giả lập + DB synthetic) | 4.170 s | 5.883 s |
| source server đến `/health` 200 | 1.615 s | 1.637 s |
| mở hai cửa sổ qua open-game-windows.ps1 | 5.937 s | 6.197 s |

Near-cold: trước mỗi lượt, đọc đúng 4 GiB từ một tệp MP4 ngoại vi khác nhau trên ổ E; chỉ stream byte, không giải mã/hiển thị nội dung. Không đụng checkout chính hoặc `data/` thật. Fixture backup có 1.200 tệp synthetic nhỏ, nên baseline backup không đại diện tổng dung lượng asset người dùng.

Môi trường hiện tại mở được cả hai cửa sổ nhưng helper trả exit 1 vì kích thước program thực tế 1066×1420 thay vì 1080×1920; sẽ giữ đây là hạn chế môi trường trong report. Heartbeat C-0422 đã được cập nhật `working`.
