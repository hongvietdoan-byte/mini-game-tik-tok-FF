---
id: C-0223
from: coordinator
to: codex2
type: task
title: Loi thoai MC xuong dong hop ly + chot sanh cho
ref: C-0222
priority: high
needs: 
created: 2026-11-14T22:41:50+07:00
---
Tiếp trên nhánh `codex2/c0214-user-mockup` (d341b70). Người dùng ĐÃ DUYỆT: Top 10 giữa vòng (C-0222) và CHỐT màn sảnh chờ giữ bố cục hiện tại (Kelly to, bong bóng, khán đài như ảnh lobby C-0214) — KHÔNG dời gì ở sảnh chờ.

## Việc: lời thoại MC phải xuống dòng hợp lý (mọi màn có bong bóng MC)
Người dùng: "câu thoại phải biết xuống dòng sao cho hợp lý". Ví dụ lỗi ở sảnh chờ: "CHÀO MỪNG ĐẾN VỚI ĐẤU TRƯỜNG BÃO / TỐ!" — dòng 2 chỉ còn một chữ, lại tách đôi từ "BÃO TỐ".

Yêu cầu, áp dụng cho bong bóng MC ở MỌI màn (sảnh chờ, câu hỏi, nhanh nhất, đáp án, Top 10 giữa vòng, Victory… nếu có):
1. Các dòng cân đối độ dài (ví dụ `text-wrap: balance` hoặc tự tính), không để dòng cuối chỉ 1 chữ / 1 âm tiết.
2. Không tách cụm từ ghép tiếng Việt và cụm cố định: "Đấu Trường", "Bão Tố", "Đấu Trường Bão Tố" (nếu vừa), "Top 10", "Free Fire", "MC Kelly", số + đơn vị ("1,2 giây", "20 giây"), tên người chơi, "A, B, C hoặc D". Làm bằng danh sách cụm giữ liền (nbsp / white-space: nowrap theo cụm) dùng chung một hàm, có test.
3. Ưu tiên ngắt sau dấu câu (`!`, `,`, `.`, `?`) khi có.
4. Chữ không tràn khung, không bị cắt; nếu câu quá dài thì giảm cỡ chữ theo bậc như hiện có, không dời khung.
5. Câu sảnh chờ mong muốn hiện: "CHÀO MỪNG ĐẾN VỚI / ĐẤU TRƯỜNG BÃO TỐ!" (2 dòng).

## Nộp
- Ảnh 1080×1920 ở `.claude/review/C0223/`: lobby, question, fastest, top10-mid-round, và các màn khác có bong bóng; thêm 1 ảnh lưới thử các câu thoại dài/ngắn trong bong bóng (đủ mọi câu thoại hiện có của MC) để thấy cách ngắt dòng.
- Test đơn vị cho hàm ngắt dòng. typecheck, test, e2e. Không gộp main.
