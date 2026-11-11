---
id: C-0024
from: coordinator
to: codex2
type: task
title: Giao diện phiên TikTok (connector cộng đồng) + màn Duyệt câu hỏi — làm sau C-0021
ref: 
priority: high
needs: 
created: 2026-11-11T14:32:50+07:00
---
# Người dùng chốt dùng tạm connector cộng đồng — C-0024: giao diện phiên TikTok + màn duyệt câu hỏi (làm sau C-0021)

Quyết định (BOARD #17, cập nhật): dùng tạm `tiktok-live-connector` (KHÔNG CHÍNH THỨC) trong lúc chờ kênh chính thức. Server đã có (main `4b79ba4`):
- `SessionConfig.tiktokUsername` (bắt buộc khi `mode: 'TIKTOK'`; nhận `@user`, `user` hoặc URL). TIKTOK **không** cho `allowDemoQuestions`, `speedMultiplier` phải 1.
- `AdminSnapshot.live.detail` có lời nhắn lỗi tiếng Việt (vd "@x hiện chưa phát LIVE — bắt đầu LIVE rồi bấm Kết nối lại").
- `POST /api/questions/:id/approve` body `{ decision: 'APPROVE' | 'REJECT', reason?, operatorId? }` → `{ ok, question }`. Duyệt → `APPROVED` + `OPERATOR_VERIFIED` (được vào LIVE). Phiên TIKTOK chỉ dùng câu đã duyệt.
- Khoá Euler (nếu có) đặt qua biến môi trường `EULER_API_KEY`, **không** đưa vào UI.

Phạm vi: `apps/dashboard/**`.
1. **Tạo phiên**: chọn chế độ Mock / TikTok LIVE. TikTok: ô username (bắt buộc), ẩn DEMO + tốc độ; khung cảnh báo vàng cố định:
   "Kết nối TikTok dùng thư viện cộng đồng, KHÔNG CHÍNH THỨC — có thể ngừng hoạt động bất kỳ lúc nào. Chỉ đọc bình luận, không đăng nhập, không gửi tin."
   Nếu số câu đã duyệt < số câu/vòng → chặn nút tạo, dẫn sang màn Duyệt câu hỏi.
2. **Connection Manager**: với TIKTOK hiện `@username`, `live.detail`, nút Kết nối / Ngắt / Kết nối lại (đã có). Trạng thái "Chưa LIVE" rõ ràng.
3. **Setup Wizard bước 4** (C-0021): bật ô username (lưu tạm để điền sẵn khi tạo phiên TikTok), vẫn có "Bỏ qua — chạy offline". Không tạo phiên trong wizard.
4. **Màn Duyệt câu hỏi** (thay DP5): danh sách `GET /api/questions` lọc theo trạng thái (Chờ duyệt = DEMO/PENDING, Đã duyệt, Từ chối), chủ đề, độ khó;
   mỗi câu: câu hỏi, 4 đáp án, đáp án đúng, giải thích, nhãn DEMO; nút **Duyệt** / **Từ chối** (từ chối hỏi lý do). Đếm "đã duyệt X / cần Y cho một vòng".
   Có "Duyệt tất cả câu đang lọc" nhưng phải có hộp xác nhận nêu số câu. Không bao giờ tự duyệt. Chưa có sửa nội dung (sẽ có API sau) — ghi chú "Sửa câu: sắp có".
5. Unit test logic (validate username phía client khớp regex server, đếm câu đã duyệt, chặn tạo phiên).
Tiêu chí: build + typecheck + `corepack pnpm test` xanh; smoke với server thật: duyệt 10 câu, tạo phiên TikTok với username bất kỳ đang offline → thấy thông báo "chưa phát LIVE" (không cần LIVE thật); ảnh local; nhánh `codex2/c0024-tiktok-ui`.
