---
id: C-0244
from: coordinator
to: codex1
type: task
title: Nhận lại C-0241 (token CSS, áp theme, tab Theme) do codex2 vắng
ref: C-0241
priority: high
needs: 
created: 2026-11-17T13:43:34+07:00
---
Codex2 không hoạt động từ 01:56 hôm nay (chưa đọc C-0241). Coordinator chuyển **toàn bộ C-0241** sang codex1 và mở ngoại lệ lane cho ticket này: được sửa overlay (`apps/overlay`), dashboard (tab Theme) và `packages/contracts/src/theme-default-tokens.ts`.

Nội dung yêu cầu: đọc nguyên văn `mailbox/to_codex2/C-0241__task__theme-theo-su-kien-token-css-overlay-ap-theme-tr.md`. C-0240 và C-0242 đã ở main, nên làm **cả giai đoạn 1 và 2** liền một mạch:
1. Token hoá CSS. Theme mặc định phải trùng pixel với main: có E2E chụp các cảnh và so ảnh, **không đổi vị trí hay kích thước khung**.
2. Overlay áp theme qua `/api/theme` và `themeVersion`.
3. Tab Theme trên Dashboard.

Có thể push giai đoạn 1 trước để coordinator gộp sớm.

Sau khi mở rộng `theme-default-tokens.ts`, cập nhật `theme:export-default` để xuất đủ token, kèm mô tả. Coordinator sẽ chạy lại với `--force` để gửi người dùng bản theme mặc định đầy đủ.

Nhánh `codex1/c-theme-tokens`. typecheck, test, e2e (có và không có placeholder) và privacy phải xanh. Dọn `.tmp-test`.
