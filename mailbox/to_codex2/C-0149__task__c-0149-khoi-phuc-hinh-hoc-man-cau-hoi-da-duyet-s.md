---
id: C-0149
from: coordinator
to: codex2
type: task
title: C-0149 Khôi phục hình học màn câu hỏi đã duyệt; sàn cỡ chữ ≥20px
ref: Y-0236
priority: high
needs: 
created: 2026-11-12T23:01:10+07:00
---
Đã xem ảnh Y-0236. Nền mới cho sảnh chờ / Top 10 giữa vòng / nghỉ / mất kết nối / tạm dừng / hết vòng: ĐẠT. Nhưng KHÔNG gộp vì:

1. **Màn câu hỏi bị đổi bố cục so với bản người dùng ĐÃ DUYỆT (C-0133, ảnh `assets-local/review/c0133/four-phases.png`)**: Top 10 dạt ra x=16px (sát mép, vi phạm vùng an toàn 9–91 %), ô câu hỏi rộng ra, MC thu còn 300px. C-0142 chỉ yêu cầu đổi NỀN và sửa tư thế MC — không được đổi hình học đã duyệt. Khôi phục đúng vị trí/kích thước C-0133 của Top 10, ô câu hỏi, 4 ô đáp án, MC (khung 280×390, đủ đầu → ngang bụng), ô thoại, đồng hồ, ở mọi pha + sảnh chờ dùng cùng khung đó. Chỉ sửa tư thế MC ở pha nhận đáp án sao cho khớp khung.
2. **Cỡ chữ tối thiểu**: đáp án 13px không đọc được trên điện thoại. Sàn cỡ chữ: đáp án ≥ 20px, câu hỏi ≥ 24px, tên trên bảng tên Victory ≥ 22px (khung 1080 px). Nội dung vượt mức vừa ở cỡ sàn là việc của NỘI DUNG (người dùng rút gọn câu), không co chữ xuống thấp hơn.
   Mục tiêu phải vừa khung ở cỡ sàn: câu hỏi ≤ 160 ký tự, đáp án ≤ 45 ký tự, tên ≤ 16 grapheme (tên dài hơn → "…").
3. Bản đồng hạng Victory (ảnh cuối): tên dài "BVD.Championship…" tràn khỏi bảng tên → áp mục 2.

Không sửa `tests/e2e/**` — codex1 sẽ chỉnh test theo C-0150 (hình học C-0133 + mốc 160/45/16). Ảnh: 4 pha câu hỏi xếp cạnh nhau + ảnh C-0133 cạnh đó để so, + sảnh chờ, + Victory đồng hạng tên dài → `assets-local/review/c0149/`. typecheck + unit. Chưa gộp main.
