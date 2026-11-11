---
id: C-0018
from: coordinator
to: codex2
type: task
title: C-0007 đạt, đã gộp; C-0018 Connection Test + Connection Manager + hướng dẫn OBS (sau C-0016)
ref: 
priority: high
needs: 
created: 2026-11-11T12:18:04+07:00
---
# C-0007 đạt, đã gộp — giao C-0018: Connection Test + Connection Manager + hướng dẫn OBS (V3.1 mục C/D/E)

## Rà C-0007 (Y-0020)
Đã gộp `9bbcda0`: build OK, `corepack pnpm test` 124/124. Hợp đồng server đổi trong lúc bạn làm → coordinator vá tối thiểu
`apps/dashboard/src/api/mockClient.ts` (thêm `optionsVisible`, `mc`, `live`, `overlay`, có `TODO(codex2, C-0016)`) và `logic.test.ts`. Làm đầy đủ trong C-0016.
**Lỗi nhỏ:** ảnh `accepting.png` có nút **"Tiếp"** lúc ACCEPTING — engine không cho `MANUAL_NEXT` ở ACCEPTING (chỉ PREPARE/REVEAL/LEADERBOARD/ROUND_END/VICTORY/INTERMISSION). Sửa `actionsFor` + test.

## C-0018 (làm sau C-0016). Phạm vi: `apps/dashboard/**`, `apps/overlay/**`
Server đã có (main `2999f2a`, xem `docs/API_CONTRACT.md` bảng HTTP + mục 8–9):
`POST /api/sessions/:id/source {CONNECT|DISCONNECT|RECONNECT}`, `GET /api/system/checks`, `POST /api/system/selftest`, `AdminSnapshot.live`, `AdminSnapshot.overlay`, WS `ACK`.

1. **Overlay gửi ACK**: sau mỗi lần render xong một snapshot (sau commit DOM, ví dụ `useEffect`), gửi `{ type: 'ACK', stateVersion }`. Không gửi khi đang ở `?mock=`.
2. **Trang "Kiểm tra kết nối"** (dashboard): 9 bước đúng thứ tự `checks[]`, mỗi bước nhãn + `PASS`/`FAIL`/`NOT_TESTED` (màu xanh/đỏ/xám) + `detail`;
   nút "Chạy tự kiểm" (`POST /api/system/selftest`) và "Làm mới"; tự làm mới 5 s khi trang mở. Không bao giờ hiển thị PASS khi server trả khác.
3. **Connection Manager** (khối trong Live Control hoặc trang riêng): nguồn (`live.source`), trạng thái, kết nối từ lúc nào, **comment gần nhất (x giây trước)**,
   tổng comment, số lần reconnect, `detail` lỗi; nút Kết nối / Ngắt / Kết nối lại (`/source`). Cảnh báo vàng nếu đang ACCEPTING mà > 10 s không có comment nào.
   Ô "TikTok username" hiển thị nhưng **vô hiệu** với ghi chú "Kết nối TikTok chưa được duyệt — xem docs/TIKTOK_CONNECTOR_SPIKE.md". Không viết code kết nối TikTok.
4. **Trang "Phát lên OBS / TikTok LIVE Studio"**: Overlay URL (`http://127.0.0.1:5174/` khi dev; đọc từ `location` để sau này đóng gói vẫn đúng), nút **Copy**, nút Xem trước;
   hướng dẫn từng bước: OBS Browser Source (1080×1920, tắt "Shutdown source when not visible" nếu cần giữ kết nối), phương án **Window Capture** dự phòng,
   TikTok LIVE Studio (thêm nguồn trình duyệt/cửa sổ — ghi "cần kiểm tra trên máy thật", không khẳng định), số overlay đang kết nối (`overlay.clients`) kèm câu
   "Chỉ cho biết overlay đang mở, không xác nhận phần mềm phát đang lên sóng".
5. Unit test logic (ánh xạ trạng thái → màu/nhãn, "x giây trước", cảnh báo im lặng). Ảnh local 3 trang.

Tiêu chí: build + typecheck + `corepack pnpm test` xanh; chạy với server thật (`corepack pnpm dev`) — bước 1, 2, 4, 5, 8, 9 phải PASS khi overlay mở và đã chạy tự kiểm; dán output `GET /api/system/checks` vào report.
