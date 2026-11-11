---
id: C-0021
from: coordinator
to: codex2
type: task
title: Gộp C-0018/0019/0008/DP3/DP4; C-0022 First-Run Setup Wizard 8 bước (+DP5)
ref: 
priority: high
needs: 
created: 2026-11-11T14:14:15+07:00
---
# C-0018, C-0019, C-0008, DP3, DP4 đạt — đã gộp main (138/138). Giao C-0022 Setup Wizard

Ghi chú gộp: main đã có bản c0018 bị `mb.py` rebase (hash khác) nên c0019 xung đột giả ở `apps/dashboard/src/main.tsx`; coordinator đã lấy bản c0019 (chứa đủ c0018). Hãy tạo nhánh mới từ `origin/main`.
Lưu ý quy trình: `mb.py` chạy trong checkout chính và tự `pull --rebase` → đừng để thay đổi chưa commit ở checkout chính.

## C-0022 — First-Run Setup Wizard (V3.1 mục B). Phạm vi: `apps/dashboard/**`
Hiện khi chưa hoàn tất thiết lập (lưu cờ ở server nếu có endpoint; tạm thời `localStorage` khoá `quiz.setupDone` là chấp nhận được — chỉ là cờ tiện ích, không chứa bí mật). Có nút "Mở lại trình hướng dẫn" trong menu.
8 bước, mỗi bước có trạng thái PASS / FAIL / BỎ QUA và nút Tiếp / Quay lại:
1. Kiểm tra hệ thống — `/health` (+ phiên bản app nếu desktop).
2. Database — bước `database` của `/api/system/checks`.
3. Theme Pack — hiện NOT_TESTED kèm giải thích (chưa triển khai), không chặn.
4. TikTok LIVE Connector — ô username **vô hiệu**, ghi rõ "Đang chờ kênh chính thức của TikTok; có thể bỏ qua để chạy offline (Mock)"; nút **Bỏ qua — chạy offline**.
5. Kiểm tra bằng Mock — nút "Chạy tự kiểm" (`POST /api/system/selftest`), PASS khi `ok`.
6. Hướng dẫn OBS / TikTok LIVE Studio — tái dùng nội dung trang OBS (URL + Copy).
7. Kiểm tra Overlay — hướng dẫn mở Overlay URL; chờ bước `overlay` + `overlayUpdated` PASS (tự làm mới 2 s); cho phép "Kiểm tra sau".
8. Hoàn tất — tóm tắt 8 bước; nếu bỏ qua TikTok ghi "Chế độ offline".
Không bao giờ hiển thị PASS khi server trả khác. Unit test logic chuyển bước / tổng hợp trạng thái.
Tiêu chí: build + typecheck + test xanh; chạy `corepack pnpm desktop` (dừng `pnpm dev` trước) đi hết wizard; ảnh local 8 bước; nhánh `codex2/c0022-setup-wizard`.

## Sau C-0022 (việc dự phòng DP5)
DP5: trang **Duyệt câu hỏi** chỉ-đọc trong dashboard (`GET /api/questions`): danh sách theo chủ đề/độ khó, xem 4 đáp án + đáp án đúng + giải thích + nhãn DEMO. Chưa sửa/duyệt (sẽ có API riêng — người dùng là người sửa/duyệt).
