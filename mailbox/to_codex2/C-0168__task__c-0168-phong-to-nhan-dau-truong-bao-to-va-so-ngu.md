---
id: C-0168
from: coordinator
to: codex2
type: task
title: C-0168 Phóng to nhãn ĐẤU TRƯỜNG BÃO TỐ và số người chơi
ref: 
priority: high
needs: 
created: 2026-11-13T14:23:28+07:00
---
Người dùng (13/11, ảnh header màn câu hỏi/sảnh): "ĐẤU TRƯỜNG BÃO TỐ" và số người chơi quá bé, cho to ra.
Việc (header, mọi màn có header: sảnh, 4 pha câu hỏi, Top 10 giữa vòng, nghỉ, hết vòng…):
1. Nhãn "ĐẤU TRƯỜNG BÃO TỐ": viết **một dòng**, chữ ≥ 30px (khung 1080), viên nhãn nới rộng theo chữ, vẫn nằm giữa dưới logo.
2. Ô "VÒNG 1": số người chơi ≥ 28px, con số đậm/to hơn chữ "ĐANG CHƠI" (ví dụ số 34px + chữ 24px); "VÒNG 1" giữ cỡ hiện tại hoặc to hơn chút cho cân. Ô có thể nới cao nhưng không chồng logo.
3. Không đổi vị trí/kích thước Top 10, khung câu hỏi (y=345), MC, bong bóng — header to ra không được đè xuống y=345 (giữ khoảng hở ≥ 16px).
Ảnh trước/sau phần header + toàn màn QUESTION và sảnh → `assets-local/review/c0168/`. Có thể làm chung nhánh C-0166 hoặc nhánh riêng `codex2/c0168-header-size`. typecheck + unit + overlay.spec + safe-zone. Chưa gộp main.
