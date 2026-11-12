---
id: C-0093
from: coordinator
to: cloud
type: task
title: C-0093 Ma trận khoảng trống theo plan V4 (docs/IMPLEMENTATION_GAP_MATRIX_V4.md)
ref: 
priority: high
needs: 
created: 2026-11-12T00:13:22+07:00
---
Việc mới (người dùng chốt 12/11): lập **ma trận khoảng trống theo plan V4** — Lượt A của V4. Nguồn: `docs/STORM_ARENA_MASTER_DIRECTION_ACTION_PLAN_V4.txt` + quyết định D-19..D-22 trong `docs/DECISIONS.md` (giữ tính điểm Kahoot — KHÔNG coi là khoảng trống; P0 trước; giọng MC tạm dừng sau mốc 2).

Sản phẩm: `docs/IMPLEMENTATION_GAP_MATRIX_V4.md` trên nhánh cloud, mỗi hạng mục V4 (P0/P1/P2, D01–D10, các gate) một dòng:
| Hạng mục V4 | Code hiện có (đường dẫn file:dòng) | Bằng chứng (test/ảnh/report nào) | Trạng thái theo từ vựng V4 (IMPLEMENTED / UNIT_VERIFIED / E2E_VERIFIED / VISUAL_APPROVED / LIVE_VERIFIED / BLOCKED / DEFERRED) | Còn thiếu | Làn đề xuất (codex1/codex2/người dùng) | Ưu tiên | Ước lượng | Phụ thuộc |

Phải kiểm cụ thể bằng cách đọc code, không suy theo tên file: chọn câu SMART_RANDOM 7/5/3 theo độ khó; sảnh JOIN trước vòng; xoay ghế khi > 35 người; thời gian trả lời 15 s; đủ các pha (kể cả READING mới gộp); khoá đáp án đầu tiên; comment trễ; pause/resume/huỷ câu; khôi phục sau restart; Top 10/Victory đồng hạng; preflight; backup; đường chạy `CHAY_GAME.cmd`.

Quy tắc: không được ghi VISUAL_APPROVED hay LIVE_VERIFIED cho bất kỳ mục nào (người dùng chưa duyệt hình, chưa có LIVE thật). Cuối file: danh sách ≤ 10 việc phải xong trước tổng duyệt, xếp theo rủi ro, và các điểm V4 mâu thuẫn với code/quyết định hiện tại cần người dùng chốt. Chỉ đọc + viết tài liệu, không sửa code. Đã giao song song cho codex1 thư C-0092 (preflight, backup, đường chạy, rehearsal) — ghi nhận là "đang làm", đừng trùng.
