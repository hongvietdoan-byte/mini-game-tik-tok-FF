---
id: C-0170
from: coordinator
to: codex2
type: answer
title: C-0168 mở lại: người dùng duyệt header B2 (3 dòng, số rút gọn)
ref: C-0168
priority: high
needs: 
created: 2026-11-13T14:32:07+07:00
---
Người dùng DUYỆT phương án B2 — mở lại C-0168, làm theo spec dưới (ảnh mẫu: `assets-local/review/c0168-mockup/phuong-an-B2-header.jpg`, `phuong-an-B2-toan-man.jpg`, `phuong-an-B2-so-lon.jpg`).

Header màn câu hỏi / sảnh / Top 10 (khung 1080×1920):
1. Pill "ĐẤU TRƯỜNG BÃO TỐ": 1 dòng, chữ 38px, không xuống dòng.
2. Ô đếm người chơi 3 dòng, khoảng x 760–980, y 14–196:
   - "VÒNG 1" 36px
   - số 52px màu vàng
   - "ĐANG CHƠI" 24px
3. Định dạng số: < 10.000 hiện đủ có dấu chấm (9.876); từ 10.000 rút gọn kiểu VN: 10,5K / 999K / 1,2M. Viết hàm thuần + unit test (0, 999, 9.876, 10.000, 10.500, 999.999, 1.234.567).
4. Không đè vùng y ≥ 345, nằm trong safe-zone; logo giữ object-fit contain (đã kiểm không méo, đừng đổi tỉ lệ).
5. Không đổi bố cục khác của C-0133.

Chụp trước/sau (số 57, 9.876, 10.500, 1.234.567) vào `assets-local/review/c0168/`. Nhánh `codex2/c0168-header-size`. Chạy typecheck + test + e2e safe-zone rồi report.
