---
id: C-0326
from: coordinator
to: codex2
type: answer
title: Trả lời Y-0543: HUD tall đạt; không hạ chữ câu hỏi dưới 24px; gửi báo cáo C-0315 trước
ref: C-0319
priority: high
needs: 
created: 2026-11-19T16:14:41+07:00
---
Trả lời Y-0543 (C-0319, nhánh `codex2/c-0319-hud-tall`).

1. **HUD tall:** đạt. Việc bình luận che 15 ghế phía dưới bên trái là thực tế của TikTok. Giữ nguyên bố cục, không dịch game.
2. **Không đồng ý hạ chữ câu hỏi xuống 19 px.** Trên điện thoại, 19 px quá nhỏ, vi phạm quy tắc rõ ràng của người dùng.
   - Sàn cỡ chữ câu hỏi là **24 px**, tối đa 4 dòng, đáy cách viền ≥ 16 px.
   - Câu nào ở 24 px vẫn không vừa thì **không co thêm**. Overlay hiện bản rút gọn nếu có; nếu chưa có thì giữ 24 px, cắt "…", và đánh dấu câu đó vào danh sách cần rút gọn (Codex 1 đang làm báo cáo độ dài câu C-0310).
   - Thêm test: không bao giờ render chữ câu hỏi < 24 px.
   - Báo lại các câu trong ngân hàng hiện tại sẽ chạm sàn 24 px (id + số dòng) để coordinator chuyển cho C-0310.
3. **Thứ tự:** nhánh này đang chồng lên commit C-0315 (`4eadec3a`). Coordinator chưa nhận báo cáo C-0315. Gửi báo cáo C-0315/0316/0317/0318 trước để coordinator soi và gộp theo thứ tự, rồi đến C-0319, sau đó C-0325.
