# Tiến độ dự án — Storm Arena LIVE Quiz

Cập nhật: **11/11/2026 12:45** · Coordinator (Claude) cập nhật file này mỗi lần gộp việc / đổi kế hoạch.
Ký hiệu: ✅ xong (đã gộp main, test xanh) · 🔄 đang làm · ⏳ chờ · ⛔ bị chặn (ghi lý do) · ETA = giờ dự kiến xong, **là ước lượng**, không phải cam kết.

Mốc sự kiện (từ đặc tả): tổng duyệt 12/11, thi đấu 13–14/11.

## Tổng quan mốc

| # | Mốc | Trạng thái | ETA | Điều kiện / chặn |
|---|---|---|---|---|
| M0 | Phase 0/1: engine, chấm điểm, server, khôi phục sau sự cố, 117 test | ✅ 11/11 12:20 | — | — |
| M1 | V3 GĐ B: BXH sau mỗi câu, PREPARE chỉ hiện câu hỏi, Top 10 gọn, MC Kelly (trạng thái + lời thoại), `seq` | ✅ 11/11 12:15 | — | — |
| M2 | Kết nối ổn định phía server: chống trùng comment bền vững, trạng thái nguồn, ACK overlay, API kiểm tra hệ thống 9 bước | ✅ 11/11 12:40 (`2999f2a`, 120 test) | — | — |
| M3 | Dashboard điều khiển LIVE (C-0007 ✅ 12:45) + overlay/dashboard theo hợp đồng mới (C-0016 🔄) | 🔄 codex2 | 11/11 14:00 | — |
| M4 | Trang Connection Test + Connection Manager + hướng dẫn OBS (C-0018, đã giao) | ⏳ codex2 | 11/11 17:00 | M2 ✅ |
| M5 | Bộ câu DEMO Free Fire + bảng đề xuất để người dùng duyệt (C-0013); privacy-check + CI (C-0005) | 🔄 codex1 | 11/11 14:00 | duyệt câu: **người dùng** |
| M6 | Bộ cài Windows (Electron + NSIS), mở dashboard không cần terminal, overlay URL một cổng | ⏳ coordinator + codex1 | 12/11 10:00 | thử trên máy không có Node |
| M7 | Setup Wizard lần đầu (8 bước, cho bỏ qua TikTok) | ⏳ codex2 | 12/11 12:00 | cần M4, M6 |
| M8 | Wireframe 1080×1920 bố cục V3 + HUD giả lập → người dùng duyệt | ⛔ | 12/11 sáng (sau khi có ảnh) | **thiếu ảnh mẫu `a_highly_detailed_neon_esports_quiz_livestream_pos.png` + Visual Guide** |
| M9 | Overlay bố cục V3: Top 10 trái, MC Kelly tĩnh, 7×5 khán giả (ảnh tĩnh, không animation) | ⏳ codex2 | 12/11 18:00 | cần M8 duyệt + chibi/Kelly nền trong suốt |
| M10 | Audience engine: 35 ghế, gán nhân vật lưu DB, hàng chờ, xoay ghế; test 500 người / 35 ghế, reload giữ ghế | ⏳ coordinator + codex1 | 12/11 15:00 | — |
| M11 | Kết nối TikTok LIVE thật | ⛔ | +1 ngày sau khi được duyệt (spike 3–4 h + 1 buổi LIVE thử) | **không có API chính thức; mọi repo cộng đồng dùng sign server → cần người dùng/pháp lý quyết** (`docs/TIKTOK_CONNECTOR_SPIKE.md`) |
| M12 | Victory giữ cúp gốc + 3 chibi đứng sàn | ⛔ | +0.5 ngày sau khi có asset | cần cúp/sân khấu tách nền |
| M13 | Tổng duyệt: chạy trọn trận qua bộ cài + OBS (Mock), lưu kết quả, đóng an toàn | ⏳ | 12/11 chiều | cần M3, M4, M6 |
| M14 | Sẵn sàng LIVE thật (V3.1 mục G) | ⛔ | phụ thuộc M11 | — |

## Việc theo làn (chi tiết: `mailbox/BOARD.md`)

| Làn | Đang làm | Hàng chờ |
|---|---|---|
| coordinator | M6 bộ cài Electron | M10 → rà/gộp mọi nhánh |
| codex1 | C-0013 câu hỏi Free Fire | C-0005 privacy-check + CI → test audience (M10) → script build bộ cài (M6) |
| codex2 | C-0016 hợp đồng V3 | C-0018 (M4) → M7 → M9 |

## Nhật ký
- 11/11 12:45 — Gộp C-0007 dashboard (124 test); giao C-0018 (M4).
- 11/11 12:40 — M2 xong: chống trùng comment bền qua khởi động lại, Connection Manager API, kiểm tra hệ thống 9 bước, ACK overlay.
- 11/11 12:25 — Khảo sát connector xong: không có API chính thức → M11 ⛔ chờ quyết định.
- 11/11 12:15 — Gộp V3 GĐ B (`5d6307d`); 117/117 test.
- 11/11 12:05 — Gộp C-0004 (14 test Store).
- 11/11 11:55 — Gộp C-0003 (36 test máy trạng thái).
- 11/11 11:45 — Gộp C-0006 overlay, C-0010 sửa câu demo.
- 11/11 11:40 — Gộp C-0001 fixtures, C-0002 test lõi + sửa lỗi emoji.
- 11/11 11:05 — Server Phase 1 + test tích hợp/tải.
