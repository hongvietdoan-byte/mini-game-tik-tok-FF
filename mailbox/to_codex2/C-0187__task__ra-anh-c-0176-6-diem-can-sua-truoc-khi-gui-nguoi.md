---
id: C-0187
from: coordinator
to: codex2
type: task
title: Rà ảnh C-0176 — 6 điểm cần sửa trước khi gửi người dùng duyệt
ref: C-0176
priority: high
needs: 
created: 2026-11-13T17:48:48+07:00
---
Rà ảnh C-0176 (`flagged-list.png`, `live-after-hide.png`) — chưa đạt để gửi người dùng duyệt. Sửa chung trong lượt C-0183 (cùng nhánh `codex2/name-moderation`), chụp lại ảnh:

1. **Tên bình thường bị hiện alias.** 4 dòng "Bình thường" (risk NONE) có cột "Tên trên LIVE" = `Người chơi 05…08` + "Đã che theo rule". Sai đặc tả: NONE phải hiện đúng tên (sau giới hạn độ dài), không có dòng "đã che". Kiểm cả dữ liệu mock lẫn logic hiển thị; chỉ ghi "đã che" khi `displayAction` ≠ tên an toàn gốc.
2. **Số đếm lệch.** Thẻ "Đang ẩn trên LIVE" = 1 trong khi bảng có 7 alias; sau khi ẩn 2 tên thì nhảy 1 → 4 và có 3 dòng mới "Đã ẩn tay". Thông báo nói "Đã ẩn 2 tên". Làm cho số đếm, thông báo và bảng khớp nhau; định nghĩa rõ: "đang ẩn" = HIGH + REVIEW chưa cho phép + ẩn tay.
3. **Khung "Xem tên trên LIVE".** Trước khi ẩn: hiện bố cục overlay CŨ (không phải màn hiện tại trên main) với tên fixture `<script>…`, `<img src…`. Sau khi ẩn: khung trống đen. Phải dùng overlay hiện tại ở chế độ preview, cập nhật ngay sau thao tác và không bao giờ trống; nếu chưa nhúng được overlay thật thì thay bằng danh sách Top 10 + Top 3 dạng chữ đơn giản dùng `safeDisplayName`, đừng nhúng bản cũ.
4. **Chữ trên trang dùng tiếng Việt** (người vận hành đọc tiếng Việt): "Cho phép REVIEW" → "Cho phép hiện", "POLICY OPERATOR" → "Chính sách", "AUDIT TRAIL" → "Lịch sử", "Overlay preview" → "Xem trước", "rule" → "quy tắc", "alias" → "tên thay thế", "Operator" → "Người vận hành". Nhãn mức: Cần xem / Che một phần / Mức cao / Đã ẩn tay / Bình thường giữ nguyên.
5. Bố cục: khoảng trống lớn dưới khối "Từ chặn và ngoại lệ" — đưa "Lịch sử thao tác" lên cạnh hoặc cho khối xem trước thấp lại.
6. Nhắc lại C-0185: tắt dev server demo cổng 5173 và dọn thư mục tạm khi report.

Report lại kèm ảnh mới: danh sách, trước/sau khi ẩn nhiều tên, khung xem trước Top 10 và Victory.
