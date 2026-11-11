---
id: C-0019
from: coordinator
to: codex2
type: task
title: C-0016 đạt, đã gộp; C-0019 dashboard chạy trong bản desktop (token tự động qua preload)
ref: 
priority: normal
needs: 
created: 2026-11-11T12:49:46+07:00
---
# C-0016 đạt, đã gộp — C-0019: dashboard chạy trong bản desktop (Electron)

## Rà C-0016 (Y-0024): ĐẠT, đã gộp main. 128/128 test. Ảnh PREPARE đúng quyết định người dùng (chỉ câu hỏi).

## Bối cảnh mới (main `d60e7c5` + bộ cài)
- `apps/desktop`: Electron chạy server trong app, phục vụ `http://127.0.0.1:8787/dashboard/` và `/overlay/` (cùng origin). Bộ cài: `corepack pnpm dist:win`.
- Preload lộ `window.stormArena` (chỉ có trong bản desktop):
  - `getAdminToken(): Promise<string | null>` — mã quản trị (chỉ trả cho trang /dashboard/ của app);
  - `getInfo(): Promise<{ version: string; overlayUrl: string; dataDir: string }>`.
- Lưu ý: khi bạn chạy `corepack pnpm dev` (server cổng 8787) thì bản desktop báo "cổng đang bị dùng" — bình thường.

## C-0019 (làm cùng/sau C-0018). Phạm vi: `apps/dashboard/**`, `apps/overlay/**`
1. Dashboard: nếu có `window.stormArena` → tự lấy token bằng `getAdminToken()`, **ẩn ô nhập mã quản trị**; không lưu token vào storage khi chạy desktop. Không có → giữ cách nhập như hiện tại (dev).
   Khai báo kiểu `declare global { interface Window { stormArena?: … } }` trong dashboard.
2. Trang "Phát lên OBS" (C-0018): Overlay URL lấy từ `stormArena.getInfo().overlayUrl` nếu có, ngược lại suy từ `location` (dev: :5174, cùng origin: `/overlay/`).
   Hiển thị phiên bản app + nút "Mở thư mục dữ liệu" (chỉ khi desktop — dùng `overlayUrl`/`dataDir` để hiển thị, mở thư mục để sau).
3. Overlay khi phục vụ dưới `/overlay/`: mọi đường dẫn tài nguyên tương đối theo `import.meta.env.BASE_URL`; `?mock=`, `?guides=1` vẫn chạy.
4. Unit test cho nhánh có/không có `window.stormArena`.
Tiêu chí: `corepack pnpm desktop` (bundle + mở app) → dashboard vào thẳng không hỏi token, tạo phiên MOCK và chạy được 1 câu; ghi ảnh local + lệnh vào report.
(Nhớ dừng `corepack pnpm dev` trước khi chạy desktop vì cùng cổng 8787.)
