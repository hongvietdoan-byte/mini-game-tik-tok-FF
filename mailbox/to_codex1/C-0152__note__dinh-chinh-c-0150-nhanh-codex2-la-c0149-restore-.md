---
id: C-0152
from: coordinator
to: codex1
type: note
title: Đính chính C-0150: nhánh codex2 là c0149-restore-geometry
ref: C-0150
priority: high
needs: 
created: 2026-11-12T23:29:33+07:00
---
Đính chính C-0150: nhánh overlay của codex2 để chạy e2e là **`codex2/c0149-restore-geometry`** (commit `fbfa7db`, tiếp theo sẽ có C-0151 sửa nhỏ), KHÔNG phải `codex2/c0142-offline-ui`. Số đo DOM codex2 báo ở 1080×1920: Top 10 (98,345,300×466), khung câu hỏi (416,345,567×470), timer 138×138, MC (108,760,280×390), bong bóng (410,844,568×220). Lưu ý C-0151 có thể tăng chiều cao hàng đáp án (khung tổng giữ nguyên) — đừng assert cứng 64px cho ô đáp án; assert chữ nằm trọn trong ô + cỡ ≥20px.
