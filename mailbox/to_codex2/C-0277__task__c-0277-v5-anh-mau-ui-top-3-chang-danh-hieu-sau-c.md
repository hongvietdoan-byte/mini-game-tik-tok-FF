---
id: C-0277
from: coordinator
to: codex2
type: task
title: C-0277 V5: ảnh mẫu UI Top 3/chặng/danh hiệu (sau C-0271, chưa code)
ref: 
priority: normal
needs: 
created: 2026-11-18T00:21:02+07:00
---
V5 (đã được chủ dự án duyệt) — CHỈ ẢNH MẪU, CHƯA CODE vào overlay chính. Làm sau C-0271.

Đọc `docs/V5_AUDIT_PLAN.md` mục 6 và `docs/specs/NHA_THONG_THAI_V5_SPEC.txt` §3, §5.

Dựng ảnh mẫu 1080×1920 (bố cục 14/11 cố định, không dời/đổi kích thước khung, Victory giữ nguyên sân khấu và cúp) cho:
1. REVEAL: Top 3 trả lời đúng nhanh nhất câu N trong ô callout nhanh nhất hiện có (1, 2, 3 người; đồng hạng "+X người đồng hạng"; 0 người "Chưa có người trả lời đúng"; tên 24 ký tự; thời gian giây 2 số lẻ).
2. INTERIM_TOP10 sau câu 5/10: "BXH CHẶNG X – CÂU A–B – KHÔNG PHẢI BXH TOÀN TRẬN" Top 3 + 1 danh hiệu phụ (vd "TOP 3 CHUỖI ĐÚNG DÀI NHẤT – TOÀN TRẬN").
3. Sau câu 15: chặng 3 gọn trước Victory.
4. Sảnh: xoay Top 3/5 danh hiệu trận trước cạnh đếm ngược.
Nhãn CÂU / CHẶNG / TOÀN TRẬN phải phân biệt rõ. Không ticker xác nhận từng comment.

Gửi đường dẫn các ảnh (ignore, không commit) để coordinator chuyển chủ dự án duyệt. Không sửa contracts/quiz-core.
