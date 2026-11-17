---
id: C-0241
from: coordinator
to: codex2
type: task
title: Theme theo sự kiện: token CSS overlay, áp theme, trang chọn theme
ref: 
priority: high
needs: 
created: 2026-11-17T12:09:08+07:00
---
## Bối cảnh
Người dùng muốn **đổi theme theo sự kiện**: mỗi sự kiện họ chỉ cần thay một gói theme (schema JSON, token CSS, asset), không phải sửa code. Codex1 làm phần schema, server và CLI ở C-0240, nhánh `codex1/c-theme-server`. Quy ước chung xem trong thư C-0240 (đọc kỹ):
- gói theme: `data/themes/<id>/theme.json` cùng `assets/` và `fonts/`
- token `key` → biến CSS `--theme-<key>`
- slot asset là danh sách đóng
- API `GET /api/theme`, `themeVersion` gửi qua WS

## Yêu cầu codex2 (C-0241)
**Giai đoạn 1 (làm ngay, không phụ thuộc codex1): chuyển CSS overlay sang token.**
1. Rà `apps/overlay/src/v3/arena.css` (khoảng 348 màu cứng) và `apps/overlay/src/style.css` (khoảng 76 màu). Gom thành bộ token ngữ nghĩa, ví dụ:
   - `bg-panel`, `text-primary`, `accent`
   - `answer-a`/`b`/`c`/`d`, `correct`, `wrong`
   - `timer`, `seat-frame`, `leaderboard-row`
   - `font-body`, `font-display`
   - các gradient chính, màu glow/shadow

   Không cần mỗi mã màu một token; các màu gần nhau dùng chung token nếu nhìn không đổi.
   Viết CSS dạng `var(--theme-xxx, <giá trị hiện tại>)`.
2. Tạo `packages/contracts/src/theme-default-tokens.ts`: map `key → giá trị hiện tại`, kèm mô tả tiếng Việt ngắn cho từng key (CLI và docs sẽ dùng). Nếu codex1 đã tạo stub thì mở rộng file đó.
3. **Bắt buộc giống hệt:** với theme mặc định, overlay phải trùng pixel với main hiện tại. Thêm E2E chụp các cảnh LOBBY, READING, ACCEPTING, REVEAL, LEADERBOARD, VICTORY và so với ảnh chụp trước khi đổi (ngưỡng rất nhỏ). **Không đổi vị trí, kích thước khung** (luật của người dùng, xem bố cục chuẩn 14/11).

**Giai đoạn 2 (sau khi C-0240 vào main, coordinator sẽ báo):**
4. Overlay tải `GET /api/theme` lúc khởi động và khi `themeVersion` đổi:
   - đặt token lên `:root`
   - nạp font bằng `FontFace`
   - thay URL asset theo slot (nền, cờ, video lặp, logo, MC, victory, audio-engine)
   - thiếu slot hoặc lỗi tải thì dùng asset gốc

   Đổi theme giữa phiên không làm vỡ cảnh đang chạy. Preview MOCK cũng phải cập nhật.
5. Dashboard có trang **"Giao diện / Theme"** (tab mới, giữ nguyên bố cục các tab khác):
   - danh sách theme, trạng thái hợp lệ hoặc lỗi kèm lý do
   - nút "Quét lại thư mục", nút "Áp dụng"
   - xem thử nhanh: bảng màu token cùng ảnh nền, logo

## Ràng buộc
- Lane codex2 (overlay, dashboard, và `theme-default-tokens.ts`). Không sửa server.
- typecheck, test, e2e (có và không có `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) và privacy phải xanh.
- Nhánh `codex2/c-theme-tokens`.
- Giai đoạn 1 xong thì push và gửi report riêng để gộp sớm. Giai đoạn 2 làm trên nhánh mới từ main.
- Dọn `.tmp-test`.
