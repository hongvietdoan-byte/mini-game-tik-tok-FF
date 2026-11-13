---
id: C-0200
from: coordinator
to: codex1
type: task
title: Người dùng duyệt 2 luật lọc tên + mở rộng bộ luật tiếng Việt theo nhóm
ref: X-0322
priority: high
needs: 
created: 2026-11-14T00:49:07+07:00
---
Người dùng DUYỆT thêm hai luật `insult.vi.cho-dien` và `insult.vi.bo-dai` (PARTIAL, che riêng cụm vi phạm). Người dùng nói thêm: còn rất nhiều cụm tương tự, họ không thể tự liệt kê hết → cần bạn chủ động mở rộng bộ luật mặc định.

Làm trên nền `codex1/integration-name-safety`, nhánh riêng, sau C-0199 và trước C-0198. Chưa gộp — coordinator rà rồi trình người dùng.

1. Thêm hai luật đã duyệt kèm test (risk, rule ID, che đúng cụm, phần còn lại giữ nguyên, chuỗi dạng HTML vẫn được escape).
2. Mở rộng bộ luật tiếng Việt mặc định theo NHÓM, không chỉ từng từ lẻ: chửi tục/xúc phạm, tình dục/khiêu dâm, miệt thị (vùng miền, giới, khuyết tật…), cờ bạc/lừa đảo/quảng cáo (link, số điện thoại, "kèo", "nạp"…), chính trị nhạy cảm, và từ tục tiếng Anh phổ biến. Mỗi nhóm ghi mức mặc định (PARTIAL/REVIEW/HIGH) theo đặc tả.
3. Bộ chuẩn hóa trước khi so khớp phải bắt được biến thể: không dấu, viết hoa/thường, teencode và thay ký tự (`đ`→`d`/`dz`, `c`→`k`, `ph`→`f`, số thay chữ như `0`→`o`, `3`→`e`, `1`→`i`), chèn dấu chấm/gạch/khoảng trắng giữa các chữ, lặp ký tự, ký tự trông giống nhau (homoglyph) và chữ full-width. Vẫn khớp theo từ/cụm, tránh so chuỗi con ngây thơ.
4. Bộ kiểm DƯƠNG TÍNH GIẢ bắt buộc: ít nhất 200 tên sạch (tên người Việt thật thường gặp, tên game thủ, tên có âm trùng một phần với từ cấm như "Cường", "Đức", "Lộc", "Bích", "Dũng", "Cúc"…) phải ra `NONE`. Báo tỷ lệ bắt đúng và tỷ lệ báo nhầm.
5. Benchmark: thời gian lọc mỗi tên với bộ luật mới, đảm bảo không ảnh hưởng luồng nhận comment.
6. Report: số luật theo từng nhóm, mức mặc định từng nhóm, 10 ví dụ che trước/sau, kết quả bộ dương tính giả, benchmark. Vì hòm thư và repo công khai, trong THƯ chỉ mô tả theo nhóm và số lượng, không chép nguyên danh sách từ tục; danh sách nằm trong file luật.
