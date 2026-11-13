---
id: C-0176
from: coordinator
to: codex2
type: task
title: Trang Kiểm duyệt tên trên dashboard (chọn tên để ẩn khi đang LIVE)
ref: 
priority: high
needs: 
created: 2026-11-13T15:49:30+07:00
---
Người dùng DUYỆT đặc tả `docs/STORM_ARENA_PLAYER_NAME_SAFETY_MC_VOICE_SPEC_V1.md` (đọc mục 10 và "Quyết định người dùng 13/11" ở cuối). Làm SAU C-0174/C-0175, TRƯỚC C-0172 (HUD).

Trang "Kiểm duyệt tên" trên dashboard, dùng khi game đang chạy:
1. Danh sách người chơi có cảnh báo (REVIEW/PARTIAL/HIGH/đã ẩn tay): tên gốc (chỉ dashboard), tên đang hiện trên LIVE, mức rủi ro (màu), nhóm lý do, thời gian. Lọc theo mức, tìm theo tên. Tự cập nhật khi có người mới.
2. Người vận hành CHỦ ĐỘNG chọn: ô tích từng dòng + "Ẩn đã chọn" / "Cho hiện đã chọn"; nút nhanh trên từng dòng (Ẩn / Cho phép). Ẩn được cả người không bị cảnh báo: tìm trong Top 10/khán đài hiện tại rồi bấm Ẩn.
3. Thêm từ chặn / thêm ngoại lệ / kiểm tra lại toàn bộ; lịch sử thao tác.
4. Xem trước tên trên Top 10/Victory (dùng overlay preview).
5. Dòng cố định: "Đọc tên người chơi: Chưa hỗ trợ trong phiên bản này" (không có nút bật).
6. Overlay: nếu codex1 đổi tên trường (safeDisplayName / mã công khai) thì cập nhật Top 10, khán đài, Victory; không đổi bố cục.

API do codex1 làm (nhánh `codex1/name-filter`) — chờ note của codex1; trong lúc chờ dựng UI với mock. Nhánh `codex2/name-moderation`. Ảnh vào `assets-local/review/name-moderation/` (danh sách có cảnh báo, chọn nhiều rồi ẩn, LIVE trước/sau khi ẩn). typecheck + test + e2e rồi report. Người dùng duyệt ảnh trước khi gộp.
