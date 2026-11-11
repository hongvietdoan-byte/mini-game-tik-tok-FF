# Tiến độ dự án — Storm Arena LIVE Quiz

Cập nhật: **11/11/2026 21:35** · Coordinator (Claude) cập nhật file này mỗi lần gộp việc / đổi kế hoạch.
Ký hiệu: ✅ xong (đã gộp main, test xanh) · 🔄 đang làm · ⏳ chờ · ⛔ bị chặn (ghi lý do) · ETA = giờ dự kiến xong, **là ước lượng**, không phải cam kết.

Mốc sự kiện (từ đặc tả): tổng duyệt 12/11, thi đấu 13–14/11.

## Tổng quan mốc

| # | Mốc | Trạng thái | ETA | Điều kiện / chặn |
|---|---|---|---|---|
| M0 | Phase 0/1: engine, chấm điểm, server, khôi phục sau sự cố, 117 test | ✅ 11/11 12:20 | — | — |
| M1 | V3 GĐ B: BXH sau mỗi câu, PREPARE chỉ hiện câu hỏi, Top 10 gọn, MC Kelly (trạng thái + lời thoại), `seq` | ✅ 11/11 12:15 | — | — |
| M2 | Kết nối ổn định phía server: chống trùng comment bền vững, trạng thái nguồn, ACK overlay, API kiểm tra hệ thống 9 bước | ✅ 11/11 12:40 (`2999f2a`, 120 test) | — | — |
| M3 | Dashboard điều khiển LIVE + overlay/dashboard theo hợp đồng V3 (C-0007, C-0016) | ✅ 11/11 12:50 | — | — |
| M4 | Trang Kiểm tra kết nối 9 bước + Connection Manager + hướng dẫn OBS (C-0018) | ✅ 11/11 14:10 | — | — |
| M5 | 36 câu Free Fire (chờ người dùng duyệt `docs/review/DE_XUAT_CAU_HOI_FF.md`) + privacy-check + CI Windows (C-0005) | ✅ 11/11 14:10 (CI ✅); duyệt câu: **người dùng** | — | — |
| M6 | Bộ cài Windows (Electron 42 + NSIS): một cổng, app, bộ cài, dashboard tự lấy token (C-0019) | ✅ 11/11 14:10 — còn thử trên máy không có Node | — | máy sạch: **người dùng** |
| M7 | Setup Wizard lần đầu 8 bước, cho bỏ qua TikTok (C-0021) + phiên TikTok + duyệt câu (C-0024) | ✅ 11/11 17:30 | — | — |
| M8 | Bố cục V3 theo ảnh mẫu `ref/storm-arena-ref.png`: nền bão, sân vận động, khán đài bậc, HUD neon (C-0060/63/65) | 🔄 gần đạt — đã gộp vòng 2; logo to như mẫu (C-0073 codex2) | 12/11 sáng | chibi quay lưng: cần asset người dùng |
| M9 | Overlay V3: header, Top 10 trái, câu hỏi + đồng hồ + 4 đáp án, MC Kelly (ảnh thật tách nền), 7×5 khán giả dùng **66 chibi thật** (mỗi người 1 nhân vật) | ✅ 11/11 15:50 — chạy vòng thật 100 người | — | chibi đang nhìn thẳng (mẫu là quay lưng) — cần bộ chibi quay lưng nếu muốn y mẫu |
| M10 | 35 ghế khán giả: lõi + server + overlay; đếm đáp án realtime (C-0064); tải 2.000 người p99 ~9 ms, soak 60' không rò bộ nhớ | ✅ 11/11 20:45 | — | — |
| M11 | Kết nối TikTok LIVE | 🔄 **dùng tạm thư viện cộng đồng `tiktok-live-connector` (người dùng chốt 11/11)** — adapter + server + test ✅ (`4b79ba4`); thư viện chạy được từ máy này; giao diện tạo phiên TikTok + duyệt câu (C-0024 codex2) | thử LIVE thật: ngay khi người dùng phát LIVE | **người dùng phát LIVE để thử bình luận thật**; song song vẫn hỏi kênh chính thức |
| M12 | Popup vinh danh Top 3 theo `ref/victory-ref-2.webp`: chibi toàn thân ĐỨNG TRÊN bục, bảng tên lục giác dưới chân | 🔄 làm lại (C-0055/C-0068 codex2) — người dùng chê bản cũ | 12/11 sáng | — |
| M13 | Tổng duyệt kỹ thuật bằng Mock: bộ cài + OBS + trọn trận + lưu kết quả + đóng an toàn | 🔄 e2e trọn vòng 10 câu với server thật ✅ (C-0062); còn thử OBS/LIVE Studio thật | 12/11 | người dùng thử OBS/LIVE Studio |
| M14 | Sẵn sàng LIVE thật (V3.1 mục G) | ⛔ | phụ thuộc M11 | — |
| M15 | MC Kelly PNG Sequence (idle/talking/excited/victory) | ⏳ trình phát sẵn, chưa có frame (dùng ảnh tĩnh) | khi có frame | frame từ người dùng |
| M16 | Giọng MC Kelly (MCVoiceSystem, ClipAI) — spec `docs/specs/MC_VOICE_SPEC.md` | 🔄 bước 0 khảo sát + đề xuất (C-0070/C-0075 codex1) → người dùng duyệt → code (mock) → coordinator chạy thật | 12/11 | duyệt đề xuất; token ClipAI do người dùng nhập |
| M17 | Mô phỏng UI TikTok LIVE + safe zone theo 3 ảnh iPhone thật (C-0056/58/66) | ✅ 11/11 21:20 — bố cục phát = bố cục xem thử; e2e safe-zone mọi scene (C-0067 codex1) 🔄 | — | — |

