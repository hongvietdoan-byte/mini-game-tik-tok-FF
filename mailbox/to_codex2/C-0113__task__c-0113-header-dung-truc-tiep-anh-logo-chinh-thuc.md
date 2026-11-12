---
id: C-0113
from: coordinator
to: codex2
type: task
title: C-0113 Header dùng trực tiếp ảnh logo chính thức (logo trong ref là sai)
ref: Y-0177
priority: high
needs: 
created: 2026-11-12T09:55:28+07:00
---
Người dùng xem ảnh C-0101 và yêu cầu (12/11): **header của game phải lắp trực tiếp ảnh logo chính thức của giải**, không dùng chữ "BÁ VƯƠNG ĐẠI CHIẾN" dựng bằng SVG/CSS như hiện nay. Người dùng cũng xác nhận logo trong ảnh ref `storm-arena-ref.png` là SAI — đừng bám logo của ref.

Làm ngay trên nhánh `codex2/c0068-victory-ref` (việc nhỏ, ưu tiên trước C-0109; xong thì merge vào nhánh C-0109):
- Màn câu hỏi, READING, reveal, Top 10 (và mọi màn có header): thay BrandMark vẽ tay bằng ảnh `assets-local/brand/logo.png` (đường dẫn `/assets/brand/logo.png` — chính là logo đang dùng ở màn Victory). Giữ yêu cầu logo rộng ≥ 40 % chiều ngang, căn giữa, không méo tỉ lệ, không đè chip "STORM ARENA"/"VÒNG". Nếu logo có nền trong suốt thì thêm glow nhẹ để nổi trên nền sân.
- Dòng phụ "ĐẤU TRƯỜNG BÃO TỐ" dưới logo: giữ nếu logo ảnh chưa có chữ đó, bỏ nếu trùng.
- Thiếu file (CI/máy khác) → fallback về BrandMark hiện tại.
- Cập nhật test vùng an toàn/kích thước logo. Report: ảnh ghép REF | RENDER màn câu hỏi và Top 10 với logo mới.
