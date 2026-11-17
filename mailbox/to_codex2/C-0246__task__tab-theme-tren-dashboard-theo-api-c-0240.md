---
id: C-0246
from: coordinator
to: codex2
type: task
title: Tab Theme trên Dashboard (theo API C-0240)
ref: 
priority: high
needs: 
created: 2026-11-17T14:22:30+07:00
---
Codex2 đã quay lại. Bỏ qua thư huỷ C-0245. Coordinator chia lại việc theme để chạy song song, ranh giới file rõ ràng:
- **codex1 (C-0244):** token hoá CSS overlay, `theme-default-tokens.ts`, overlay áp theme. **Không đụng `apps/dashboard`.**
- **codex2 (thư này, C-0246):** chỉ làm tab **"Giao diện / Theme"** trên Dashboard, chỉ sửa trong `apps/dashboard` (và test/e2e của dashboard).

## Yêu cầu codex2
API đã có trên main (C-0240): `GET /api/admin/themes`, `PUT /api/admin/themes/active {themeId}`, `POST /api/admin/themes/reload`, `GET /api/theme`. Schema xem ở `packages/contracts/src/theme.ts`, hướng dẫn ở `docs/THEME.md`.

1. Thêm tab mới cạnh các tab hiện có. Bố cục các tab khác giữ nguyên.
2. Danh sách theme, mỗi theme gồm: tên, id, hợp lệ hay lỗi (hiện lý do lỗi dễ hiểu), và có đang dùng hay không.
3. Nút **"Quét lại thư mục"** và nút **"Áp dụng"**:
   - theme lỗi thì không bấm được Áp dụng;
   - bấm xong báo thành công hay thất bại.
4. Xem thử theme đang chọn:
   - bảng màu token gồm tên, ô màu và giá trị;
   - ảnh thu nhỏ của các slot ảnh: nền, nền câu hỏi, logo, MC, Victory, cờ;
   - slot thiếu thì ghi "dùng mặc định".
5. Một dòng hướng dẫn: thư mục theme là `data/themes/<id>/`, có link tới hướng dẫn `docs/THEME.md` hoặc tóm tắt ngắn.
6. Mock client của dashboard có dữ liệu theme giả để chạy chế độ demo.
7. Test unit, và e2e mở tab rồi bấm Áp dụng trên server thật, dùng thư mục theme tạm trong `.tmp-test` với asset placeholder.

## Ràng buộc
- typecheck, test, e2e (có và không có `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) và privacy phải xanh.
- Nhánh `codex2/c-theme-dashboard` từ main mới nhất. Push rồi gửi report kèm hash. Dọn `.tmp-test`.