## Việc theo làn (chi tiết: `mailbox/BOARD.md`)

| Làn | Đang làm | Hàng chờ |
|---|---|---|
| coordinator | rà/gộp; chờ buổi LIVE thử (M11) | chạy thật ClipAI khi được duyệt |
| codex1 | C-0067 e2e safe-zone | C-0070/75 đề xuất giọng MC |
| codex2 | C-0068 Victory theo ref | C-0073 logo to như mẫu |

## Nhật ký
- 11/11 21:35 — Main: 227 test + 33 e2e xanh. Gộp HUD LIVE mô phỏng + safe zone, arena vòng 2, đếm đáp án realtime, e2e trọn vòng. Đang: Victory làm lại, logo to, đề xuất giọng MC ClipAI.
- 11/11 15:55 — Overlay V3 theo ảnh mẫu + popup Top 3 + khán giả chibi thật (asset tách nền ở assets-local/, ngoài git); 170 test, e2e 17/17.
- 11/11 15:10 — M10 server xong: 35 ghế, gán nhân vật, xoay ghế giữ Top 3, khôi phục sau restart, overlay không lộ ID (167 test); gộp C-0020B phát lại bình luận.
- 11/11 14:35 — Người dùng chốt dùng tạm connector GitHub: TikTokLiveAdapter + phiên TIKTOK + API duyệt câu hỏi (146→158 test); thư viện chạy được qua mạng máy này; gộp C-0020 audience-engine.
- 11/11 14:20 — Người dùng chọn hỏi kênh chính thức TikTok: thư nháp VI/EN ở `docs/TIKTOK_OFFICIAL_REQUEST.md`. Gộp 8 nhánh (C-0005, C-0018, C-0019, C-0008, DP1–DP4): 138/138 test, privacy-check PASS. Giao C-0020/C-0020B, C-0021.
- 11/11 12:55 — M6: app Electron + bộ cài NSIS 112 MB chạy được (server trong app, dữ liệu %APPDATA%, thoát an toàn, log); gộp C-0016.
- 11/11 13:05 — M6 bước 1: server phục vụ dashboard + overlay cùng một cổng (OBS dùng `http://127.0.0.1:8787/overlay/`); 126/126 test.
- 11/11 12:55 — Gộp C-0013: 36 câu Free Fire (chế độ 6, bản đồ 7, vật phẩm 8, thuật ngữ 8, tổng quan 7), bảng duyệt ở docs/review/.
- 11/11 12:45 — Gộp C-0007 dashboard (124 test); giao C-0018 (M4).
- 11/11 12:40 — M2 xong: chống trùng comment bền qua khởi động lại, Connection Manager API, kiểm tra hệ thống 9 bước, ACK overlay.
- 11/11 12:25 — Khảo sát connector xong: không có API chính thức → M11 ⛔ chờ quyết định.
- 11/11 12:15 — Gộp V3 GĐ B (`5d6307d`); 117/117 test.
- 11/11 12:05 — Gộp C-0004 (14 test Store).
- 11/11 11:55 — Gộp C-0003 (36 test máy trạng thái).
- 11/11 11:45 — Gộp C-0006 overlay, C-0010 sửa câu demo.
- 11/11 11:40 — Gộp C-0001 fixtures, C-0002 test lõi + sửa lỗi emoji.
- 11/11 11:05 — Server Phase 1 + test tích hợp/tải.
