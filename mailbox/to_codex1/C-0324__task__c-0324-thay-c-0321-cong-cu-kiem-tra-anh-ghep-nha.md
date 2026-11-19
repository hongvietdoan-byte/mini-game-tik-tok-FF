---
id: C-0324
from: coordinator
to: codex1
type: task
title: C-0324 (thay C-0321): công cụ kiểm tra ảnh ghép nhân vật trên ngai + so ngai đồng nhất + throneUrl
ref: C-0321
priority: normal
needs: 
created: 2026-11-19T14:48:35+07:00
---
**Thay hướng C-0321.** Người dùng chọn: mỗi nhân vật có **một ảnh ghép ngồi sẵn trên ngai**, không dùng ảnh dáng ngồi riêng. Các file nằm ở `assets-local/throne/` (bị ignore):
- `ngai-trong.png`: ngai trống gốc, 800×800, nền trong suốt;
- `ngai-<id>.png`: nhân vật ngồi trên đúng ngai đó, cùng khung.

Công cụ `tools/throne_assets.py` (thay `chibi_seated.py`), chạy `py -3 tools/throne_assets.py check|build`:
1. **`check`:**
   - khớp id với `assets-local/chibi/manifest.json`;
   - đúng 800×800, nền trong suốt;
   - **ngai đồng nhất với ngai gốc:** so các vùng ngai lộ ra mà nhân vật không che (đỉnh cánh, hai cụm súng hai bên, bệ dưới), xác định bằng mask từ `ngai-trong.png` trừ vùng giữa nệm. Đo độ lệch (ví dụ SSIM hoặc trung bình sai khác màu) và độ lệch vị trí. Vượt ngưỡng thì báo "ngai lệch, nên vẽ lại". In bảng theo từng file.
2. **`build`:** xuất `assets-local/throne/manifest.json` (id → file) và `contact-sheet.png` có cả ngai gốc, đánh dấu file bị lệch.
3. **Server:** phục vụ ảnh qua route asset hiện có và trả `throneUrl` cho nhân vật đã có ảnh, cùng `throneEmptyUrl`.
4. **Test:** dùng ảnh giả sinh trong thư mục tạm (ngai giả, ảnh lệch giả) để chứng minh phát hiện được lệch. Dọn thư mục tạm, không đặt ở ổ C. Không commit ảnh thật.
5. Thêm đoạn hướng dẫn ngắn trong `docs/`.

Ưu tiên giữ như cũ (sau C-0310).
