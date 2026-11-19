---
id: C-0323
from: coordinator
to: codex2
type: task
title: C-0323 (thay C-0320/C-0322): ngai dùng ảnh ghép nhân vật-ngồi-trên-ngai do người dùng tạo, không vẽ SVG
ref: C-0320
priority: normal
needs: 
created: 2026-11-19T14:48:27+07:00
---
**Thay hướng C-0320/C-0322.** Người dùng chọn: **vẽ sẵn từng nhân vật ngồi trên ngai (ảnh ghép), ai lên Top 1 thì thay nguyên ảnh.** Không vẽ ngai bằng SVG nữa, bỏ phương án 2 lớp.

## Asset (người dùng tự tạo, nằm ở `assets-local/throne/`, bị ignore)
- `ngai-trong.png`: ngai trống gốc, nhìn thẳng, nền trong suốt, khung 800×800.
- `ngai-<id>.png`: nhân vật ngồi trên đúng ngai gốc, cùng khung 800×800, ngai cùng vị trí. Ví dụ `ngai-chibi-007-caroline.png`.
- Server trả `throneUrl` theo nhân vật (Codex 1 làm ở C-0324).

## Overlay (giai đoạn 1 vẫn chỉ là ảnh mẫu để duyệt)
- Một khung ảnh ngai trong vùng đã đo (y khoảng 966–1176, mép trái ≥ 358; bóng thoại MC rút còn 2 dòng như C-0320).
- **Có `throneUrl`:** hiện ảnh ghép.
- **Chưa có ảnh của nhân vật đó:** hiện `ngai-trong.png`, chibi dáng đứng **đứng trước ngai** (không che chân).
- **Chưa có Top 1 (sảnh):** ngai trống và dòng "NGAI VÀNG ĐANG CHỜ CHỦ".
- **Đổi chủ:** crossfade khoảng 600 ms giữa hai ảnh, ánh vàng loé, nhãn "NGAI VÀNG ĐÃ ĐỔI CHỦ" khoảng 2 s.
- **Bên phải ngai:** nhãn "NGAI VÀNG", tên Top 1, điểm. Giữ đúng các quy tắc chữ và khoảng hở như C-0320.
- Chưa có ảnh thật thì dùng ảnh giả tự sinh (khối vàng hình ngai + chibi đứng chồng lên) để duyệt bố cục. Ghi rõ đó là ảnh giả.

## Ảnh mẫu cần gửi
Giống C-0320 mục 1–4, bỏ mục 5 (SVG). Thêm một ảnh trạng thái "nhân vật chưa có ảnh ghép".
