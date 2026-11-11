---
id: C-0083
from: coordinator
to: cloud
type: task
title: C-0083 Rà toàn bộ quy trình theo plan: lệch hướng, sai, thiếu sót
ref: 
priority: high
needs: 
created: 2026-11-11T22:55:03+07:00
---
Người dùng (23:20) yêu cầu phiên cloud RÀ LẠI TOÀN BỘ QUY TRÌNH LÀM VIỆC THEO PLAN: lệch hướng, sai và thiếu sót ở đâu. Chỉ đọc + viết báo cáo, KHÔNG sửa code/asset của làn khác.

## Phạm vi đọc
- Plan/mốc: `docs/TIEN_DO.md`, `mailbox/BOARD.md` (phân làn + quyết định chốt), `docs/HANDOFF.md`, các tài liệu spec trong `docs/` (game rules, V3, privacy, test plan, MC voice plan, HUONG_DAN_LIVE).
- Thực tế đã làm: toàn bộ thư `mailbox/to_codex1`, `to_codex2`, `to_coordinator` (task ↔ ack ↔ report), `git log` trên main, code hiện có (`apps/`, `packages/`, `tests/`, `tools/`, `.github/workflows/ci.yml`).

## Câu hỏi phải trả lời (mỗi mục nêu bằng chứng: id thư / commit / đường dẫn file)
1. **Lệch hướng**: việc nào đã làm không khớp plan hoặc yêu cầu người dùng? Ví dụ đã biết: Victory bị vẽ tay bằng SVG thay vì dùng asset raster theo ref (C-0065/C-0068 → C-0082). Tìm các trường hợp tương tự ở overlay câu hỏi/HUD/Top10/MC, luật chơi, luồng TikTok.
2. **Sai**: quyết định chốt trên BOARD có bị vi phạm không; thư giao việc mâu thuẫn nhau; report nói "xong" nhưng tiêu chí nghiệm thu trong task chưa đạt hoặc không có bằng chứng; task bị bỏ rơi (có task, không có report/không gộp); nhánh đã push nhưng chưa gộp main.
3. **Thiếu sót**: hạng mục trong plan chưa có task nào; khoảng trống kiểm thử (đặc biệt: không có so khớp hình ảnh với ref, e2e không chạy trên CI); rủi ro trước buổi LIVE thật (quyền LIVE, connector không chính thức, duyệt 36 câu Free Fire, asset MC, voice).
4. **Quy trình**: điểm yếu của vòng coordinator ↔ Codex qua hòm thư (thư tả ref bằng chữ, nghiệm thu không ghép ảnh cạnh ref, CI đỏ kéo dài không ai xử lý, số worktree/nhánh tồn đọng, handoff giữa các phiên) và đề xuất sửa cụ thể.
5. Bảng tổng hợp: Mốc trong plan | Trạng thái thật (xong/dở/chưa bắt đầu/lệch) | Bằng chứng | Việc cần làm tiếp | Ưu tiên P0/P1/P2.

## Đầu ra
- File `docs/review/RA_SOAT_QUY_TRINH.md` trên nhánh cloud (tiếng Việt, kết luận ngắn ở đầu, tối đa ~400 dòng). Không ghi tên miền/ID nội bộ, token, endpoint (hòm thư và repo là public).
- Thư report về coordinator: tóm tắt 10 phát hiện quan trọng nhất + tên nhánh/commit. Việc nào không kiểm chứng được (ví dụ không có `assets-local/` ở cloud nên không render được overlay) thì ghi rõ là CHƯA KIỂM CHỨNG, không suy đoán.
